const { z } = require("zod");
const UsersRepository = require("../users/users.repository");
const {
  LogisticsApiError,
  getLogisticsClient,
} = require("../../clients/logisticsClient");

const bootstrapPayloadSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    firstNode: z
      .object({
        phoneNumber: z.string().trim().min(1),
        trustScore: z.coerce.number().min(0).default(0),
      })
      .strict(),
    bindUserId: z.string().trim().min(1).optional(),
  })
  .strict();

const contextQuerySchema = z
  .object({
    tenantId: z.string().trim().min(1).optional(),
    nodeId: z.string().trim().min(1).optional(),
  })
  .strict();

const listNodesQuerySchema = z
  .object({
    tenantId: z.string().trim().min(1).optional(),
  })
  .strict();

const createNodePayloadSchema = z
  .object({
    tenantId: z.string().trim().min(1).optional(),
    phoneNumber: z.string().trim().min(1),
    trustScore: z.coerce.number().min(0).default(0),
  })
  .strict();

const storedBindingSchema = z
  .object({
    tenantId: z.string().trim().min(1),
    nodeId: z.string().trim().min(1).optional(),
  })
  .strict();

function createBadRequestError(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function createForbiddenError(message) {
  const err = new Error(message);
  err.status = 403;
  return err;
}

function createNotFoundError(message) {
  const err = new Error(message);
  err.status = 404;
  return err;
}

function createUpstreamContractError(message) {
  const err = new Error(message);
  err.status = 502;
  return err;
}

function createIssue(code, message) {
  return {
    code,
    message,
  };
}

function toActorDTO(actor) {
  return {
    uid: actor.uid,
    email: actor.email || null,
    isAdmin: Boolean(actor.isAdmin),
  };
}

function toBindingDTO(userId, binding) {
  if (!binding) {
    return null;
  }

  return {
    userId,
    tenantId: binding.tenantId,
    nodeId: binding.nodeId || null,
  };
}

function toSafeApiKeyDTO(apiKey) {
  if (!apiKey || typeof apiKey !== "object") {
    return null;
  }

  return {
    last4: apiKey.last4 || null,
    createdAt: apiKey.createdAt ?? null,
  };
}

function normalizeStoredBinding(rawBinding) {
  if (!rawBinding || typeof rawBinding !== "object" || Array.isArray(rawBinding)) {
    return null;
  }

  const parsed = storedBindingSchema.safeParse(rawBinding);
  if (!parsed.success) {
    return null;
  }

  return {
    tenantId: parsed.data.tenantId,
    nodeId: parsed.data.nodeId || null,
  };
}

function buildUserUpsertPayload(existingUser, binding) {
  return {
    email: existingUser.email || null,
    displayName:
      typeof existingUser.displayName === "string" ? existingUser.displayName : null,
    photoURL:
      typeof existingUser.photoURL === "string" ? existingUser.photoURL : null,
    preferences: {
      ...(existingUser.preferences || {}),
      bln: {
        tenantId: binding.tenantId,
        ...(binding.nodeId ? { nodeId: binding.nodeId } : {}),
      },
    },
    roles: Array.isArray(existingUser.roles) ? existingUser.roles : [],
    emailVerified: Boolean(existingUser.emailVerified),
    createdAt: existingUser.createdAt,
    updatedAt: Date.now(),
  };
}

function isNotFoundUpstreamError(error) {
  return error instanceof LogisticsApiError && error.status === 404;
}

function requireActor(authContext) {
  const uid = String(authContext?.uid || "").trim();
  if (!uid) {
    throw createNotFoundError("User not found");
  }

  return {
    uid,
    email: String(authContext?.email || "").trim() || null,
    isAdmin: Boolean(authContext?.isAdmin),
  };
}

function requireResolvedTenantId({ actor, binding, requestedTenantId }) {
  if (actor.isAdmin) {
    const resolvedTenantId =
      String(requestedTenantId || "").trim() || binding?.tenantId || null;

    if (!resolvedTenantId) {
      throw createBadRequestError(
        "tenantId is required when no BLN tenant binding exists"
      );
    }

    return resolvedTenantId;
  }

  if (!binding?.tenantId) {
    throw createForbiddenError("A BLN tenant binding is required");
  }

  if (requestedTenantId && requestedTenantId !== binding.tenantId) {
    throw createForbiddenError(
      "Non-admin callers can only access their bound BLN tenant"
    );
  }

  return binding.tenantId;
}

function requireContextTenantId({ actor, binding, requestedTenantId }) {
  if (actor.isAdmin) {
    return String(requestedTenantId || "").trim() || binding?.tenantId || null;
  }

  if (requestedTenantId && requestedTenantId !== binding?.tenantId) {
    throw createForbiddenError(
      "Non-admin callers can only inspect their bound BLN tenant"
    );
  }

  return binding?.tenantId || null;
}

function resolveContextNodeId({ actor, binding, requestedNodeId, tenantId }) {
  const explicitNodeId = String(requestedNodeId || "").trim() || null;

  if (!actor.isAdmin && explicitNodeId && explicitNodeId !== binding?.nodeId) {
    throw createForbiddenError(
      "Non-admin callers can only inspect their bound BLN node"
    );
  }

  if (!tenantId && explicitNodeId) {
    throw createBadRequestError(
      "tenantId is required when resolving a BLN node without a stored tenant binding"
    );
  }

  return explicitNodeId || binding?.nodeId || null;
}

function createNetworkService(dependencies = {}) {
  function getUsersRepository() {
    return dependencies.usersRepository || UsersRepository;
  }

  function getClient() {
    return dependencies.logisticsClient || getLogisticsClient();
  }

  async function requireExistingUser(userId) {
    const usersRepository = getUsersRepository();
    const user = await usersRepository.getById(userId);
    if (!user) {
      throw createNotFoundError("User not found");
    }

    return user;
  }

  async function persistBindingForUser(userId, binding) {
    const usersRepository = getUsersRepository();
    const existingUser = await requireExistingUser(userId);

    return usersRepository.upsert(
      userId,
      buildUserUpsertPayload(existingUser, binding)
    );
  }

  async function exchangeTenantAccess(actor, tenantId) {
    const client = getClient();

    return client.exchangeTenantAccess({
      tenantId,
      subject: actor.uid,
      ...(actor.email ? { email: actor.email } : {}),
    });
  }

  async function resolveTenantAccess(authContext, options = {}) {
    const actor = requireActor(authContext);
    const currentUser = await requireExistingUser(actor.uid);
    const binding = normalizeStoredBinding(currentUser.preferences?.bln);
    const tenantId = requireResolvedTenantId({
      actor,
      binding,
      requestedTenantId: options.tenantId,
    });
    const exchangeResult = await exchangeTenantAccess(actor, tenantId);

    return {
      actor,
      currentUser,
      binding,
      tenantId,
      tenant: exchangeResult.tenant || null,
      tenantCredential: exchangeResult.accessToken,
    };
  }

  async function bootstrapNetwork(authContext, rawPayload) {
    const actor = requireActor(authContext);
    const parsed = bootstrapPayloadSchema.parse(rawPayload || {});
    const targetUserId = parsed.bindUserId || actor.uid;

    await requireExistingUser(targetUserId);

    const client = getClient();
    const bootstrapResult = await client.bootstrapTenant({
      name: parsed.name,
      firstNode: parsed.firstNode,
    });

    const tenantId = String(bootstrapResult?.tenant?.id || "").trim();
    const nodeId = String(bootstrapResult?.node?.id || "").trim();

    if (!tenantId || !nodeId) {
      throw createUpstreamContractError(
        "logistics-api bootstrap response did not include tenant and node ids"
      );
    }

    await persistBindingForUser(targetUserId, {
      tenantId,
      nodeId,
    });

    return {
      tenant: bootstrapResult.tenant || null,
      node: bootstrapResult.node || null,
      binding: {
        userId: targetUserId,
        tenantId,
        nodeId,
      },
      apiKey: toSafeApiKeyDTO(bootstrapResult.apiKey),
    };
  }

  async function getNetworkContext(authContext, rawQuery) {
    const actor = requireActor(authContext);
    const parsed = contextQuerySchema.parse(rawQuery || {});
    const currentUser = await requireExistingUser(actor.uid);
    const binding = normalizeStoredBinding(currentUser.preferences?.bln);
    const tenantId = requireContextTenantId({
      actor,
      binding,
      requestedTenantId: parsed.tenantId,
    });
    const nodeId = resolveContextNodeId({
      actor,
      binding,
      requestedNodeId: parsed.nodeId,
      tenantId,
    });

    const context = {
      actor: toActorDTO(actor),
      binding: toBindingDTO(currentUser.id, binding),
      effectiveContext: tenantId
        ? {
            tenantId,
            nodeId,
          }
        : null,
      tenant: null,
      node: null,
      issues: [],
    };

    if (!tenantId) {
      context.issues.push(
        createIssue(
          "BLN_CONTEXT_UNBOUND",
          "No BLN tenant binding is configured for the current user"
        )
      );
      return context;
    }

    let exchangeResult;
    try {
      exchangeResult = await exchangeTenantAccess(actor, tenantId);
    } catch (error) {
      if (isNotFoundUpstreamError(error)) {
        context.issues.push(
          createIssue(
            "BLN_TENANT_NOT_FOUND",
            "The resolved BLN tenant no longer exists"
          )
        );
        return context;
      }

      throw error;
    }

    context.tenant = exchangeResult.tenant || null;

    if (!nodeId) {
      return context;
    }

    try {
      const nodeResult = await getClient().getNode({
        id: nodeId,
        tenantCredential: exchangeResult.accessToken,
      });
      context.node = nodeResult.node || null;
    } catch (error) {
      if (isNotFoundUpstreamError(error)) {
        context.issues.push(
          createIssue(
            "BLN_NODE_NOT_FOUND",
            "The resolved BLN node no longer exists for the active tenant"
          )
        );
        return context;
      }

      throw error;
    }

    return context;
  }

  async function listNetworkNodes(authContext, rawQuery) {
    const actor = requireActor(authContext);
    const parsed = listNodesQuerySchema.parse(rawQuery || {});
    const currentUser = await requireExistingUser(actor.uid);
    const binding = normalizeStoredBinding(currentUser.preferences?.bln);
    const tenantId = requireResolvedTenantId({
      actor,
      binding,
      requestedTenantId: parsed.tenantId,
    });

    if (actor.isAdmin) {
      const result = await getClient().listNodes({ tenantId });
      return {
        tenantId,
        items: Array.isArray(result?.items) ? result.items : [],
      };
    }

    const exchangeResult = await exchangeTenantAccess(actor, tenantId);
    const result = await getClient().listNodes({
      tenantCredential: exchangeResult.accessToken,
    });

    return {
      tenantId,
      items: Array.isArray(result?.items) ? result.items : [],
    };
  }

  async function createNetworkNode(authContext, rawPayload) {
    const actor = requireActor(authContext);
    const parsed = createNodePayloadSchema.parse(rawPayload || {});
    const currentUser = await requireExistingUser(actor.uid);
    const binding = normalizeStoredBinding(currentUser.preferences?.bln);
    const tenantId = requireResolvedTenantId({
      actor,
      binding,
      requestedTenantId: parsed.tenantId,
    });

    if (actor.isAdmin) {
      return getClient().createNode({
        payload: {
          tenantId,
          phoneNumber: parsed.phoneNumber,
          trustScore: parsed.trustScore,
        },
      });
    }

    const exchangeResult = await exchangeTenantAccess(actor, tenantId);

    return getClient().createNode({
      tenantCredential: exchangeResult.accessToken,
      payload: {
        phoneNumber: parsed.phoneNumber,
        trustScore: parsed.trustScore,
      },
    });
  }

  return {
    bootstrapNetwork,
    getNetworkContext,
    resolveTenantAccess,
    listNetworkNodes,
    createNetworkNode,
  };
}

module.exports = {
  createNetworkService,
  ...createNetworkService(),
};
