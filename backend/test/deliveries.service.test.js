jest.mock("../src/clients/logisticsClient", () => ({
  getLogisticsClient: jest.fn(),
}));

const { getLogisticsClient } = require("../src/clients/logisticsClient");
const { createDeliveriesService } = require("../src/app/deliveries/deliveries.service");

describe("remote deliveries facade service", () => {
  let logisticsClient;
  let networkService;
  let DeliveriesService;

  beforeEach(() => {
    getLogisticsClient.mockReset();

    logisticsClient = {
      createDelivery: jest.fn(),
      listDeliveries: jest.fn(),
      getDelivery: jest.fn(),
      listDeliveryEvents: jest.fn(),
      createDeliveryEvent: jest.fn(),
    };

    networkService = {
      resolveTenantAccess: jest.fn(),
    };

    getLogisticsClient.mockReturnValue(logisticsClient);
    DeliveriesService = createDeliveriesService({
      logisticsClient,
      networkService,
    });
  });

  test("createDelivery resolves tenant access and forwards the idempotency key", async () => {
    networkService.resolveTenantAccess.mockResolvedValue({
      tenantId: "tenant-1",
      tenantCredential: "tenant-token",
    });
    logisticsClient.createDelivery.mockResolvedValue({
      id: "delivery-1",
      status: "CREATED",
    });

    const result = await DeliveriesService.createDelivery(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: true,
      },
      {
        tenantId: "tenant-1",
        externalId: "order-1",
        metadata: { priority: "high" },
      },
      {
        idempotencyKey: "idem-1",
      }
    );

    expect(networkService.resolveTenantAccess).toHaveBeenCalledWith(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: true,
      },
      {
        tenantId: "tenant-1",
      }
    );
    expect(logisticsClient.createDelivery).toHaveBeenCalledWith({
      payload: {
        externalId: "order-1",
        metadata: { priority: "high" },
      },
      tenantCredential: "tenant-token",
      idempotencyKey: "idem-1",
    });
    expect(result).toEqual({
      id: "delivery-1",
      status: "CREATED",
    });
  });

  test("listDeliveries uses the resolved tenant context and forwards query params", async () => {
    networkService.resolveTenantAccess.mockResolvedValue({
      tenantId: "tenant-1",
      tenantCredential: "tenant-token",
    });
    logisticsClient.listDeliveries.mockResolvedValue({
      items: [{ id: "delivery-1" }],
      nextCursor: "cursor-2",
    });

    const result = await DeliveriesService.listDeliveries(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      {
        status: "IN_TRANSIT",
        limit: "25",
      }
    );

    expect(networkService.resolveTenantAccess).toHaveBeenCalledWith(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      {
        tenantId: null,
      }
    );
    expect(logisticsClient.listDeliveries).toHaveBeenCalledWith({
      tenantCredential: "tenant-token",
      query: {
        status: "IN_TRANSIT",
        limit: "25",
      },
    });
    expect(result).toEqual({
      items: [{ id: "delivery-1" }],
      nextCursor: "cursor-2",
    });
  });

  test("getDelivery requires a path id and uses query tenant selection for admins", async () => {
    networkService.resolveTenantAccess.mockResolvedValue({
      tenantId: "tenant-2",
      tenantCredential: "tenant-token-2",
    });
    logisticsClient.getDelivery.mockResolvedValue({
      id: "delivery-9",
      status: "IN_TRANSIT",
    });

    const result = await DeliveriesService.getDelivery(
      {
        uid: "admin-1",
        email: "admin@example.com",
        isAdmin: true,
      },
      {
        id: "delivery-9",
      },
      {
        tenantId: "tenant-2",
      }
    );

    expect(networkService.resolveTenantAccess).toHaveBeenCalledWith(
      {
        uid: "admin-1",
        email: "admin@example.com",
        isAdmin: true,
      },
      {
        tenantId: "tenant-2",
      }
    );
    expect(logisticsClient.getDelivery).toHaveBeenCalledWith({
      id: "delivery-9",
      tenantCredential: "tenant-token-2",
    });
    expect(result).toEqual({
      id: "delivery-9",
      status: "IN_TRANSIT",
    });
  });

  test("appendDeliveryEvent injects the path deliveryId and forwards idempotency", async () => {
    networkService.resolveTenantAccess.mockResolvedValue({
      tenantId: "tenant-1",
      tenantCredential: "tenant-token",
    });
    logisticsClient.createDeliveryEvent.mockResolvedValue({ success: true });

    const result = await DeliveriesService.appendDeliveryEvent(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      {
        id: "delivery-1",
      },
      {
        type: "DISPATCHED",
        payload: { checkpoint: "hub-a" },
        source: "delivery-flow-engine",
      },
      {
        idempotencyKey: "idem-2",
      }
    );

    expect(logisticsClient.createDeliveryEvent).toHaveBeenCalledWith({
      tenantCredential: "tenant-token",
      idempotencyKey: "idem-2",
      payload: {
        deliveryId: "delivery-1",
        type: "DISPATCHED",
        payload: { checkpoint: "hub-a" },
        source: "delivery-flow-engine",
      },
    });
    expect(result).toEqual({ success: true });
  });
});
