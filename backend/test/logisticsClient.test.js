const {
  DEFAULT_LOGISTICS_API_TIMEOUT_MS,
  getLogisticsApiConfig,
} = require("../src/config/logisticsApi");
const {
  LogisticsApiError,
  createLogisticsClient,
  getLogisticsClient,
} = require("../src/clients/logisticsClient");

function createMockResponse({ status = 200, body = null, contentType } = {}) {
  const resolvedContentType =
    contentType || (body === null ? "text/plain" : "application/json");
  const rawBody =
    body === null
      ? ""
      : resolvedContentType.includes("application/json")
      ? JSON.stringify(body)
      : String(body);

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return name.toLowerCase() === "content-type" ? resolvedContentType : null;
      },
    },
    text: jest.fn().mockResolvedValue(rawBody),
  };
}

describe("logistics-api client foundation", () => {
  test("normalizes the env contract and applies the default timeout", () => {
    expect(
      getLogisticsApiConfig({
        LOGISTICS_API_URL: " https://example.com/api/ ",
        LOGISTICS_API_SERVICE_SECRET: " service-secret ",
      })
    ).toEqual({
      baseUrl: "https://example.com/api",
      serviceSecret: "service-secret",
      timeoutMs: DEFAULT_LOGISTICS_API_TIMEOUT_MS,
    });
  });

  test("throws when the env contract is incomplete", () => {
    expect(() =>
      getLogisticsApiConfig({
        LOGISTICS_API_URL: "https://example.com",
        LOGISTICS_API_SERVICE_SECRET: "",
      })
    ).toThrow("LOGISTICS_API_SERVICE_SECRET is required");
  });

  test("uses service auth for bootstrap requests", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      createMockResponse({
        status: 201,
        body: { tenant: { id: "tenant-1" }, node: { id: "node-1" }, apiKey: "key" },
      })
    );
    const client = createLogisticsClient({
      baseUrl: "https://logistics.example.com",
      serviceSecret: "svc-secret",
      fetchImpl,
      timeoutMs: 2500,
    });

    const result = await client.bootstrapTenant({
      name: "Tenant A",
      firstNode: { name: "Node A", phoneNumber: "+2348000000000" },
    });

    expect(result).toEqual({
      tenant: { id: "tenant-1" },
      node: { id: "node-1" },
      apiKey: "key",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://logistics.example.com/api/tenants/bootstrap",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Tenant A",
          firstNode: { name: "Node A", phoneNumber: "+2348000000000" },
        }),
        headers: expect.objectContaining({
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-delivery-backend-secret": "svc-secret",
        }),
      })
    );
  });

  test("uses tenant auth, query params, and idempotency headers for delivery requests", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(
        createMockResponse({
          status: 201,
          body: { id: "delivery-1", status: "PENDING" },
        })
      )
      .mockResolvedValueOnce(
        createMockResponse({
          status: 200,
          body: { items: [], nextCursor: "cursor-2" },
        })
      );
    const client = createLogisticsClient({
      baseUrl: "https://logistics.example.com/",
      serviceSecret: "svc-secret",
      fetchImpl,
    });

    await client.createDelivery({
      tenantCredential: "tenant-token",
      idempotencyKey: "idem-1",
      payload: { externalId: "ext-1", metadata: { priority: "high" } },
    });
    await client.listDeliveries({
      tenantCredential: "tenant-token",
      query: { status: "IN_TRANSIT", limit: 25, cursor: "abc==" },
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://logistics.example.com/api/deliveries",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer tenant-token",
          "Content-Type": "application/json",
          "Idempotency-Key": "idem-1",
        }),
      })
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://logistics.example.com/api/deliveries?status=IN_TRANSIT&limit=25&cursor=abc%3D%3D",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer tenant-token",
          Accept: "application/json",
        }),
      })
    );
  });

  test("falls back to service auth for admin-style node reads", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      createMockResponse({
        status: 200,
        body: { items: [{ id: "node-1" }] },
      })
    );
    const client = createLogisticsClient({
      baseUrl: "https://logistics.example.com",
      serviceSecret: "svc-secret",
      fetchImpl,
    });

    const result = await client.listNodes({ tenantId: "tenant-1" });

    expect(result).toEqual({ items: [{ id: "node-1" }] });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://logistics.example.com/api/nodes?tenantId=tenant-1",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "x-delivery-backend-secret": "svc-secret",
        }),
      })
    );
  });

  test("uses a tenant API key to mint a node session", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      createMockResponse({
        status: 201,
        body: {
          accessToken: "node-session-token",
          tokenType: "Bearer",
          tenant: { id: "tenant-1" },
          node: { id: "node-1" },
        },
      })
    );
    const client = createLogisticsClient({
      baseUrl: "https://logistics.example.com",
      serviceSecret: "svc-secret",
      fetchImpl,
    });

    const result = await client.createNodeSession({
      apiKey: "tenant-api-key",
      payload: {
        nodeId: "node-1",
        subject: "user-1",
        email: "user@example.com",
      },
    });

    expect(result).toEqual({
      accessToken: "node-session-token",
      tokenType: "Bearer",
      tenant: { id: "tenant-1" },
      node: { id: "node-1" },
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://logistics.example.com/api/node-auth/session",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer tenant-api-key",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  test("normalizes upstream HTTP errors", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      createMockResponse({
        status: 409,
        body: { message: "Active handoff already exists" },
      })
    );
    const client = createLogisticsClient({
      baseUrl: "https://logistics.example.com",
      serviceSecret: "svc-secret",
      fetchImpl,
    });

    await expect(
      client.initiateHandoff({
        tenantCredential: "tenant-token",
        payload: {
          deliveryId: "delivery-1",
          fromNodeId: "node-a",
          toTenantId: "tenant-b",
          toNodeId: "node-b",
        },
      })
    ).rejects.toMatchObject({
      name: "LogisticsApiError",
      message: "Active handoff already exists",
      status: 409,
      upstreamStatus: 409,
      upstreamBody: { message: "Active handoff already exists" },
      retryable: false,
    });
  });

  test("maps aborted upstream requests to a retryable timeout error", async () => {
    const fetchImpl = jest.fn().mockRejectedValue({ name: "AbortError" });
    const client = createLogisticsClient({
      baseUrl: "https://logistics.example.com",
      serviceSecret: "svc-secret",
      fetchImpl,
      timeoutMs: 1,
    });

    await expect(
      client.exchangeTenantAccess({
        tenantId: "tenant-1",
        subject: "user-1",
        email: "user@example.com",
      })
    ).rejects.toEqual(
      expect.objectContaining({
        name: "LogisticsApiError",
        status: 504,
        code: "LOGISTICS_API_TIMEOUT",
        retryable: true,
      })
    );
  });

  test("builds the default client from process env", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      createMockResponse({
        status: 200,
        body: { tenant: { id: "tenant-1", name: "Tenant A" } },
      })
    );

    const client = getLogisticsClient({
      env: {
        LOGISTICS_API_URL: "https://logistics.example.com",
        LOGISTICS_API_SERVICE_SECRET: "svc-secret",
        LOGISTICS_API_TIMEOUT_MS: "15000",
      },
      fetchImpl,
    });

    const result = await client.getTenantMe({ tenantCredential: "tenant-token" });

    expect(result).toEqual({ tenant: { id: "tenant-1", name: "Tenant A" } });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://logistics.example.com/api/tenants/me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer tenant-token",
        }),
      })
    );
  });

  test("exports the normalized error type", () => {
    const error = new LogisticsApiError("Failed to reach logistics-api", {
      status: 502,
      code: "LOGISTICS_API_UNAVAILABLE",
      retryable: true,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: "LogisticsApiError",
      status: 502,
      code: "LOGISTICS_API_UNAVAILABLE",
      retryable: true,
    });
  });
});
