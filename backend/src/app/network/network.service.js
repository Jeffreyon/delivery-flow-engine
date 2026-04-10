const { z } = require("zod");
const { v4: uuidv4 } = require("uuid");
const { withTransaction } = require("../../core/db/postgres");
const UsersRepository = require("../users/users.repository");
const TenantIntegrationsRepository = require("./tenantIntegrations.repository");
const TenantMembershipsRepository = require("./tenantMemberships.repository");
const NodeAssignmentsRepository = require("./nodeAssignments.repository");
const TenantInvitationsRepository = require("./tenantInvitations.repository");
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
const INVITATION_PENDING_STATUS = "PENDING";
const INVITATION_ACCEPTED_STATUS = "ACCEPTED";
const INVITATION_REVOKED_STATUS = "REVOKED";
const INVITATION_STATUS_VALUES = [
  INVITATION_PENDING_STATUS,
  INVITATION_ACCEPTED_STATUS,
  INVITATION_REVOKED_STATUS,
];

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

const requestNodeOtpPayloadSchema = z
  .object({
    phoneNumber: z.string().trim().min(1).optional(),
  })
  .strict();

const verifyNodeOtpPayloadSchema = z
  .object({
    challengeId: z.string().trim().min(1),
    pin: z.string().trim().min(1),
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

const listInvitationsQuerySchema = z
  .object({
    tenantId: z.string().trim().min(1).optional(),
    status: z.enum(INVITATION_STATUS_VALUES).optional(),
  })
  .strict();

const createInvitationPayloadSchema = z
  .object({
    tenantId: z.string().trim().min(1),
    email: z.string().trim().email(),
    role: z.enum(MEMBERSHIP_ROLE_VALUES).default(DEFAULT_MANAGED_MEMBERSHIP_ROLE),
    nodeIds: z.array(z.string().trim().min(1)).min(1),
    defaultNodeId: z.string().trim().min(1).optional(),
  })
  .strict();

const invitationParamsSchema = z
  .object({
    invitationId: z.string().trim().min(1),
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

function toInvitationDTO(invitation) {
  if (!invitation) {
    return null;
  }

  return {
    id: invitation.id,
    tenantId: invitation.tenantId,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    nodeIds: Array.isArray(invitation.nodeIds) ? invitation.nodeIds : [],
    defaultNodeId: invitation.defaultNodeId || null,
    invitedByUserId: invitation.invitedByUserId || null,
    acceptedByUserId: invitation.acceptedByUserId || null,
    acceptedAt: invitation.acceptedAt ?? null,
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
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

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhoneNumber(value) {
  return String(value || "").trim();
}

function getUserPhoneNumber(user) {
  const preferences = user?.preferences || {};
  const directPhoneNumber = normalizePhoneNumber(preferences.phoneNumber);
  if (directPhoneNumber) {
    return directPhoneNumber;
  }

  const contactPhoneNumber = normalizePhoneNumber(
    preferences.contact?.phoneNumber
  );
  return contactPhoneNumber || null;
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

  function getTenantInvitationsRepository() {
    return dependencies.tenantInvitationsRepository || TenantInvitationsRepository;
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
    if (client && typeof usersRepository.getByIdWithClient === "function") {
      return usersRepository.getByIdWithClient(client, userId);
    }

    return usersRepository.getById(userId);
  }

  async function upsertUser(client, userId, payload) {
    const usersRepository = getUsersRepository();
    if (client && typeof usersRepository.upsertWithClient === "function") {
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

  async function listTenantIntegrations(client = null) {
    const repository = getTenantIntegrationsRepository();
    if (client && typeof repository.listAllWithClient === "function") {
      return repository.listAllWithClient(client);
    }

    if (typeof repository.listAll === "function") {
      return repository.listAll();
    }

    return [];
  }

  async function listInvitationsByEmail(email, client = null) {
    const repository = getTenantInvitationsRepository();
    if (client && typeof repository.listByEmailWithClient === "function") {
      return repository.listByEmailWithClient(client, email);
    }

    return repository.listByEmail(email);
  }

  async function listInvitationsByTenantId(tenantId, client = null) {
    const repository = getTenantInvitationsRepository();
    if (client && typeof repository.listByTenantIdWithClient === "function") {
      return repository.listByTenantIdWithClient(client, tenantId);
    }

    return repository.listByTenantId(tenantId);
  }

  async function getInvitationById(invitationId, client = null) {
    const repository = getTenantInvitationsRepository();
    if (client && typeof repository.getByIdWithClient === "function") {
      return repository.getByIdWithClient(client, invitationId);
    }

    return repository.getById(invitationId);
  }

  async function getPendingInvitationByTenantAndEmail(
    tenantId,
    email,
    client = null
  ) {
    const repository = getTenantInvitationsRepository();
    if (
      client &&
      typeof repository.getPendingByTenantIdAndEmailWithClient === "function"
    ) {
      return repository.getPendingByTenantIdAndEmailWithClient(
        client,
        tenantId,
        email
      );
    }

    return repository.getPendingByTenantIdAndEmail(tenantId, email);
  }

  async function createInvitation(invitation, client = null) {
    const repository = getTenantInvitationsRepository();
    if (client && typeof repository.createWithClient === "function") {
      return repository.createWithClient(client, invitation);
    }

    return repository.create(invitation);
  }

  async function updateInvitationStatus(payload, client = null) {
    const repository = getTenantInvitationsRepository();
    if (client && typeof repository.updateStatusWithClient === "function") {
      return repository.updateStatusWithClient(client, payload);
    }

    return repository.updateStatus(payload);
  }

  async function persistBindingForUser(userId, binding, client = null) {
    const existingUser = await requireExistingUser(userId, client);

    return upsertUser(client, userId, buildUserUpsertPayload(existingUser, binding));
  }

  async function persistPhoneNumberForUser(userId, phoneNumber, client = null) {
    const existingUser = await requireExistingUser(userId, client);

    return upsertUser(
      client,
      userId,
      buildUserPhonePayload(existingUser, phoneNumber)
    );
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

  async function loadWorkspaceTenantIntegration(client = null) {
    const activeIntegrations = (await listTenantIntegrations(client)).filter(
      (tenantAccount) => tenantAccount?.status === TENANT_ACCOUNT_ACTIVE_STATUS
    );

    if (!activeIntegrations.length) {
      return null;
    }

    if (activeIntegrations.length > 1) {
      throw createConflictError(
        "Only one active BLN workspace tenant is supported per delivery app instance"
      );
    }

    return activeIntegrations[0];
  }

  function deriveWorkspaceMembershipRole(actor, currentUser, options = {}) {
    if (options.owner) {
      return DEFAULT_MEMBERSHIP_ROLE;
    }

    const roles = Array.isArray(currentUser?.roles) ? currentUser.roles : [];
    return actor.isAdmin || roles.includes("admin") ? "ADMIN" : "MEMBER";
  }

  async function ensureWorkspaceMembership(
    actor,
    currentUser,
    tenantId,
    client = null,
    options = {}
  ) {
    const membershipsRepository = getTenantMembershipsRepository();
    const existingMembership =
      client &&
      typeof membershipsRepository.getByUserIdAndTenantIdWithClient === "function"
        ? await membershipsRepository.getByUserIdAndTenantIdWithClient(
            client,
            currentUser.id,
            tenantId
          )
        : await membershipsRepository.getByUserIdAndTenantId(
            currentUser.id,
            tenantId
          );

    if (existingMembership?.status === MEMBERSHIP_ACTIVE_STATUS) {
      return existingMembership;
    }

    const now = Date.now();
    const membership = await persistMembership(
      {
        userId: currentUser.id,
        tenantId,
        role: deriveWorkspaceMembershipRole(actor, currentUser, options),
        status: MEMBERSHIP_ACTIVE_STATUS,
        createdAt: existingMembership?.createdAt || now,
        updatedAt: now,
      },
      client
    );

    const legacyBinding = normalizeStoredBinding(currentUser.preferences?.bln);
    if (!legacyBinding || legacyBinding.tenantId === tenantId) {
      await persistBindingForUser(
        currentUser.id,
        {
          tenantId,
          nodeId: legacyBinding?.nodeId || null,
        },
        client
      );
    }

    return membership;
  }

  async function deactivateOtherAssignments(
    userId,
    tenantId,
    keepNodeId,
    client = null
  ) {
    const existingAssignments = await listAssignmentsByUserIdAndTenantId(
      userId,
      tenantId,
      client
    );
    const now = Date.now();

    for (const assignment of existingAssignments) {
      if (assignment.nodeId === keepNodeId) {
        continue;
      }

      await persistNodeAssignment(
        {
          userId,
          tenantId,
          nodeId: assignment.nodeId,
          isDefault: false,
          status: "INACTIVE",
          createdAt: assignment.createdAt || now,
          updatedAt: now,
        },
        client
      );
    }
  }

  async function loadAvailableTenantNodes(tenantId) {
    await requireTenantIntegration(tenantId);

    const availableNodesResult = await getClient().listNodes({ tenantId });
    const availableNodes = Array.isArray(availableNodesResult?.items)
      ? availableNodesResult.items
      : [];
    const availableNodeIds = new Set(
      availableNodes.map((node) => String(node?.id || "").trim()).filter(Boolean)
    );

    return {
      availableNodes,
      availableNodeIds,
    };
  }

  function validateTenantNodeSelection(
    availableNodeIds,
    desiredNodeIds,
    defaultNodeId,
    options = {}
  ) {
    const normalizedNodeIds = uniqueStrings(desiredNodeIds);
    const requireNodes = options.requireNodes !== false;

    if (requireNodes && !normalizedNodeIds.length) {
      throw createBadRequestError(
        "nodeIds must contain at least one node when tenant access is active"
      );
    }

    const unknownNodeIds = normalizedNodeIds.filter(
      (nodeId) => !availableNodeIds.has(nodeId)
    );
    if (unknownNodeIds.length) {
      throw createBadRequestError(
        `Unknown BLN node ids for tenant: ${unknownNodeIds.join(", ")}`
      );
    }

    if (defaultNodeId && !normalizedNodeIds.includes(defaultNodeId)) {
      throw createBadRequestError("defaultNodeId must be included in nodeIds");
    }

    return {
      desiredNodeIds: normalizedNodeIds,
      defaultNodeId: normalizedNodeIds.length
        ? defaultNodeId || normalizedNodeIds[0]
        : null,
    };
  }

  async function resolveTenantAccess(authContext, options = {}) {
    const actor = requireActor(authContext);
    const currentUser = await requireExistingUser(actor.uid);
    const workspaceTenantAccount = await loadWorkspaceTenantIntegration();
    if (!workspaceTenantAccount) {
      throw createForbiddenError(
        "A BLN workspace has not been bootstrapped for this delivery app instance"
      );
    }

    const requestedTenantId = String(options?.tenantId || "").trim();
    if (requestedTenantId && requestedTenantId !== workspaceTenantAccount.tenantId) {
      throw createForbiddenError(
        "The current user cannot access a tenant outside the configured workspace"
      );
    }

    const membership = await ensureWorkspaceMembership(
      actor,
      currentUser,
      workspaceTenantAccount.tenantId
    );

    const assignments = await listAssignmentsByUserIdAndTenantId(
      actor.uid,
      workspaceTenantAccount.tenantId
    );
    const activeAssignments = filterActiveAssignments(assignments);

    if (!activeAssignments.length) {
      throw createForbiddenError("An active BLN node assignment is required");
    }

    const assignment = selectAssignment(
      currentUser,
      workspaceTenantAccount.tenantId,
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

    const nodeSession = await createNodeSession(
      actor,
      workspaceTenantAccount,
      assignment.nodeId
    );

    return {
      actor,
      currentUser,
      membership,
      assignment,
      tenantId: workspaceTenantAccount.tenantId,
      nodeId: assignment.nodeId,
      tenant: nodeSession.tenant || null,
      node: nodeSession.node || null,
      tenantCredential: nodeSession.accessToken,
    };
  }

  async function resolveAdminTenantAccess(authContext, options = {}) {
    const actor = requireActor(authContext);
    if (!actor.isAdmin) {
      throw createForbiddenError("Admin privileges required");
    }

    const workspaceTenantAccount = await loadWorkspaceTenantIntegration();
    const tenantId = String(
      options?.tenantId || workspaceTenantAccount?.tenantId || ""
    ).trim();

    if (!tenantId) {
      throw createBadRequestError(
        "A BLN workspace is not configured for this delivery app instance"
      );
    }

    if (workspaceTenantAccount && tenantId !== workspaceTenantAccount.tenantId) {
      throw createForbiddenError(
        "Only the configured workspace tenant is available in this app instance"
      );
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
    requireAdminActor(actor);
    const parsed = bootstrapPayloadSchema.parse(rawPayload || {});
    const now = Date.now();
    const targetUserId = parsed.bindUserId || actor.uid;
    const existingWorkspaceTenant = await loadWorkspaceTenantIntegration();

    await requireExistingUser(targetUserId);

    if (existingWorkspaceTenant) {
      throw createConflictError(
        "A BLN workspace is already configured for this delivery app instance"
      );
    }

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
    requireAdminActor(actor);
    const parsed = provisionSelfPayloadSchema.parse(rawPayload || {});
    return bootstrapNetwork(actor, {
      name: parsed.tenantName,
      firstNode: {
        phoneNumber: parsed.phoneNumber,
        trustScore: parsed.trustScore,
      },
      bindUserId: actor.uid,
    });
  }

  async function getNetworkContext(authContext, rawQuery) {
    const actor = requireActor(authContext);
    const parsed = contextQuerySchema.parse(rawQuery || {});
    const currentUser = await requireExistingUser(actor.uid);
    const legacyBinding = normalizeStoredBinding(currentUser.preferences?.bln);
    const userPhoneNumber = getUserPhoneNumber(currentUser);

    const context = {
      actor: toActorDTO(actor),
      binding: null,
      userPhoneNumber,
      memberships: [],
      assignments: [],
      effectiveContext: null,
      tenant: null,
      node: null,
      issues: [],
    };

    const workspaceTenantAccount = await loadWorkspaceTenantIntegration();
    if (!workspaceTenantAccount) {
      context.binding = toLegacyBindingDTO(currentUser.id, legacyBinding);
      context.issues.push(
        actor.isAdmin
          ? createIssue(
              "BLN_WORKSPACE_BOOTSTRAP_REQUIRED",
              "This delivery app instance has not bootstrapped its BLN workspace yet"
            )
          : createIssue(
              "BLN_WORKSPACE_PENDING",
              "This delivery app instance has not finished BLN workspace setup yet"
            )
      );
      return context;
    }

    if (
      String(parsed.tenantId || "").trim() &&
      parsed.tenantId !== workspaceTenantAccount.tenantId
    ) {
      throw createForbiddenError(
        "The current user cannot access a tenant outside the configured workspace"
      );
    }

    const membership = await ensureWorkspaceMembership(
      actor,
      currentUser,
      workspaceTenantAccount.tenantId
    );
    context.memberships = [toMembershipDTO(membership)];

    const assignments = await listAssignmentsByUserIdAndTenantId(
      actor.uid,
      workspaceTenantAccount.tenantId
    );
    const activeAssignments = filterActiveAssignments(assignments);
    context.assignments = activeAssignments.map(toAssignmentDTO);

    if (!activeAssignments.length) {
      context.binding = toBindingDTO(currentUser.id, membership, null);
      context.effectiveContext = {
        tenantId: workspaceTenantAccount.tenantId,
        nodeId: null,
      };
      context.issues.push(
        userPhoneNumber
          ? createIssue(
              "BLN_NODE_OTP_REQUIRED",
              "Verify the signed-in user's phone number to activate a BLN node for this workspace"
            )
          : createIssue(
              "BLN_PHONE_NUMBER_REQUIRED",
              "A phone number is required before BLN node verification can begin"
            )
      );
      return context;
    }

    const assignment = selectAssignment(
      currentUser,
      workspaceTenantAccount.tenantId,
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
      tenantId: workspaceTenantAccount.tenantId,
      nodeId: assignment.nodeId,
    };

    try {
      const nodeSession = await createNodeSession(
        actor,
        workspaceTenantAccount,
        assignment.nodeId
      );
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

  async function requestSelfNodeOtp(authContext, rawPayload) {
    const actor = requireActor(authContext);
    const parsed = requestNodeOtpPayloadSchema.parse(rawPayload || {});
    const currentUser = await requireExistingUser(actor.uid);
    const workspaceTenantAccount = await loadWorkspaceTenantIntegration();

    if (!workspaceTenantAccount) {
      throw createConflictError(
        "This delivery app instance has not bootstrapped its BLN workspace yet"
      );
    }

    const membership = await ensureWorkspaceMembership(
      actor,
      currentUser,
      workspaceTenantAccount.tenantId
    );
    const phoneNumber = normalizePhoneNumber(
      parsed.phoneNumber || getUserPhoneNumber(currentUser)
    );

    if (!phoneNumber) {
      throw createBadRequestError(
        "phoneNumber is required before BLN node verification can begin"
      );
    }

    if (phoneNumber !== getUserPhoneNumber(currentUser)) {
      await persistPhoneNumberForUser(actor.uid, phoneNumber);
    }

    const apiKey = getCipher().decryptTenantApiKey(
      workspaceTenantAccount.apiKeyEncrypted
    );
    const claimRequest = await getClient().requestNodeClaim({
      apiKey,
      payload: {
        phoneNumber,
        subject: actor.uid,
        ...(actor.email ? { email: actor.email } : {}),
      },
    });

    return {
      tenantId: workspaceTenantAccount.tenantId,
      membership: toMembershipDTO(membership),
      phoneNumber,
      challengeId: claimRequest.challengeId,
      expiresAt: claimRequest.expiresAt || null,
      provider: claimRequest.provider || null,
      debugPin: claimRequest.debugPin || null,
    };
  }

  async function verifySelfNodeOtp(authContext, rawPayload) {
    const actor = requireActor(authContext);
    const parsed = verifyNodeOtpPayloadSchema.parse(rawPayload || {});
    const currentUser = await requireExistingUser(actor.uid);
    const workspaceTenantAccount = await loadWorkspaceTenantIntegration();

    if (!workspaceTenantAccount) {
      throw createConflictError(
        "This delivery app instance has not bootstrapped its BLN workspace yet"
      );
    }

    const apiKey = getCipher().decryptTenantApiKey(
      workspaceTenantAccount.apiKeyEncrypted
    );
    const verificationResult = await getClient().verifyNodeClaim({
      apiKey,
      payload: {
        challengeId: parsed.challengeId,
        pin: parsed.pin,
        subject: actor.uid,
        ...(actor.email ? { email: actor.email } : {}),
      },
    });
    const tenantId = String(
      verificationResult?.tenant?.id || workspaceTenantAccount.tenantId || ""
    ).trim();
    const nodeId = String(verificationResult?.node?.id || "").trim();

    if (!tenantId || !nodeId) {
      throw createUpstreamContractError(
        "logistics-api node verification did not return tenant and node details"
      );
    }

    const localResult = await withTransaction(async (client) => {
      const transactionalUser = await requireExistingUser(actor.uid, client);
      const membership = await ensureWorkspaceMembership(
        actor,
        transactionalUser,
        tenantId,
        client
      );
      await deactivateOtherAssignments(actor.uid, tenantId, nodeId, client);

      const assignment = await persistNodeAssignment(
        {
          userId: actor.uid,
          tenantId,
          nodeId,
          isDefault: true,
          status: NODE_ASSIGNMENT_ACTIVE_STATUS,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        client
      );

      await persistBindingForUser(
        actor.uid,
        {
          tenantId,
          nodeId,
        },
        client
      );

      return {
        membership,
        assignment,
      };
    });

    return {
      tenant: verificationResult.tenant || null,
      node: verificationResult.node || null,
      expiresAt: verificationResult.expiresAt || null,
      membership: toMembershipDTO(localResult.membership),
      assignment: toAssignmentDTO(localResult.assignment),
    };
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

  async function listNetworkInvitations(authContext, rawQuery) {
    const actor = requireActor(authContext);
    const parsed = listInvitationsQuerySchema.parse(rawQuery || {});

    if (actor.isAdmin && parsed.tenantId) {
      const invitations = await listInvitationsByTenantId(parsed.tenantId);
      const filteredInvitations = parsed.status
        ? invitations.filter((invitation) => invitation.status === parsed.status)
        : invitations;

      return {
        scope: "tenant",
        tenantId: parsed.tenantId,
        items: filteredInvitations.map(toInvitationDTO).filter(Boolean),
      };
    }

    const currentUser = await requireExistingUser(actor.uid);
    const normalizedEmail = normalizeEmail(currentUser.email);
    if (!normalizedEmail) {
      return {
        scope: "self",
        items: [],
      };
    }

    const invitations = await listInvitationsByEmail(normalizedEmail);
    const filteredInvitations = invitations.filter(
      (invitation) => invitation.status === INVITATION_PENDING_STATUS
    );

    return {
      scope: "self",
      items: filteredInvitations.map(toInvitationDTO).filter(Boolean),
    };
  }

  async function createTenantInvitation(authContext, rawPayload) {
    const actor = requireActor(authContext);
    requireAdminActor(actor);

    const parsed = createInvitationPayloadSchema.parse(rawPayload || {});
    const normalizedEmail = normalizeEmail(parsed.email);

    await requireTenantIntegration(parsed.tenantId);

    const existingUser = normalizedEmail
      ? await getUsersRepository().getByEmail(normalizedEmail)
      : null;
    if (existingUser) {
      const existingMembership = await getTenantMembershipsRepository().getByUserIdAndTenantId(
        existingUser.id,
        parsed.tenantId
      );
      if (existingMembership?.status === MEMBERSHIP_ACTIVE_STATUS) {
        throw createConflictError(
          "The invited user already has an active BLN tenant membership"
        );
      }
    }

    const existingPendingInvitation = await getPendingInvitationByTenantAndEmail(
      parsed.tenantId,
      normalizedEmail
    );
    if (existingPendingInvitation) {
      throw createConflictError(
        "A pending BLN tenant invitation already exists for this email"
      );
    }

    const { availableNodeIds } = await loadAvailableTenantNodes(parsed.tenantId);
    const nodeSelection = validateTenantNodeSelection(
      availableNodeIds,
      parsed.nodeIds,
      parsed.defaultNodeId
    );

    const now = Date.now();
    const invitation = await createInvitation({
      id: uuidv4(),
      tenantId: parsed.tenantId,
      email: normalizedEmail,
      role: parsed.role,
      status: INVITATION_PENDING_STATUS,
      nodeIds: nodeSelection.desiredNodeIds,
      defaultNodeId: nodeSelection.defaultNodeId,
      invitedByUserId: actor.uid,
      acceptedByUserId: null,
      acceptedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    return {
      invitation: toInvitationDTO(invitation),
    };
  }

  async function acceptTenantInvitation(authContext, params) {
    const actor = requireActor(authContext);
    const parsedParams = invitationParamsSchema.parse(params || {});
    const currentUser = await requireExistingUser(actor.uid);
    const normalizedEmail = normalizeEmail(currentUser.email);

    if (!normalizedEmail) {
      throw createBadRequestError(
        "A verified local email is required to accept a BLN tenant invitation"
      );
    }

    const invitation = await getInvitationById(parsedParams.invitationId);
    if (!invitation || invitation.status !== INVITATION_PENDING_STATUS) {
      throw createNotFoundError("BLN tenant invitation not found");
    }

    if (invitation.email !== normalizedEmail) {
      throw createForbiddenError(
        "The current user cannot accept this BLN tenant invitation"
      );
    }

    const existingMembership = await getTenantMembershipsRepository().getByUserIdAndTenantId(
      actor.uid,
      invitation.tenantId
    );
    if (existingMembership?.status === MEMBERSHIP_ACTIVE_STATUS) {
      throw createConflictError(
        "The current user already has an active BLN tenant membership"
      );
    }

    const { availableNodeIds } = await loadAvailableTenantNodes(invitation.tenantId);
    const nodeSelection = validateTenantNodeSelection(
      availableNodeIds,
      invitation.nodeIds,
      invitation.defaultNodeId
    );

    const existingMemberships = await listMembershipsByUserId(actor.uid);
    const activeMemberships = filterActiveMemberships(existingMemberships);
    const now = Date.now();

    const localResult = await withTransaction(async (client) => {
      const existingAssignments = await listAssignmentsByUserIdAndTenantId(
        actor.uid,
        invitation.tenantId,
        client
      );

      const membership = await persistMembership(
        {
          userId: actor.uid,
          tenantId: invitation.tenantId,
          role: invitation.role,
          status: MEMBERSHIP_ACTIVE_STATUS,
          createdAt: invitation.createdAt || now,
          updatedAt: now,
        },
        client
      );

      for (const assignment of existingAssignments) {
        if (!nodeSelection.desiredNodeIds.includes(assignment.nodeId)) {
          await persistNodeAssignment(
            {
              userId: actor.uid,
              tenantId: invitation.tenantId,
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

      for (const nodeId of nodeSelection.desiredNodeIds) {
        await persistNodeAssignment(
          {
            userId: actor.uid,
            tenantId: invitation.tenantId,
            nodeId,
            isDefault: nodeId === nodeSelection.defaultNodeId,
            status: NODE_ASSIGNMENT_ACTIVE_STATUS,
            createdAt: now,
            updatedAt: now,
          },
          client
        );
      }

      const legacyBinding = normalizeStoredBinding(currentUser.preferences?.bln);
      const shouldUpdateBinding =
        !activeMemberships.length ||
        !legacyBinding ||
        legacyBinding.tenantId === invitation.tenantId;
      if (shouldUpdateBinding) {
        await persistBindingForUser(
          actor.uid,
          {
            tenantId: invitation.tenantId,
            nodeId: nodeSelection.defaultNodeId,
          },
          client
        );
      }

      const acceptedInvitation = await updateInvitationStatus(
        {
          id: invitation.id,
          status: INVITATION_ACCEPTED_STATUS,
          acceptedByUserId: actor.uid,
          acceptedAt: now,
          updatedAt: now,
        },
        client
      );

      const assignments = await listAssignmentsByUserIdAndTenantId(
        actor.uid,
        invitation.tenantId,
        client
      );

      return {
        membership,
        assignments,
        invitation: acceptedInvitation,
      };
    });

    return {
      invitation: toInvitationDTO(localResult.invitation),
      membership: toMembershipDTO(localResult.membership),
      assignments: localResult.assignments.map(toAssignmentDTO).filter(Boolean),
    };
  }

  async function revokeTenantInvitation(authContext, params) {
    const actor = requireActor(authContext);
    requireAdminActor(actor);

    const parsedParams = invitationParamsSchema.parse(params || {});
    const invitation = await getInvitationById(parsedParams.invitationId);

    if (!invitation || invitation.status !== INVITATION_PENDING_STATUS) {
      throw createNotFoundError("BLN tenant invitation not found");
    }

    const revokedInvitation = await updateInvitationStatus({
      id: invitation.id,
      status: INVITATION_REVOKED_STATUS,
      acceptedByUserId: invitation.acceptedByUserId || null,
      acceptedAt: invitation.acceptedAt ?? null,
      updatedAt: Date.now(),
    });

    return {
      invitation: toInvitationDTO(revokedInvitation),
    };
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

    await requireExistingUser(parsedParams.userId);
    await requireTenantIntegration(parsed.tenantId);

    const { availableNodes, availableNodeIds } = await loadAvailableTenantNodes(
      parsed.tenantId
    );
    const nodeSelection = validateTenantNodeSelection(
      availableNodeIds,
      parsed.nodeIds,
      parsed.defaultNodeId,
      { requireNodes: parsed.status === MEMBERSHIP_ACTIVE_STATUS }
    );
    const defaultNodeId =
      parsed.status === MEMBERSHIP_ACTIVE_STATUS
        ? nodeSelection.defaultNodeId
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
          !nodeSelection.desiredNodeIds.includes(assignment.nodeId)
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
        for (const nodeId of nodeSelection.desiredNodeIds) {
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
    requestSelfNodeOtp,
    verifySelfNodeOtp,
    listNetworkNodes,
    createNetworkNode,
    listNetworkInvitations,
    createTenantInvitation,
    acceptTenantInvitation,
    revokeTenantInvitation,
    listTenantUsers,
    upsertTenantUserAccess,
  };
}

function buildUserPhonePayload(existingUser, phoneNumber) {
  return {
    email: existingUser.email || null,
    displayName:
      typeof existingUser.displayName === "string" ? existingUser.displayName : null,
    photoURL:
      typeof existingUser.photoURL === "string" ? existingUser.photoURL : null,
    preferences: {
      ...(existingUser.preferences || {}),
      phoneNumber: normalizePhoneNumber(phoneNumber),
    },
    roles: Array.isArray(existingUser.roles) ? existingUser.roles : [],
    emailVerified: Boolean(existingUser.emailVerified),
    createdAt: existingUser.createdAt,
    updatedAt: Date.now(),
  };
}

module.exports = {
  createNetworkService,
  ...createNetworkService(),
};
