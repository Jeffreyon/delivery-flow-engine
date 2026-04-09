jest.mock("../src/clients/logisticsClient", () => ({
  getLogisticsClient: jest.fn(),
}));

const { getLogisticsClient } = require("../src/clients/logisticsClient");
const { createHandoffsService } = require("../src/app/handoffs/handoffs.service");

describe("remote handoffs facade service", () => {
  let logisticsClient;
  let networkService;
  let HandoffsService;

  beforeEach(() => {
    getLogisticsClient.mockReset();

    logisticsClient = {
      getHandoffStatus: jest.fn(),
      listHandoffs: jest.fn(),
      getHandoff: jest.fn(),
      initiateHandoff: jest.fn(),
      retryHandoff: jest.fn(),
      verifyHandoff: jest.fn(),
      disputeHandoff: jest.fn(),
      resolveHandoff: jest.fn(),
    };

    networkService = {
      resolveTenantAccess: jest.fn(),
      resolveAdminTenantAccess: jest.fn(),
    };

    getLogisticsClient.mockReturnValue(logisticsClient);
    HandoffsService = createHandoffsService({
      logisticsClient,
      networkService,
    });
  });

  test("getDeliveryHandoffStatus resolves tenant access and forwards the delivery id", async () => {
    networkService.resolveTenantAccess.mockResolvedValue({
      tenantId: "tenant-2",
      tenantCredential: "tenant-token-2",
    });
    logisticsClient.getHandoffStatus.mockResolvedValue({
      delivery: { id: "delivery-9", status: "IN_TRANSIT" },
      handoff: null,
    });

    const result = await HandoffsService.getDeliveryHandoffStatus(
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
        nodeId: null,
      }
    );
    expect(logisticsClient.getHandoffStatus).toHaveBeenCalledWith({
      deliveryId: "delivery-9",
      tenantCredential: "tenant-token-2",
    });
    expect(result).toEqual({
      delivery: { id: "delivery-9", status: "IN_TRANSIT" },
      handoff: null,
    });
  });

  test("listHandoffs uses the resolved tenant context and requires a delivery id", async () => {
    networkService.resolveTenantAccess.mockResolvedValue({
      tenantId: "tenant-1",
      tenantCredential: "tenant-token",
    });
    logisticsClient.listHandoffs.mockResolvedValue({
      items: [{ id: "handoff-1" }],
    });

    const result = await HandoffsService.listHandoffs(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      {
        deliveryId: "delivery-1",
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
        nodeId: null,
      }
    );
    expect(logisticsClient.listHandoffs).toHaveBeenCalledWith({
      deliveryId: "delivery-1",
      tenantCredential: "tenant-token",
    });
    expect(result).toEqual({
      items: [{ id: "handoff-1" }],
    });
  });

  test("initiateHandoff forwards the upstream payload and idempotency key", async () => {
    networkService.resolveTenantAccess.mockResolvedValue({
      tenantId: "tenant-1",
      tenantCredential: "tenant-token",
    });
    logisticsClient.initiateHandoff.mockResolvedValue({
      handoff: { id: "handoff-1", status: "REQUESTED" },
    });

    const result = await HandoffsService.initiateHandoff(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      {
        deliveryId: "delivery-1",
        fromNodeId: "node-a",
        toTenantId: "tenant-2",
        toNodeId: "node-b",
      },
      {
        idempotencyKey: "idem-1",
      }
    );

    expect(logisticsClient.initiateHandoff).toHaveBeenCalledWith({
      payload: {
        deliveryId: "delivery-1",
        fromNodeId: "node-a",
        toTenantId: "tenant-2",
        toNodeId: "node-b",
      },
      tenantCredential: "tenant-token",
      idempotencyKey: "idem-1",
    });
    expect(result).toEqual({
      handoff: { id: "handoff-1", status: "REQUESTED" },
    });
  });

  test("resolveHandoff remains admin-only even before the controller gate", async () => {
    await expect(
      HandoffsService.resolveHandoff(
        {
          uid: "user-1",
          email: "user@example.com",
          isAdmin: false,
        },
        {
          id: "handoff-1",
        },
        {
          resolution: "CONFIRMED",
        }
      )
    ).rejects.toMatchObject({
      status: 403,
      message: "Admin privileges required",
    });

    expect(networkService.resolveTenantAccess).not.toHaveBeenCalled();
    expect(networkService.resolveAdminTenantAccess).not.toHaveBeenCalled();
    expect(logisticsClient.resolveHandoff).not.toHaveBeenCalled();
  });

  test("resolveHandoff forwards the selected tenant and resolution for admins", async () => {
    networkService.resolveAdminTenantAccess.mockResolvedValue({
      tenantId: "tenant-2",
      tenantCredential: "tenant-token-2",
    });
    logisticsClient.resolveHandoff.mockResolvedValue({
      handoff: { id: "handoff-1", status: "COMPLETED" },
    });

    const result = await HandoffsService.resolveHandoff(
      {
        uid: "admin-1",
        email: "admin@example.com",
        isAdmin: true,
      },
      {
        id: "handoff-1",
      },
      {
        tenantId: "tenant-2",
        resolution: "CONFIRMED",
      },
      {
        idempotencyKey: "idem-2",
      }
    );

    expect(networkService.resolveAdminTenantAccess).toHaveBeenCalledWith(
      {
        uid: "admin-1",
        email: "admin@example.com",
        isAdmin: true,
      },
      {
        tenantId: "tenant-2",
      }
    );
    expect(logisticsClient.resolveHandoff).toHaveBeenCalledWith({
      id: "handoff-1",
      payload: {
        resolution: "CONFIRMED",
      },
      tenantCredential: "tenant-token-2",
      idempotencyKey: "idem-2",
    });
    expect(result).toEqual({
      handoff: { id: "handoff-1", status: "COMPLETED" },
    });
  });
});
