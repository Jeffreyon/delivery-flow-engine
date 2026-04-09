const { z } = require("zod");
const { getLogisticsClient } = require("../../clients/logisticsClient");

const handoffIdParamsSchema = z
  .object({
    id: z.string().trim().min(1),
  })
  .strict();

const deliveryIdParamsSchema = z
  .object({
    id: z.string().trim().min(1),
  })
  .strict();

const tenantScopedQuerySchema = z
  .object({
    tenantId: z.string().trim().min(1).optional(),
    nodeId: z.string().trim().min(1).optional(),
  })
  .strict();

const listHandoffsQuerySchema = z
  .object({
    deliveryId: z.string().trim().min(1),
    tenantId: z.string().trim().min(1).optional(),
    nodeId: z.string().trim().min(1).optional(),
  })
  .strict();

const initiateHandoffSchema = z
  .object({
    tenantId: z.string().trim().min(1).optional(),
    nodeId: z.string().trim().min(1).optional(),
    deliveryId: z.string().trim().min(1),
    fromNodeId: z.string().trim().min(1),
    toTenantId: z.string().trim().min(1),
    toNodeId: z.string().trim().min(1),
  })
  .strict();

const verifyHandoffSchema = z
  .object({
    tenantId: z.string().trim().min(1).optional(),
    nodeId: z.string().trim().min(1).optional(),
    handoffId: z.string().trim().min(1),
    pin: z.string().trim().regex(/^\d{4,6}$/),
  })
  .strict();

const disputeHandoffSchema = z
  .object({
    tenantId: z.string().trim().min(1).optional(),
    nodeId: z.string().trim().min(1).optional(),
    handoffId: z.string().trim().min(1),
    reason: z.string().trim().min(1).optional(),
  })
  .strict();

const resolveHandoffSchema = z
  .object({
    tenantId: z.string().trim().min(1).optional(),
    nodeId: z.string().trim().min(1).optional(),
    resolution: z.enum(["CONFIRMED", "REJECTED"]),
  })
  .strict();

const retryHandoffSchema = z
  .object({
    tenantId: z.string().trim().min(1).optional(),
    nodeId: z.string().trim().min(1).optional(),
  })
  .strict();

function createForbiddenError(message) {
  const err = new Error(message);
  err.status = 403;
  return err;
}

function stripTenantId(input) {
  const { tenantId, nodeId, ...rest } = input || {};
  return {
    tenantId: tenantId || null,
    nodeId: nodeId || null,
    payload: rest,
  };
}

function createHandoffsService(dependencies = {}) {
  function getClient() {
    return dependencies.logisticsClient || getLogisticsClient();
  }

  function getNetworkService() {
    return dependencies.networkService || require("../network/network.service");
  }

  async function resolveTenantAccess(authContext, tenantId, nodeId) {
    return getNetworkService().resolveTenantAccess(authContext, {
      tenantId,
      nodeId,
    });
  }

  function requireAdmin(authContext) {
    if (!authContext?.isAdmin) {
      throw createForbiddenError("Admin privileges required");
    }
  }

  async function getDeliveryHandoffStatus(authContext, rawParams, rawQuery) {
    const params = deliveryIdParamsSchema.parse(rawParams || {});
    const parsedQuery = tenantScopedQuerySchema.parse(rawQuery || {});
    const { tenantId, nodeId } = stripTenantId(parsedQuery);
    const access = await resolveTenantAccess(authContext, tenantId, nodeId);

    return getClient().getHandoffStatus({
      deliveryId: params.id,
      tenantCredential: access.tenantCredential,
    });
  }

  async function listHandoffs(authContext, rawQuery) {
    const parsed = listHandoffsQuerySchema.parse(rawQuery || {});
    const { tenantId, nodeId, payload } = stripTenantId(parsed);
    const access = await resolveTenantAccess(authContext, tenantId, nodeId);

    return getClient().listHandoffs({
      deliveryId: payload.deliveryId,
      tenantCredential: access.tenantCredential,
    });
  }

  async function getHandoff(authContext, rawParams, rawQuery) {
    const params = handoffIdParamsSchema.parse(rawParams || {});
    const parsedQuery = tenantScopedQuerySchema.parse(rawQuery || {});
    const { tenantId, nodeId } = stripTenantId(parsedQuery);
    const access = await resolveTenantAccess(authContext, tenantId, nodeId);

    return getClient().getHandoff({
      id: params.id,
      tenantCredential: access.tenantCredential,
    });
  }

  async function initiateHandoff(authContext, rawPayload, options = {}) {
    const parsed = initiateHandoffSchema.parse(rawPayload || {});
    const { tenantId, nodeId, payload } = stripTenantId(parsed);
    const access = await resolveTenantAccess(
      authContext,
      tenantId,
      nodeId || payload.fromNodeId
    );

    return getClient().initiateHandoff({
      payload,
      tenantCredential: access.tenantCredential,
      idempotencyKey: options.idempotencyKey,
    });
  }

  async function retryHandoff(authContext, rawParams, rawPayload, options = {}) {
    const params = handoffIdParamsSchema.parse(rawParams || {});
    const parsed = retryHandoffSchema.parse(rawPayload || {});
    const { tenantId, nodeId } = stripTenantId(parsed);
    const access = await resolveTenantAccess(authContext, tenantId, nodeId);

    return getClient().retryHandoff({
      id: params.id,
      tenantCredential: access.tenantCredential,
      idempotencyKey: options.idempotencyKey,
    });
  }

  async function verifyHandoff(authContext, rawPayload, options = {}) {
    const parsed = verifyHandoffSchema.parse(rawPayload || {});
    const { tenantId, nodeId, payload } = stripTenantId(parsed);
    const access = await resolveTenantAccess(authContext, tenantId, nodeId);

    return getClient().verifyHandoff({
      payload,
      tenantCredential: access.tenantCredential,
      idempotencyKey: options.idempotencyKey,
    });
  }

  async function disputeHandoff(authContext, rawPayload, options = {}) {
    const parsed = disputeHandoffSchema.parse(rawPayload || {});
    const { tenantId, nodeId, payload } = stripTenantId(parsed);
    const access = await resolveTenantAccess(authContext, tenantId, nodeId);

    return getClient().disputeHandoff({
      payload,
      tenantCredential: access.tenantCredential,
      idempotencyKey: options.idempotencyKey,
    });
  }

  async function resolveHandoff(authContext, rawParams, rawPayload, options = {}) {
    requireAdmin(authContext);

    const params = handoffIdParamsSchema.parse(rawParams || {});
    const parsed = resolveHandoffSchema.parse(rawPayload || {});
    const { tenantId, payload } = stripTenantId(parsed);
    const access = await getNetworkService().resolveAdminTenantAccess(authContext, {
      tenantId,
    });

    return getClient().resolveHandoff({
      id: params.id,
      payload,
      tenantCredential: access.tenantCredential,
      idempotencyKey: options.idempotencyKey,
    });
  }

  return {
    getDeliveryHandoffStatus,
    listHandoffs,
    getHandoff,
    initiateHandoff,
    retryHandoff,
    verifyHandoff,
    disputeHandoff,
    resolveHandoff,
  };
}

module.exports = {
  createHandoffsService,
  ...createHandoffsService(),
};
