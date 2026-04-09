const { z } = require("zod");
const { getLogisticsClient } = require("../../clients/logisticsClient");

const deliveryIdParamsSchema = z
  .object({
    id: z.string().trim().min(1),
  })
  .strict();

const tenantScopedQuerySchema = z
  .object({
    tenantId: z.string().trim().min(1).optional(),
  })
  .catchall(z.any());

const createDeliverySchema = z
  .object({
    tenantId: z.string().trim().min(1).optional(),
  })
  .catchall(z.any());

const appendDeliveryEventSchema = z
  .object({
    tenantId: z.string().trim().min(1).optional(),
  })
  .catchall(z.any());

function stripTenantId(input) {
  const { tenantId, ...rest } = input || {};
  return {
    tenantId: tenantId || null,
    payload: rest,
  };
}

function createDeliveriesService(dependencies = {}) {
  function getClient() {
    return dependencies.logisticsClient || getLogisticsClient();
  }

  function getNetworkService() {
    return dependencies.networkService || require("../network/network.service");
  }

  async function createDelivery(authContext, rawPayload, options = {}) {
    const parsed = createDeliverySchema.parse(rawPayload || {});
    const { tenantId, payload } = stripTenantId(parsed);
    const access = await getNetworkService().resolveTenantAccess(authContext, {
      tenantId,
    });

    return getClient().createDelivery({
      payload,
      tenantCredential: access.tenantCredential,
      idempotencyKey: options.idempotencyKey,
    });
  }

  async function listDeliveries(authContext, rawQuery) {
    const parsed = tenantScopedQuerySchema.parse(rawQuery || {});
    const { tenantId, payload: query } = stripTenantId(parsed);
    const access = await getNetworkService().resolveTenantAccess(authContext, {
      tenantId,
    });

    return getClient().listDeliveries({
      tenantCredential: access.tenantCredential,
      query,
    });
  }

  async function getDelivery(authContext, rawParams, rawQuery) {
    const params = deliveryIdParamsSchema.parse(rawParams || {});
    const parsedQuery = tenantScopedQuerySchema.parse(rawQuery || {});
    const { tenantId } = stripTenantId(parsedQuery);
    const access = await getNetworkService().resolveTenantAccess(authContext, {
      tenantId,
    });

    return getClient().getDelivery({
      id: params.id,
      tenantCredential: access.tenantCredential,
    });
  }

  async function listDeliveryEvents(authContext, rawParams, rawQuery) {
    const params = deliveryIdParamsSchema.parse(rawParams || {});
    const parsedQuery = tenantScopedQuerySchema.parse(rawQuery || {});
    const { tenantId } = stripTenantId(parsedQuery);
    const access = await getNetworkService().resolveTenantAccess(authContext, {
      tenantId,
    });

    return getClient().listDeliveryEvents({
      deliveryId: params.id,
      tenantCredential: access.tenantCredential,
    });
  }

  async function appendDeliveryEvent(authContext, rawParams, rawPayload, options = {}) {
    const params = deliveryIdParamsSchema.parse(rawParams || {});
    const parsed = appendDeliveryEventSchema.parse(rawPayload || {});
    const { tenantId, payload } = stripTenantId(parsed);
    const access = await getNetworkService().resolveTenantAccess(authContext, {
      tenantId,
    });

    return getClient().createDeliveryEvent({
      tenantCredential: access.tenantCredential,
      idempotencyKey: options.idempotencyKey,
      payload: {
        deliveryId: params.id,
        ...payload,
      },
    });
  }

  return {
    createDelivery,
    listDeliveries,
    getDelivery,
    listDeliveryEvents,
    appendDeliveryEvent,
  };
}

module.exports = {
  createDeliveriesService,
  ...createDeliveriesService(),
};
