jest.mock("../src/app/users/users.repository", () => ({
  getById: jest.fn(),
  upsert: jest.fn(),
}));

jest.mock("../src/clients/logisticsClient", () => ({
  LogisticsApiError: class LogisticsApiError extends Error {
    constructor(message, options = {}) {
      super(message);
      this.name = "LogisticsApiError";
      this.status = options.status || 500;
    }
  },
  getLogisticsClient: jest.fn(),
}));

const UsersRepository = require("../src/app/users/users.repository");
const {
  LogisticsApiError,
  getLogisticsClient,
} = require("../src/clients/logisticsClient");
const NetworkService = require("../src/app/network/network.service");

describe("network service bridge", () => {
  const baseUser = {
    id: "user-1",
    email: "user@example.com",
    displayName: "User One",
    photoURL: null,
    preferences: {},
    roles: ["user"],
    emailVerified: true,
    createdAt: 100,
    updatedAt: 200,
  };

  let logisticsClient;

  beforeEach(() => {
    UsersRepository.getById.mockReset();
    UsersRepository.upsert.mockReset();
    getLogisticsClient.mockReset();

    logisticsClient = {
      bootstrapTenant: jest.fn(),
      exchangeTenantAccess: jest.fn(),
      listNodes: jest.fn(),
      createNode: jest.fn(),
      getNode: jest.fn(),
    };

    getLogisticsClient.mockReturnValue(logisticsClient);
  });

  test("bootstrapNetwork binds the target user and redacts the upstream api key", async () => {
    UsersRepository.getById.mockResolvedValue(baseUser);
    UsersRepository.upsert.mockImplementation(async (id, payload) => ({
      ...baseUser,
      ...payload,
      id,
    }));
    logisticsClient.bootstrapTenant.mockResolvedValue({
      tenant: { id: "tenant-1", name: "Tenant One", createdAt: 123 },
      node: {
        id: "node-1",
        tenantId: "tenant-1",
        phoneNumber: "+2348000000000",
        trustScore: 0,
        createdAt: 123,
      },
      apiKey: {
        value: "bln_secret_key",
        last4: "1234",
        createdAt: 123,
      },
    });

    const result = await NetworkService.bootstrapNetwork(
      {
        uid: "admin-1",
        email: "admin@example.com",
        isAdmin: true,
      },
      {
        name: "Tenant One",
        firstNode: { phoneNumber: "+2348000000000" },
        bindUserId: "user-1",
      }
    );

    expect(logisticsClient.bootstrapTenant).toHaveBeenCalledWith({
      name: "Tenant One",
      firstNode: {
        phoneNumber: "+2348000000000",
        trustScore: 0,
      },
    });
    expect(UsersRepository.upsert).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        preferences: {
          bln: {
            tenantId: "tenant-1",
            nodeId: "node-1",
          },
        },
      })
    );
    expect(result).toEqual({
      tenant: { id: "tenant-1", name: "Tenant One", createdAt: 123 },
      node: {
        id: "node-1",
        tenantId: "tenant-1",
        phoneNumber: "+2348000000000",
        trustScore: 0,
        createdAt: 123,
      },
      binding: {
        userId: "user-1",
        tenantId: "tenant-1",
        nodeId: "node-1",
      },
      apiKey: {
        last4: "1234",
        createdAt: 123,
      },
    });
  });

  test("getNetworkContext returns an unbound issue when the current user has no BLN binding", async () => {
    UsersRepository.getById.mockResolvedValue(baseUser);

    const result = await NetworkService.getNetworkContext(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      {}
    );

    expect(result).toEqual({
      actor: {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      binding: null,
      effectiveContext: null,
      tenant: null,
      node: null,
      issues: [
        {
          code: "BLN_CONTEXT_UNBOUND",
          message: "No BLN tenant binding is configured for the current user",
        },
      ],
    });
    expect(logisticsClient.exchangeTenantAccess).not.toHaveBeenCalled();
  });

  test("getNetworkContext reports a stale tenant binding without hard-failing the route", async () => {
    UsersRepository.getById.mockResolvedValue({
      ...baseUser,
      preferences: {
        bln: {
          tenantId: "tenant-missing",
          nodeId: "node-1",
        },
      },
    });
    logisticsClient.exchangeTenantAccess.mockRejectedValue(
      new LogisticsApiError("Tenant not found", { status: 404 })
    );

    const result = await NetworkService.getNetworkContext(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      {}
    );

    expect(result).toEqual({
      actor: {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      binding: {
        userId: "user-1",
        tenantId: "tenant-missing",
        nodeId: "node-1",
      },
      effectiveContext: {
        tenantId: "tenant-missing",
        nodeId: "node-1",
      },
      tenant: null,
      node: null,
      issues: [
        {
          code: "BLN_TENANT_NOT_FOUND",
          message: "The resolved BLN tenant no longer exists",
        },
      ],
    });
  });

  test("listNetworkNodes uses an exchanged tenant token for non-admin callers", async () => {
    UsersRepository.getById.mockResolvedValue({
      ...baseUser,
      preferences: {
        bln: {
          tenantId: "tenant-1",
          nodeId: "node-1",
        },
      },
    });
    logisticsClient.exchangeTenantAccess.mockResolvedValue({
      accessToken: "tenant-access-token",
      tenant: { id: "tenant-1", name: "Tenant One" },
    });
    logisticsClient.listNodes.mockResolvedValue({
      items: [{ id: "node-1" }, { id: "node-2" }],
    });

    const result = await NetworkService.listNetworkNodes(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      {}
    );

    expect(logisticsClient.exchangeTenantAccess).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      subject: "user-1",
      email: "user@example.com",
    });
    expect(logisticsClient.listNodes).toHaveBeenCalledWith({
      tenantCredential: "tenant-access-token",
    });
    expect(result).toEqual({
      tenantId: "tenant-1",
      items: [{ id: "node-1" }, { id: "node-2" }],
    });
  });

  test("createNetworkNode lets admins use service access with an explicit tenant id", async () => {
    UsersRepository.getById.mockResolvedValue({
      ...baseUser,
      id: "admin-1",
      roles: ["admin"],
    });
    logisticsClient.createNode.mockResolvedValue({
      node: {
        id: "node-2",
        tenantId: "tenant-2",
        phoneNumber: "+2348111111111",
        trustScore: 5,
        createdAt: 999,
      },
    });

    const result = await NetworkService.createNetworkNode(
      {
        uid: "admin-1",
        email: "admin@example.com",
        isAdmin: true,
      },
      {
        tenantId: "tenant-2",
        phoneNumber: "+2348111111111",
        trustScore: 5,
      }
    );

    expect(logisticsClient.createNode).toHaveBeenCalledWith({
      payload: {
        tenantId: "tenant-2",
        phoneNumber: "+2348111111111",
        trustScore: 5,
      },
    });
    expect(result).toEqual({
      node: {
        id: "node-2",
        tenantId: "tenant-2",
        phoneNumber: "+2348111111111",
        trustScore: 5,
        createdAt: 999,
      },
    });
  });
});
