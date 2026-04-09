const { z } = require("zod");
const { withTransaction } = require("../../core/db/postgres");
const UsersRepository = require("../users/users.repository");
const TenantIntegrationsRepository = require("./tenantIntegrations.repository");
const TenantMembershipsRepository = require("./tenantMemberships.repository");
const NodeAssignmentsRepository = require("./nodeAssignments.repository");
const {
  decryptTenantApiKey,
  encryptTenantApiKey,
} = require("../../core/security/tenantApiKeyCipher");
const {
  LogisticsApiError,
  getLogisticsClient,
} = require("../../clients/logisticsClient");

const MEMBERSHIP_ACTIVE_STATUS = "ACTIVE";
const TENANT_ACCOUNT_ACTIVE_STATUS = "ACTIVE";
const NODE_ASSIGNMENT_ACTIVE_STATUS = "ACTIVE";
const DEFAULT_MEMBERSHIP_ROLE = "OWNER";
const DEFAULT_MANAGED_MEMBERSHIP_ROLE = "MEMBER";
const MEMBERSHIP_STATUS_VALUES = ["ACTIVE", "INACTIVE"];
const MEMBERSHIP_ROLE_VALUES = ["OWNER", "ADMIN", "MEMBER"];

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
    nodeId: z.string().trim().min(1).optional(),
  })
  .strict();

const createNodePayloadSchema = z
  .object({
    tenantId: z.string().trim().min(1).optional(),
    phoneNumber: z.string().trim().min(1),
    trustScore: z.coerce.number().min(0).default(0),
  })
  .strict();

const provisionSelfPayloadSchema = z
  .object({
    tenantName: z.string().trim().min(1).max(120),
    phoneNumber: z.string().trim().min(1),
    trustScore: z.coerce.number().min(0).default(0),
  })
  .strict();

const listTenantUsersQuerySchema = z
  .object({
    tenantId: z.string().trim().min(1),
  })
  .strict();

const manageTenantUserParamsSchema = z
  .object({
    userId: z.string().trim().min(1),
  })
  .strict();

