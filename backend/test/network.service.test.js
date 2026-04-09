jest.mock("../src/core/db/postgres", () => ({
  withTransaction: jest.fn(async (callback) => callback({ query: jest.fn() })),
}));

const { createNetworkService } = require("../src/app/network/network.service");
const { LogisticsApiError } = require("../src/clients/logisticsClient");

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

  let usersRepository;
  let tenantIntegrationsRepository;
  let tenantMembershipsRepository;
  let nodeAssignmentsRepository;
  let logisticsClient;
  let tenantApiKeyCipher;
  let NetworkService;

  beforeEach(() => {
    usersRepository = {
      getById: jest.fn(),
      listByIds: jest.fn(),
      upsert: jest.fn(),
    };
    tenantIntegrationsRepository = {
      getByTenantId: jest.fn(),
      upsert: jest.fn(),
    };
    tenantMembershipsRepository = {
      listByUserId: jest.fn(),
      listByTenantId: jest.fn(),
      upsert: jest.fn(),
    };
    nodeAssignmentsRepository = {
      listByUserIdAndTenantId: jest.fn(),
      listByTenantId: jest.fn(),
      upsert: jest.fn(),
    };
    logisticsClient = {
      bootstrapTenant: jest.fn(),
      createNodeSession: jest.fn(),
      listNodes: jest.fn(),
      createNode: jest.fn(),
      exchangeTenantAccess: jest.fn(),
    };
    tenantApiKeyCipher = {
      encryptTenantApiKey: jest.fn(),
      decryptTenantApiKey: jest.fn(),
    };

    NetworkService = createNetworkService({
      usersRepository,
      tenantIntegrationsRepository,
      tenantMembershipsRepository,
      nodeAssignmentsRepository,
      logisticsClient,
      tenantApiKeyCipher,
    });
  });

  test("bootstrapNetwork stores a tenant integration, membership, assignment, and redacts the API key", async () => {
    usersRepository.getById.mockResolvedValue(baseUser);
    usersRepository.upsert.mockImplementation(async (id, payload) => ({
      ...baseUser,
      ...payload,
      id,
    }));
    tenantIntegrationsRepository.upsert.mockResolvedValue({
      tenantId: "tenant-1",
      apiKeyEncrypted: "enc-key",
      apiKeyLast4: "1234",
      status: "ACTIVE",
      createdAt: 123,
      updatedAt: 123,
    });
    tenantMembershipsRepository.upsert.mockResolvedValue({
      userId: "user-1",
      tenantId: "tenant-1",
      role: "OWNER",
      status: "ACTIVE",
      createdAt: 123,
      updatedAt: 123,
    });
    nodeAssignmentsRepository.upsert.mockResolvedValue({
      userId: "user-1",
      tenantId: "tenant-1",
      nodeId: "node-1",
      isDefault: true,
      status: "ACTIVE",
      createdAt: 123,
      updatedAt: 123,
    });
    tenantApiKeyCipher.encryptTenantApiKey.mockReturnValue("enc-key");
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
    expect(tenantIntegrationsRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        apiKeyEncrypted: "enc-key",
        apiKeyLast4: "1234",
        status: "ACTIVE",
      })
    );
    expect(tenantMembershipsRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        tenantId: "tenant-1",
        role: "OWNER",
        status: "ACTIVE",
      })
    );
    expect(nodeAssignmentsRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        tenantId: "tenant-1",
        nodeId: "node-1",
        isDefault: true,
        status: "ACTIVE",
      })
    );
    expect(usersRepository.upsert).toHaveBeenCalledWith(
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
        role: "OWNER",
      },
      membership: {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "OWNER",
        status: "ACTIVE",
      },
      assignment: {
        userId: "user-1",
        tenantId: "tenant-1",
        nodeId: "node-1",
        isDefault: true,
        status: "ACTIVE",
      },
      apiKey: {
        last4: "1234",
        createdAt: 123,
      },
    });
  });

  test("getNetworkContext returns an unbound issue when the current user has no active membership", async () => {
    usersRepository.getById.mockResolvedValue(baseUser);
    tenantMembershipsRepository.listByUserId.mockResolvedValue([]);

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
      memberships: [],
      assignments: [],
      effectiveContext: null,
      tenant: null,
      node: null,
      issues: [
        {
          code: "BLN_CONTEXT_UNBOUND",
          message: "No BLN tenant membership is configured for the current user",
        },
      ],
    });
    expect(logisticsClient.createNodeSession).not.toHaveBeenCalled();
  });

  test("getNetworkContext returns a tenant selection issue when the current user belongs to multiple BLN tenants", async () => {
    usersRepository.getById.mockResolvedValue(baseUser);
    tenantMembershipsRepository.listByUserId.mockResolvedValue([
      {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "OWNER",
        status: "ACTIVE",
      },
      {
        userId: "user-1",
        tenantId: "tenant-2",
        role: "MEMBER",
        status: "ACTIVE",
      },
    ]);

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
      memberships: [
        {
          userId: "user-1",
          tenantId: "tenant-1",
          role: "OWNER",
          status: "ACTIVE",
        },
        {
          userId: "user-1",
          tenantId: "tenant-2",
          role: "MEMBER",
          status: "ACTIVE",
        },
      ],
      assignments: [],
      effectiveContext: null,
      tenant: null,
      node: null,
      issues: [
        {
          code: "BLN_TENANT_SELECTION_REQUIRED",
          message:
            "tenantId is required when the current user belongs to multiple BLN tenants",
        },
      ],
    });
  });

  test("getNetworkContext reports an invalid stored tenant API key without hard-failing the route", async () => {
    usersRepository.getById.mockResolvedValue({
      ...baseUser,
      preferences: {
        bln: {
          tenantId: "tenant-1",
          nodeId: "node-2",
        },
      },
    });
    tenantMembershipsRepository.listByUserId.mockResolvedValue([
      {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "OWNER",
        status: "ACTIVE",
      },
    ]);
    nodeAssignmentsRepository.listByUserIdAndTenantId.mockResolvedValue([
      {
        userId: "user-1",
        tenantId: "tenant-1",
        nodeId: "node-2",
        isDefault: false,
        status: "ACTIVE",
      },
    ]);
    tenantIntegrationsRepository.getByTenantId.mockResolvedValue({
      tenantId: "tenant-1",
      apiKeyEncrypted: "enc-key",
      apiKeyLast4: "1234",
      status: "ACTIVE",
    });
    tenantApiKeyCipher.decryptTenantApiKey.mockReturnValue("plain-api-key");
    logisticsClient.createNodeSession.mockRejectedValue(
      new LogisticsApiError("Invalid tenant API key", { status: 401 })
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
        tenantId: "tenant-1",
        role: "OWNER",
        nodeId: "node-2",
        status: "ACTIVE",
        isDefaultNode: false,
      },
      memberships: [
        {
          userId: "user-1",
          tenantId: "tenant-1",
          role: "OWNER",
          status: "ACTIVE",
        },
      ],
      assignments: [
        {
          userId: "user-1",
          tenantId: "tenant-1",
          nodeId: "node-2",
          isDefault: false,
          status: "ACTIVE",
        },
      ],
      effectiveContext: {
        tenantId: "tenant-1",
        nodeId: "node-2",
      },
      tenant: null,
      node: null,
      issues: [
        {
          code: "BLN_TENANT_API_KEY_INVALID",
          message: "The stored BLN tenant API key is no longer valid",
        },
      ],
    });
  });

  test("resolveTenantAccess mints a backend-only node session from the stored tenant integration and selected assignment", async () => {
    usersRepository.getById.mockResolvedValue(baseUser);
    tenantMembershipsRepository.listByUserId.mockResolvedValue([
      {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "OWNER",
        status: "ACTIVE",
      },
    ]);
    nodeAssignmentsRepository.listByUserIdAndTenantId.mockResolvedValue([
      {
        userId: "user-1",
        tenantId: "tenant-1",
        nodeId: "node-1",
        isDefault: true,
        status: "ACTIVE",
      },
      {
        userId: "user-1",
        tenantId: "tenant-1",
        nodeId: "node-2",
        isDefault: false,
        status: "ACTIVE",
      },
    ]);
    tenantIntegrationsRepository.getByTenantId.mockResolvedValue({
      tenantId: "tenant-1",
      apiKeyEncrypted: "enc-key",
      apiKeyLast4: "1234",
      status: "ACTIVE",
      createdAt: 123,
      updatedAt: 123,
    });
    tenantApiKeyCipher.decryptTenantApiKey.mockReturnValue("plain-api-key");
    logisticsClient.createNodeSession.mockResolvedValue({
      accessToken: "node-session-token",
      tenant: { id: "tenant-1", name: "Tenant One" },
      node: { id: "node-2", tenantId: "tenant-1" },
    });

    const result = await NetworkService.resolveTenantAccess(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      {
        tenantId: "tenant-1",
        nodeId: "node-2",
      }
    );

    expect(logisticsClient.createNodeSession).toHaveBeenCalledWith({
      apiKey: "plain-api-key",
      payload: {
        nodeId: "node-2",
        subject: "user-1",
        email: "user@example.com",
      },
    });
    expect(result).toEqual({
      actor: {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      currentUser: baseUser,
      membership: {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "OWNER",
        status: "ACTIVE",
      },
      assignment: {
        userId: "user-1",
        tenantId: "tenant-1",
        nodeId: "node-2",
        isDefault: false,
        status: "ACTIVE",
      },
      tenantId: "tenant-1",
      nodeId: "node-2",
      tenant: { id: "tenant-1", name: "Tenant One" },
      node: { id: "node-2", tenantId: "tenant-1" },
      tenantCredential: "node-session-token",
    });
  });

  test("listNetworkNodes returns all tenant nodes for membership-scoped callers and records the active node", async () => {
    usersRepository.getById.mockResolvedValue({
      ...baseUser,
      preferences: {
        bln: {
          tenantId: "tenant-1",
          nodeId: "node-1",
        },
      },
    });
    tenantMembershipsRepository.listByUserId.mockResolvedValue([
      {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "OWNER",
        status: "ACTIVE",
      },
    ]);
    nodeAssignmentsRepository.listByUserIdAndTenantId.mockResolvedValue([
      {
        userId: "user-1",
        tenantId: "tenant-1",
        nodeId: "node-1",
        isDefault: true,
        status: "ACTIVE",
      },
    ]);
    tenantIntegrationsRepository.getByTenantId.mockResolvedValue({
      tenantId: "tenant-1",
      apiKeyEncrypted: "enc-key",
      apiKeyLast4: "1234",
      status: "ACTIVE",
    });
    tenantApiKeyCipher.decryptTenantApiKey.mockReturnValue("plain-api-key");
    logisticsClient.createNodeSession.mockResolvedValue({
      accessToken: "node-session-token",
      tenant: { id: "tenant-1", name: "Tenant One" },
      node: { id: "node-1", tenantId: "tenant-1" },
    });
    logisticsClient.listNodes.mockResolvedValue({
      items: [
        { id: "node-1", tenantId: "tenant-1", phoneNumber: "+2348000000000" },
        { id: "node-2", tenantId: "tenant-1", phoneNumber: "+2348111111111" },
      ],
    });

    const result = await NetworkService.listNetworkNodes(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      {}
    );

    expect(logisticsClient.listNodes).toHaveBeenCalledWith({
      tenantCredential: "node-session-token",
    });
    expect(result).toEqual({
      tenantId: "tenant-1",
      activeNodeId: "node-1",
      items: [
        { id: "node-1", tenantId: "tenant-1", phoneNumber: "+2348000000000" },
        { id: "node-2", tenantId: "tenant-1", phoneNumber: "+2348111111111" },
      ],
    });
  });

  test("createNetworkNode remains an admin-only support path", async () => {
    await expect(
      NetworkService.createNetworkNode(
        {
          uid: "user-1",
          email: "user@example.com",
          isAdmin: false,
        },
        {
          tenantId: "tenant-1",
          phoneNumber: "+2348111111111",
        }
      )
    ).rejects.toMatchObject({
      status: 403,
      message: "Node creation is restricted to admin support flows",
    });

    expect(logisticsClient.createNode).not.toHaveBeenCalled();
  });

  test("listTenantUsers returns tenant members, assignments, and available nodes for admins", async () => {
    tenantIntegrationsRepository.getByTenantId.mockResolvedValue({
      tenantId: "tenant-1",
      apiKeyEncrypted: "enc-key",
      apiKeyLast4: "1234",
      status: "ACTIVE",
    });
    tenantMembershipsRepository.listByTenantId.mockResolvedValue([
      {
        userId: "user-2",
        tenantId: "tenant-1",
        role: "ADMIN",
        status: "ACTIVE",
      },
      {
        userId: "user-3",
        tenantId: "tenant-1",
        role: "MEMBER",
        status: "INACTIVE",
      },
    ]);
    nodeAssignmentsRepository.listByTenantId.mockResolvedValue([
      {
        userId: "user-2",
        tenantId: "tenant-1",
        nodeId: "node-1",
        isDefault: true,
        status: "ACTIVE",
      },
      {
        userId: "user-3",
        tenantId: "tenant-1",
        nodeId: "node-2",
        isDefault: false,
        status: "INACTIVE",
      },
    ]);
    usersRepository.listByIds.mockResolvedValue([
      {
        id: "user-2",
        email: "admin@example.com",
        displayName: "Admin User",
        roles: ["admin"],
        emailVerified: true,
      },
      {
        id: "user-3",
        email: "member@example.com",
        displayName: "Member User",
        roles: ["user"],
        emailVerified: false,
      },
    ]);
    logisticsClient.listNodes.mockResolvedValue({
      items: [
        { id: "node-1", tenantId: "tenant-1", phoneNumber: "+2348000000000" },
        { id: "node-2", tenantId: "tenant-1", phoneNumber: "+2348111111111" },
      ],
    });

    const result = await NetworkService.listTenantUsers(
      {
        uid: "admin-1",
        email: "admin@example.com",
        isAdmin: true,
      },
      {
        tenantId: "tenant-1",
      }
    );

    expect(logisticsClient.listNodes).toHaveBeenCalledWith({
      tenantId: "tenant-1",
    });
    expect(result).toEqual({
      tenantId: "tenant-1",
      availableNodes: [
        { id: "node-1", tenantId: "tenant-1", phoneNumber: "+2348000000000" },
        { id: "node-2", tenantId: "tenant-1", phoneNumber: "+2348111111111" },
      ],
      items: [
        {
          user: {
            id: "user-2",
            displayName: "Admin User",
            email: "admin@example.com",
            photoURL: null,
            roles: ["admin"],
            emailVerified: true,
          },
          membership: {
            userId: "user-2",
            tenantId: "tenant-1",
            role: "ADMIN",
            status: "ACTIVE",
          },
          assignments: [
            {
              userId: "user-2",
              tenantId: "tenant-1",
              nodeId: "node-1",
              isDefault: true,
              status: "ACTIVE",
            },
          ],
        },
        {
          user: {
            id: "user-3",
            displayName: "Member User",
            email: "member@example.com",
            photoURL: null,
            roles: ["user"],
            emailVerified: false,
          },
          membership: {
            userId: "user-3",
            tenantId: "tenant-1",
            role: "MEMBER",
            status: "INACTIVE",
          },
          assignments: [
            {
              userId: "user-3",
              tenantId: "tenant-1",
              nodeId: "node-2",
              isDefault: false,
              status: "INACTIVE",
            },
          ],
        },
      ],
    });
  });

  test("upsertTenantUserAccess stores membership and node assignments for admins", async () => {
    const targetUser = {
      ...baseUser,
      id: "user-2",
      email: "member@example.com",
    };
    usersRepository.getById.mockResolvedValue(targetUser);
    usersRepository.upsert.mockImplementation(async (id, payload) => ({
      ...targetUser,
      ...payload,
      id,
    }));
    tenantIntegrationsRepository.getByTenantId.mockResolvedValue({
      tenantId: "tenant-1",
      apiKeyEncrypted: "enc-key",
      apiKeyLast4: "1234",
      status: "ACTIVE",
    });
    nodeAssignmentsRepository.listByUserIdAndTenantId
      .mockResolvedValueOnce([
        {
          userId: "user-2",
          tenantId: "tenant-1",
          nodeId: "node-old",
          isDefault: true,
          status: "ACTIVE",
        },
      ])
      .mockResolvedValueOnce([
        {
          userId: "user-2",
          tenantId: "tenant-1",
          nodeId: "node-old",
          isDefault: false,
          status: "INACTIVE",
        },
        {
          userId: "user-2",
          tenantId: "tenant-1",
          nodeId: "node-1",
          isDefault: true,
          status: "ACTIVE",
        },
        {
          userId: "user-2",
          tenantId: "tenant-1",
          nodeId: "node-2",
          isDefault: false,
          status: "ACTIVE",
        },
      ]);
    tenantMembershipsRepository.upsert.mockResolvedValue({
      userId: "user-2",
      tenantId: "tenant-1",
      role: "MEMBER",
      status: "ACTIVE",
      createdAt: 123,
      updatedAt: 123,
    });
    nodeAssignmentsRepository.upsert
      .mockResolvedValueOnce({
        userId: "user-2",
        tenantId: "tenant-1",
        nodeId: "node-old",
        isDefault: false,
        status: "INACTIVE",
        createdAt: 123,
        updatedAt: 123,
      })
      .mockResolvedValueOnce({
        userId: "user-2",
        tenantId: "tenant-1",
        nodeId: "node-1",
        isDefault: true,
        status: "ACTIVE",
        createdAt: 123,
        updatedAt: 123,
      })
      .mockResolvedValueOnce({
        userId: "user-2",
        tenantId: "tenant-1",
        nodeId: "node-2",
        isDefault: false,
        status: "ACTIVE",
        createdAt: 123,
        updatedAt: 123,
      });
    logisticsClient.listNodes.mockResolvedValue({
      items: [
        { id: "node-1", tenantId: "tenant-1", phoneNumber: "+2348000000000" },
        { id: "node-2", tenantId: "tenant-1", phoneNumber: "+2348111111111" },
      ],
    });

    const result = await NetworkService.upsertTenantUserAccess(
      {
        uid: "admin-1",
        email: "admin@example.com",
        isAdmin: true,
      },
      {
        userId: "user-2",
      },
      {
        tenantId: "tenant-1",
        role: "MEMBER",
        status: "ACTIVE",
        nodeIds: ["node-1", "node-2"],
        defaultNodeId: "node-1",
      }
    );

    expect(tenantMembershipsRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-2",
        tenantId: "tenant-1",
        role: "MEMBER",
        status: "ACTIVE",
      })
    );
    expect(nodeAssignmentsRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-2",
        tenantId: "tenant-1",
        nodeId: "node-old",
        status: "INACTIVE",
        isDefault: false,
      })
    );
    expect(nodeAssignmentsRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-2",
        tenantId: "tenant-1",
        nodeId: "node-1",
        status: "ACTIVE",
        isDefault: true,
      })
    );
    expect(nodeAssignmentsRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-2",
        tenantId: "tenant-1",
        nodeId: "node-2",
        status: "ACTIVE",
        isDefault: false,
      })
    );
    expect(usersRepository.upsert).toHaveBeenCalledWith(
      "user-2",
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
      tenantId: "tenant-1",
      availableNodes: [
        { id: "node-1", tenantId: "tenant-1", phoneNumber: "+2348000000000" },
        { id: "node-2", tenantId: "tenant-1", phoneNumber: "+2348111111111" },
      ],
      user: {
        id: "user-2",
        displayName: "User One",
        email: "member@example.com",
        photoURL: null,
        roles: ["user"],
        emailVerified: true,
      },
      membership: {
        userId: "user-2",
        tenantId: "tenant-1",
        role: "MEMBER",
        status: "ACTIVE",
      },
      assignments: [
        {
          userId: "user-2",
          tenantId: "tenant-1",
          nodeId: "node-old",
          isDefault: false,
          status: "INACTIVE",
        },
        {
          userId: "user-2",
          tenantId: "tenant-1",
          nodeId: "node-1",
          isDefault: true,
          status: "ACTIVE",
        },
        {
          userId: "user-2",
          tenantId: "tenant-1",
          nodeId: "node-2",
          isDefault: false,
          status: "ACTIVE",
        },
      ],
    });
  });
});