const manageTenantUserPayloadSchema = z
  .object({
    tenantId: z.string().trim().min(1),
    role: z.enum(MEMBERSHIP_ROLE_VALUES).default(DEFAULT_MANAGED_MEMBERSHIP_ROLE),
    status: z.enum(MEMBERSHIP_STATUS_VALUES).default(MEMBERSHIP_ACTIVE_STATUS),
    nodeIds: z.array(z.string().trim().min(1)).default([]),
    defaultNodeId: z.string().trim().min(1).optional(),
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

function createConflictError(message) {
  const err = new Error(message);
  err.status = 409;
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

function toMembershipDTO(membership) {
  if (!membership) {
    return null;
  }

  return {
    userId: membership.userId,
    tenantId: membership.tenantId,
    role: membership.role,
    status: membership.status,
  };
}

function toAssignmentDTO(assignment) {
  if (!assignment) {
    return null;
  }

  return {
    userId: assignment.userId,
    tenantId: assignment.tenantId,
    nodeId: assignment.nodeId,
    isDefault: Boolean(assignment.isDefault),
    status: assignment.status,
  };
}

function toBindingDTO(userId, membership, assignment) {
  if (!membership && !assignment) {
    return null;
  }

  return {
    userId,
    tenantId: membership?.tenantId || assignment?.tenantId || null,
    role: membership?.role || null,
    nodeId: assignment?.nodeId || null,
    status: assignment?.status || membership?.status || null,
    isDefaultNode: Boolean(assignment?.isDefault),
  };
}

function toLegacyBindingDTO(userId, binding) {
  if (!binding) {
    return null;
  }

  return {
    userId,
    tenantId: binding.tenantId,
    role: null,
    nodeId: binding.nodeId || null,
    status: "LEGACY",
    isDefaultNode: false,
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

function toUserDTO(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    displayName: user.displayName || null,
    email: user.email || null,
    photoURL: typeof user.photoURL === "string" ? user.photoURL : null,
    roles: Array.isArray(user.roles) ? user.roles : [],
    emailVerified: Boolean(user.emailVerified),
  };
}

function uniqueStrings(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
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

function isUnauthorizedUpstreamError(error) {
  return error instanceof LogisticsApiError && error.status === 401;
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

function filterActiveMemberships(memberships) {
  return (memberships || []).filter(
    (membership) => membership && membership.status === MEMBERSHIP_ACTIVE_STATUS
  );
}

function filterActiveAssignments(assignments) {
  return (assignments || []).filter(
    (assignment) => assignment && assignment.status === NODE_ASSIGNMENT_ACTIVE_STATUS
  );
}

function selectMembership(currentUser, memberships, options = {}) {
  const activeMemberships = filterActiveMemberships(memberships);
  const requestedTenantId = String(options?.tenantId || "").trim();
  const legacyBinding = normalizeStoredBinding(currentUser.preferences?.bln);

  if (requestedTenantId) {
    return (
      activeMemberships.find(
        (membership) => membership.tenantId === requestedTenantId
      ) || null
    );
  }

  if (legacyBinding) {
    const matchingLegacyMembership = activeMemberships.find(
      (membership) => membership.tenantId === legacyBinding.tenantId
    );
    if (matchingLegacyMembership) {
      return matchingLegacyMembership;
    }
  }

  if (activeMemberships.length === 1) {
    return activeMemberships[0];
  }

  return null;
}

function selectAssignment(currentUser, tenantId, assignments, options = {}) {
  const activeAssignments = filterActiveAssignments(assignments);
  const requestedNodeId = String(options?.nodeId || "").trim();
  const legacyBinding = normalizeStoredBinding(currentUser.preferences?.bln);

  if (requestedNodeId) {
    return (
      activeAssignments.find((assignment) => assignment.nodeId === requestedNodeId) ||
      null
    );
  }

  if (legacyBinding && legacyBinding.tenantId === tenantId && legacyBinding.nodeId) {
    const matchingLegacyAssignment = activeAssignments.find(
      (assignment) => assignment.nodeId === legacyBinding.nodeId
    );
    if (matchingLegacyAssignment) {
      return matchingLegacyAssignment;
    }
  }

  const defaultAssignment = activeAssignments.find((assignment) =>
    Boolean(assignment.isDefault)
  );
  if (defaultAssignment) {
    return defaultAssignment;
  }

  if (activeAssignments.length === 1) {
    return activeAssignments[0];
  }

  return null;
}

function createNetworkService(dependencies = {}) {
  function getUsersRepository() {
    return dependencies.usersRepository || UsersRepository;
  }

  function getTenantIntegrationsRepository() {
    return dependencies.tenantIntegrationsRepository || TenantIntegrationsRepository;
  }

  function getTenantMembershipsRepository() {
    return dependencies.tenantMembershipsRepository || TenantMembershipsRepository;
  }

  function getNodeAssignmentsRepository() {
    return dependencies.nodeAssignmentsRepository || NodeAssignmentsRepository;
  }

  function getClient() {
    return dependencies.logisticsClient || getLogisticsClient();
  }

  function getCipher() {
    return (
      dependencies.tenantApiKeyCipher || {
        encryptTenantApiKey,
        decryptTenantApiKey,
      }
    );
  }

  async function getUserById(client, userId) {
    const usersRepository = getUsersRepository();
    if (typeof usersRepository.getByIdWithClient === "function") {
      return usersRepository.getByIdWithClient(client, userId);
    }

    return usersRepository.getById(userId);
  }

  async function upsertUser(client, userId, payload) {
    const usersRepository = getUsersRepository();
    if (typeof usersRepository.upsertWithClient === "function") {
      return usersRepository.upsertWithClient(client, userId, payload);
    }

    return usersRepository.upsert(userId, payload);
  }

  async function listUsersByIds(userIds, client = null) {
    const usersRepository = getUsersRepository();

    if (client && typeof usersRepository.listByIdsWithClient === "function") {
      return usersRepository.listByIdsWithClient(client, userIds);
    }

    if (typeof usersRepository.listByIds === "function") {
      return usersRepository.listByIds(userIds);
    }

    const docs = await usersRepository.list(Math.max(userIds.length, 50));
    const idSet = new Set(uniqueStrings(userIds));
    return docs.filter((doc) => idSet.has(doc.id));
  }

  async function requireExistingUser(userId, client = null) {
    const user = client ? await getUserById(client, userId) : await getUserById(null, userId);
    if (!user) {
      throw createNotFoundError("User not found");
    }

    return user;
  }

  async function listMembershipsByUserId(userId, client = null) {
    const repository = getTenantMembershipsRepository();
    if (client && typeof repository.listByUserIdWithClient === "function") {
      return repository.listByUserIdWithClient(client, userId);
    }

    return repository.listByUserId(userId);
  }

  async function listMembershipsByTenantId(tenantId, client = null) {
    const repository = getTenantMembershipsRepository();
    if (client && typeof repository.listByTenantIdWithClient === "function") {
      return repository.listByTenantIdWithClient(client, tenantId);
    }

    return repository.listByTenantId(tenantId);
  }

  async function listAssignmentsByUserIdAndTenantId(userId, tenantId, client = null) {
    const repository = getNodeAssignmentsRepository();
    if (
      client &&
      typeof repository.listByUserIdAndTenantIdWithClient === "function"
    ) {
      return repository.listByUserIdAndTenantIdWithClient(client, userId, tenantId);
    }

    return repository.listByUserIdAndTenantId(userId, tenantId);
  }

  async function listAssignmentsByTenantId(tenantId, client = null) {
    const repository = getNodeAssignmentsRepository();
    if (client && typeof repository.listByTenantIdWithClient === "function") {
      return repository.listByTenantIdWithClient(client, tenantId);
    }

    return repository.listByTenantId(tenantId);
  }

  async function loadTenantIntegration(tenantId, client = null) {
    const repository = getTenantIntegrationsRepository();
    if (client && typeof repository.getByTenantIdWithClient === "function") {
      return repository.getByTenantIdWithClient(client, tenantId);
    }

    return repository.getByTenantId(tenantId);
  }

  async function persistBindingForUser(userId, binding, client = null) {
    const existingUser = await requireExistingUser(userId, client);

    return upsertUser(client, userId, buildUserUpsertPayload(existingUser, binding));
  }

  async function persistTenantIntegration(tenantAccount, client = null) {
    const repository = getTenantIntegrationsRepository();
    if (client && typeof repository.upsertWithClient === "function") {
      return repository.upsertWithClient(client, tenantAccount);
    }

    return repository.upsert(tenantAccount);
  }

  async function persistMembership(membership, client = null) {
    const repository = getTenantMembershipsRepository();
    if (client && typeof repository.upsertWithClient === "function") {
      return repository.upsertWithClient(client, membership);
    }

    return repository.upsert(membership);
  }

  async function persistNodeAssignment(assignment, client = null) {
    const repository = getNodeAssignmentsRepository();
    if (client && typeof repository.upsertWithClient === "function") {
      return repository.upsertWithClient(client, assignment);
    }

    return repository.upsert(assignment);
  }

  async function createNodeSession(actor, tenantAccount, nodeId) {
    if (!tenantAccount || tenantAccount.status !== TENANT_ACCOUNT_ACTIVE_STATUS) {
      throw createForbiddenError("An active BLN tenant integration is required");
    }

    const apiKey = getCipher().decryptTenantApiKey(tenantAccount.apiKeyEncrypted);

    return getClient().createNodeSession({
      apiKey,
      payload: {
        nodeId,
        subject: actor.uid,
        ...(actor.email ? { email: actor.email } : {}),
      },
    });
  }

  function requireAdminActor(actor) {
    if (!actor.isAdmin) {
      throw createForbiddenError("Admin privileges required");
    }
  }

  async function requireTenantIntegration(tenantId, client = null) {
    const tenantAccount = await loadTenantIntegration(tenantId, client);
    if (!tenantAccount) {
      throw createNotFoundError("BLN tenant integration not found");
    }

    return tenantAccount;
  }

  async function resolveTenantAccess(authContext, options = {}) {
    const actor = requireActor(authContext);
    const currentUser = await requireExistingUser(actor.uid);
    const memberships = await listMembershipsByUserId(actor.uid);
    const activeMemberships = filterActiveMemberships(memberships);

    if (!activeMemberships.length) {
      throw createForbiddenError("An active BLN tenant membership is required");
    }

    const membership = selectMembership(currentUser, activeMemberships, options);
    if (!membership) {
      if (String(options?.tenantId || "").trim()) {
        throw createForbiddenError(
          "The current user is not a member of the requested BLN tenant"
        );
      }

      throw createConflictError(
        "tenantId is required when the current user belongs to multiple BLN tenants"
      );
    }

    const assignments = await listAssignmentsByUserIdAndTenantId(
      actor.uid,
      membership.tenantId
    );
    const activeAssignments = filterActiveAssignments(assignments);

    if (!activeAssignments.length) {
      throw createForbiddenError("An active BLN node assignment is required");
    }

    const assignment = selectAssignment(
      currentUser,
      membership.tenantId,
      activeAssignments,
      options
    );
    if (!assignment) {
      if (String(options?.nodeId || "").trim()) {
        throw createForbiddenError(
          "The current user is not assigned to the requested BLN node"
        );
      }

      throw createConflictError(
        "nodeId is required when the current user is assigned to multiple BLN nodes"
      );
    }

    const tenantAccount = await loadTenantIntegration(membership.tenantId);
    if (!tenantAccount || tenantAccount.status !== TENANT_ACCOUNT_ACTIVE_STATUS) {
      throw createForbiddenError("An active BLN tenant integration is required");
    }

    const nodeSession = await createNodeSession(actor, tenantAccount, assignment.nodeId);

    return {
      actor,
      currentUser,
      membership,
      assignment,
      tenantId: membership.tenantId,
      nodeId: assignment.nodeId,
      tenant: nodeSession.tenant || null,
      node: nodeSession.node || null,
      tenantCredential: nodeSession.accessToken,
    };
  }

  async function resolveAdminTenantAccess(authContext, options = {}) {
    const actor = requireActor(authContext);
    const tenantId = String(options?.tenantId || "").trim();

    if (!actor.isAdmin) {
      throw createForbiddenError("Admin privileges required");
    }

    if (!tenantId) {
      throw createBadRequestError("tenantId is required for admin BLN access");
    }

    const exchangeResult = await getClient().exchangeTenantAccess({
      tenantId,
      subject: actor.uid,
      ...(actor.email ? { email: actor.email } : {}),
    });

    return {
      actor,
      tenantId,
      tenant: exchangeResult.tenant || null,
      tenantCredential: exchangeResult.accessToken,
    };
  }

  async function bootstrapNetwork(authContext, rawPayload) {
    const actor = requireActor(authContext);
    const parsed = bootstrapPayloadSchema.parse(rawPayload || {});
    const now = Date.now();
    const targetUserId = parsed.bindUserId || actor.uid;

    await requireExistingUser(targetUserId);

    const bootstrapResult = await getClient().bootstrapTenant({
      name: parsed.name,
      firstNode: parsed.firstNode,
    });

    const tenantId = String(bootstrapResult?.tenant?.id || "").trim();
    const nodeId = String(bootstrapResult?.node?.id || "").trim();
    const apiKeyValue = String(bootstrapResult?.apiKey?.value || "").trim();

    if (!tenantId || !nodeId || !apiKeyValue) {
      throw createUpstreamContractError(
        "logistics-api bootstrap response did not include tenant, node, and API key values"
      );
    }

    const localResult = await withTransaction(async (client) =>
      persistProvisionedNetworkContext(
        {
          userId: targetUserId,
          tenantId,
          nodeId,
          apiKeyValue,
          apiKeyLast4: bootstrapResult?.apiKey?.last4 || null,
          role: DEFAULT_MEMBERSHIP_ROLE,
          createdAt: now,
          updatedAt: now,
        },
        client
      )
    );

    return {
      tenant: bootstrapResult.tenant || null,
      node: bootstrapResult.node || null,
      binding: {
        userId: targetUserId,
        tenantId,
        nodeId,
        role: localResult.membership.role,
      },
      membership: toMembershipDTO(localResult.membership),
      assignment: toAssignmentDTO(localResult.assignment),
      apiKey: toSafeApiKeyDTO(bootstrapResult.apiKey),
    };
  }

  async function persistProvisionedNetworkContext(payload, client) {
    await requireExistingUser(payload.userId, client);

    const tenantAccount = await persistTenantIntegration(
      {
        tenantId: payload.tenantId,
        apiKeyEncrypted: getCipher().encryptTenantApiKey(payload.apiKeyValue),
        apiKeyLast4: payload.apiKeyLast4 || null,
        status: TENANT_ACCOUNT_ACTIVE_STATUS,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
      },
      client
    );

    const membership = await persistMembership(
      {
        userId: payload.userId,
        tenantId: payload.tenantId,
        role: payload.role || DEFAULT_MEMBERSHIP_ROLE,
        status: MEMBERSHIP_ACTIVE_STATUS,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
      },
      client
    );

    const assignment = await persistNodeAssignment(
      {
        userId: payload.userId,
        tenantId: payload.tenantId,
        nodeId: payload.nodeId,
        isDefault: true,
        status: NODE_ASSIGNMENT_ACTIVE_STATUS,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
      },
      client
    );

    await persistBindingForUser(
      payload.userId,
      {
        tenantId: payload.tenantId,
        nodeId: payload.nodeId,
      },
      client
    );

    return {
      tenantAccount,
      membership,
      assignment,
    };
  }

  async function provisionSelfNetwork(authContext, rawPayload) {
    const actor = requireActor(authContext);
    const parsed = provisionSelfPayloadSchema.parse(rawPayload || {});
    const currentUser = await requireExistingUser(actor.uid);
    const memberships = await listMembershipsByUserId(actor.uid);
    const activeMemberships = filterActiveMemberships(memberships);

    if (activeMemberships.length) {
      throw createConflictError(
        "A BLN tenant membership already exists for the current user"
      );
    }

    const now = Date.now();
    const bootstrapResult = await getClient().bootstrapTenant({
      name: parsed.tenantName,
      firstNode: {
        phoneNumber: parsed.phoneNumber,
        trustScore: parsed.trustScore,
      },
    });

    const tenantId = String(bootstrapResult?.tenant?.id || "").trim();
    const nodeId = String(bootstrapResult?.node?.id || "").trim();
    const apiKeyValue = String(bootstrapResult?.apiKey?.value || "").trim();

    if (!tenantId || !nodeId || !apiKeyValue) {
      throw createUpstreamContractError(
        "logistics-api bootstrap response did not include tenant, node, and API key values"
      );
    }

    const localResult = await withTransaction(async (client) =>
      persistProvisionedNetworkContext(
        {
          userId: currentUser.id,
          tenantId,
          nodeId,
          apiKeyValue,
          apiKeyLast4: bootstrapResult?.apiKey?.last4 || null,
          role: DEFAULT_MEMBERSHIP_ROLE,
          createdAt: now,
          updatedAt: now,
        },
        client
      )
    );

    return {
      tenant: bootstrapResult.tenant || null,
      node: bootstrapResult.node || null,
      binding: {
        userId: currentUser.id,
        tenantId,
        nodeId,
        role: localResult.membership.role,
      },
      membership: toMembershipDTO(localResult.membership),
      assignment: toAssignmentDTO(localResult.assignment),
      apiKey: toSafeApiKeyDTO(bootstrapResult.apiKey),
    };
  }

  async function getNetworkContext(authContext, rawQuery) {
    const actor = requireActor(authContext);
    const parsed = contextQuerySchema.parse(rawQuery || {});
    const currentUser = await requireExistingUser(actor.uid);
    const memberships = await listMembershipsByUserId(actor.uid);
    const activeMemberships = filterActiveMemberships(memberships);
    const legacyBinding = normalizeStoredBinding(currentUser.preferences?.bln);

    const context = {
      actor: toActorDTO(actor),
      binding: null,
      memberships: activeMemberships.map(toMembershipDTO),
      assignments: [],
      effectiveContext: null,
      tenant: null,
      node: null,
      issues: [],
    };

    if (!activeMemberships.length) {
      context.binding = toLegacyBindingDTO(currentUser.id, legacyBinding);
      context.issues.push(
        legacyBinding
          ? createIssue(
              "BLN_MEMBERSHIP_MISSING",
              "A BLN binding exists, but no active BLN tenant membership is configured for the current user"
            )
          : createIssue(
              "BLN_CONTEXT_UNBOUND",
              "No BLN tenant membership is configured for the current user"
            )
      );
      return context;
    }

    const membership = selectMembership(currentUser, activeMemberships, parsed);
    if (!membership) {
      if (String(parsed.tenantId || "").trim()) {
        throw createForbiddenError(
          "The current user is not a member of the requested BLN tenant"
        );
      }

      context.issues.push(
        createIssue(
          "BLN_TENANT_SELECTION_REQUIRED",
          "tenantId is required when the current user belongs to multiple BLN tenants"
        )
      );
      return context;
    }

    const assignments = await listAssignmentsByUserIdAndTenantId(
      actor.uid,
      membership.tenantId
    );
    const activeAssignments = filterActiveAssignments(assignments);
    context.assignments = activeAssignments.map(toAssignmentDTO);

    if (!activeAssignments.length) {
      context.binding = toBindingDTO(currentUser.id, membership, null);
      context.effectiveContext = {
        tenantId: membership.tenantId,
        nodeId: null,
      };
      context.issues.push(
        createIssue(
          "BLN_NODE_ASSIGNMENT_MISSING",
          "No active BLN node assignment is configured for the selected tenant"
        )
      );
      return context;
    }

    const assignment = selectAssignment(
      currentUser,
      membership.tenantId,
      activeAssignments,
      parsed
    );
    if (!assignment) {
      if (String(parsed.nodeId || "").trim()) {
        throw createForbiddenError(
          "The current user is not assigned to the requested BLN node"
        );
      }

      context.binding = toBindingDTO(currentUser.id, membership, null);
      context.effectiveContext = {
        tenantId: membership.tenantId,
        nodeId: null,
      };
      context.issues.push(
        createIssue(
          "BLN_NODE_SELECTION_REQUIRED",
          "nodeId is required when the current user is assigned to multiple BLN nodes"
        )
      );
      return context;
    }

    context.binding = toBindingDTO(currentUser.id, membership, assignment);
    context.effectiveContext = {
      tenantId: membership.tenantId,
      nodeId: assignment.nodeId,
    };

    const tenantAccount = await loadTenantIntegration(membership.tenantId);
    if (!tenantAccount || tenantAccount.status !== TENANT_ACCOUNT_ACTIVE_STATUS) {
      context.issues.push(
        createIssue(
          "BLN_TENANT_INTEGRATION_MISSING",
          "No active BLN tenant integration is configured for the selected tenant"
        )
      );
      return context;
    }

    try {
      const nodeSession = await createNodeSession(actor, tenantAccount, assignment.nodeId);
      context.tenant = nodeSession.tenant || null;
      context.node = nodeSession.node || null;
      return context;
    } catch (error) {
      if (isNotFoundUpstreamError(error)) {
        context.issues.push(
          createIssue(
            "BLN_RUNTIME_CONTEXT_NOT_FOUND",
            "The BLN tenant or node selected for this user no longer exists"
          )
        );
        return context;
      }

      if (isUnauthorizedUpstreamError(error)) {
        context.issues.push(
          createIssue(
            "BLN_TENANT_API_KEY_INVALID",
            "The stored BLN tenant API key is no longer valid"
          )
        );
        return context;
      }

      throw error;
    }
  }

  async function listNetworkNodes(authContext, rawQuery) {
    const actor = requireActor(authContext);
    const parsed = listNodesQuerySchema.parse(rawQuery || {});

    if (actor.isAdmin && parsed.tenantId) {
      const result = await getClient().listNodes({ tenantId: parsed.tenantId });
      return {
        tenantId: parsed.tenantId,
        activeNodeId: null,
        items: Array.isArray(result?.items) ? result.items : [],
      };
    }

    const access = await resolveTenantAccess(authContext, {
      tenantId: parsed.tenantId,
      nodeId: parsed.nodeId,
    });
    const result = await getClient().listNodes({
      tenantCredential: access.tenantCredential,
    });

    return {
      tenantId: access.tenantId,
      activeNodeId: access.nodeId,
      items: Array.isArray(result?.items) ? result.items : [],
    };
  }

  async function createNetworkNode(authContext, rawPayload) {
    const actor = requireActor(authContext);
    const parsed = createNodePayloadSchema.parse(rawPayload || {});

    if (!actor.isAdmin) {
      throw createForbiddenError(
        "Node creation is restricted to admin support flows"
      );
    }

    if (!parsed.tenantId) {
      throw createBadRequestError("tenantId is required for node creation");
    }

    return getClient().createNode({
      payload: {
        tenantId: parsed.tenantId,
        phoneNumber: parsed.phoneNumber,
        trustScore: parsed.trustScore,
      },
    });
  }

  async function listTenantUsers(authContext, rawQuery) {
    const actor = requireActor(authContext);
    requireAdminActor(actor);

    const parsed = listTenantUsersQuerySchema.parse(rawQuery || {});
    await requireTenantIntegration(parsed.tenantId);

    const memberships = await listMembershipsByTenantId(parsed.tenantId);
    const [assignments, users, nodesResult] = await Promise.all([
      listAssignmentsByTenantId(parsed.tenantId),
      listUsersByIds(memberships.map((membership) => membership.userId)),
      getClient().listNodes({ tenantId: parsed.tenantId }),
    ]);

    const usersById = new Map(users.map((user) => [user.id, user]));
    const assignmentsByUserId = new Map();

    for (const assignment of assignments) {
      const existing = assignmentsByUserId.get(assignment.userId) || [];
      existing.push(toAssignmentDTO(assignment));
      assignmentsByUserId.set(assignment.userId, existing);
    }

    return {
      tenantId: parsed.tenantId,
      availableNodes: Array.isArray(nodesResult?.items) ? nodesResult.items : [],
      items: memberships.map((membership) => ({
        user: toUserDTO(usersById.get(membership.userId)),
        membership: toMembershipDTO(membership),
        assignments: assignmentsByUserId.get(membership.userId) || [],
      })),
    };
  }

  async function upsertTenantUserAccess(authContext, params, rawPayload) {
    const actor = requireActor(authContext);
    requireAdminActor(actor);

    const parsedParams = manageTenantUserParamsSchema.parse(params || {});
    const parsed = manageTenantUserPayloadSchema.parse(rawPayload || {});
    const desiredNodeIds = uniqueStrings(parsed.nodeIds);

    await requireExistingUser(parsedParams.userId);
    await requireTenantIntegration(parsed.tenantId);

    const availableNodesResult = await getClient().listNodes({ tenantId: parsed.tenantId });
    const availableNodes = Array.isArray(availableNodesResult?.items)
      ? availableNodesResult.items
      : [];
    const availableNodeIds = new Set(
      availableNodes.map((node) => String(node?.id || "").trim()).filter(Boolean)
    );

    if (parsed.status === MEMBERSHIP_ACTIVE_STATUS && !desiredNodeIds.length) {
      throw createBadRequestError(
        "nodeIds must contain at least one node when the tenant membership is active"
      );
    }

    const unknownNodeIds = desiredNodeIds.filter((nodeId) => !availableNodeIds.has(nodeId));
    if (unknownNodeIds.length) {
      throw createBadRequestError(
        `Unknown BLN node ids for tenant: ${unknownNodeIds.join(", ")}`
      );
    }

    if (parsed.defaultNodeId && !desiredNodeIds.includes(parsed.defaultNodeId)) {
      throw createBadRequestError("defaultNodeId must be included in nodeIds");
    }

    const defaultNodeId =
      parsed.status === MEMBERSHIP_ACTIVE_STATUS
        ? parsed.defaultNodeId || desiredNodeIds[0]
        : null;
    const now = Date.now();

    const localResult = await withTransaction(async (client) => {
      await requireExistingUser(parsedParams.userId, client);
      const existingAssignments = await listAssignmentsByUserIdAndTenantId(
        parsedParams.userId,
        parsed.tenantId,
        client
      );

      const membership = await persistMembership(
        {
          userId: parsedParams.userId,
          tenantId: parsed.tenantId,
          role: parsed.role,
          status: parsed.status,
          createdAt: now,
          updatedAt: now,
        },
        client
      );

      for (const assignment of existingAssignments) {
        if (
          parsed.status !== MEMBERSHIP_ACTIVE_STATUS ||
          !desiredNodeIds.includes(assignment.nodeId)
        ) {
          await persistNodeAssignment(
            {
              userId: parsedParams.userId,
              tenantId: parsed.tenantId,
              nodeId: assignment.nodeId,
              isDefault: false,
              status: "INACTIVE",
              createdAt: now,
              updatedAt: now,
            },
            client
          );
        }
      }

      if (parsed.status === MEMBERSHIP_ACTIVE_STATUS) {
        for (const nodeId of desiredNodeIds) {
          await persistNodeAssignment(
            {
              userId: parsedParams.userId,
              tenantId: parsed.tenantId,
              nodeId,
              isDefault: nodeId === defaultNodeId,
              status: NODE_ASSIGNMENT_ACTIVE_STATUS,
              createdAt: now,
              updatedAt: now,
            },
            client
          );
        }

        await persistBindingForUser(
          parsedParams.userId,
          {
            tenantId: parsed.tenantId,
            nodeId: defaultNodeId,
          },
          client
        );
      }

      const assignments = await listAssignmentsByUserIdAndTenantId(
        parsedParams.userId,
        parsed.tenantId,
        client
      );
      const refreshedUser = await requireExistingUser(parsedParams.userId, client);

      return {
        user: refreshedUser,
        membership,
        assignments,
      };
    });

    return {
      tenantId: parsed.tenantId,
      availableNodes,
      user: toUserDTO(localResult.user),
      membership: toMembershipDTO(localResult.membership),
      assignments: localResult.assignments.map(toAssignmentDTO).filter(Boolean),
    };
  }

  return {
    bootstrapNetwork,
    provisionSelfNetwork,
    getNetworkContext,
    resolveTenantAccess,
    resolveAdminTenantAccess,
    listNetworkNodes,
    createNetworkNode,
    listTenantUsers,
    upsertTenantUserAccess,
  };
}

module.exports = {
  createNetworkService,
  ...createNetworkService(),
};
