const { getLogisticsApiConfig } = require("../config/logisticsApi");

class LogisticsApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "LogisticsApiError";
    this.status = options.status || 500;
    this.upstreamStatus = options.upstreamStatus || null;
    this.upstreamBody = options.upstreamBody ?? null;
    this.code = options.code || null;
    this.retryable = Boolean(options.retryable);
    this.cause = options.cause;
  }
}

function buildQueryString(query = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null || item === "") {
          continue;
        }

        params.append(key, String(item));
      }
      continue;
    }

    params.set(key, String(value));
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function inferMessage(body, fallback) {
  if (!body) {
    return fallback;
  }

  if (typeof body === "string") {
    return body || fallback;
  }

  if (typeof body.message === "string" && body.message.trim()) {
    return body.message;
  }

  if (typeof body.error === "string" && body.error.trim()) {
    return body.error;
  }

  return fallback;
}

function isAbortError(error) {
  return error && (error.name === "AbortError" || error.code === "ABORT_ERR");
}

async function readResponseBody(response) {
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  const contentType =
    typeof response.headers?.get === "function"
      ? response.headers.get("content-type") || ""
      : "";
  const raw = await response.text();

  if (!raw) {
    return null;
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  return raw;
}

function createLogisticsClient(options) {
  const baseUrl = String(options?.baseUrl || "").replace(/\/+$/, "");
  const serviceSecret = String(options?.serviceSecret || "").trim();
  const timeoutMs = Number(options?.timeoutMs || 10000);
  const fetchImpl = options?.fetchImpl || global.fetch;

  if (!baseUrl) {
    throw new Error("baseUrl is required for the logistics-api client");
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) {
    throw new Error("timeoutMs must be a positive number");
  }

  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required for the logistics-api client");
  }

  async function request({
    method = "GET",
    path,
    query,
    body,
    headers = {},
  }) {
    const url = `${baseUrl}${path}${buildQueryString(query)}`;
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      const responseBody = await readResponseBody(response);

      if (!response.ok) {
        throw new LogisticsApiError(
          inferMessage(
            responseBody,
            `logistics-api request failed with status ${response.status}`
          ),
          {
            status: response.status,
            upstreamStatus: response.status,
            upstreamBody: responseBody,
            retryable: response.status >= 500,
          }
        );
      }

      return responseBody;
    } catch (error) {
      if (error instanceof LogisticsApiError) {
        throw error;
      }

      if (isAbortError(error)) {
        throw new LogisticsApiError("logistics-api request timed out", {
          status: 504,
          code: "LOGISTICS_API_TIMEOUT",
          retryable: true,
          cause: error,
        });
      }

      throw new LogisticsApiError("Failed to reach logistics-api", {
        status: 502,
        code: "LOGISTICS_API_UNAVAILABLE",
        retryable: true,
        cause: error,
      });
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  function buildBaseHeaders({ idempotencyKey } = {}) {
    const headers = {
      Accept: "application/json",
    };

    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    return headers;
  }

  function serviceRequest(options) {
    if (!serviceSecret) {
      throw new Error(
        "serviceSecret is required for service-auth logistics-api requests"
      );
    }

    const bodyHeaders =
      options.body === undefined ? {} : { "Content-Type": "application/json" };

    return request({
      ...options,
      headers: {
        ...buildBaseHeaders(options),
        ...bodyHeaders,
        "x-delivery-backend-secret": serviceSecret,
      },
    });
  }

  function apiKeyRequest(options) {
    const apiKey = String(options?.apiKey || "").trim();

    if (!apiKey) {
      throw new Error("apiKey is required for tenant API-key logistics-api requests");
    }

    const bodyHeaders =
      options.body === undefined ? {} : { "Content-Type": "application/json" };

    return request({
      ...options,
      headers: {
        ...buildBaseHeaders(options),
        ...bodyHeaders,
        Authorization: `Bearer ${apiKey}`,
      },
    });
  }

  function tenantRequest(options) {
    const tenantCredential = String(options?.tenantCredential || "").trim();

    if (!tenantCredential) {
      throw new Error(
        "tenantCredential is required for tenant-auth logistics-api requests"
      );
    }

    const bodyHeaders =
      options.body === undefined ? {} : { "Content-Type": "application/json" };

    return request({
      ...options,
      headers: {
        ...buildBaseHeaders(options),
        ...bodyHeaders,
        Authorization: `Bearer ${tenantCredential}`,
      },
    });
  }

  function tenantOrServiceRequest(options) {
    if (String(options?.tenantCredential || "").trim()) {
      return tenantRequest(options);
    }

    return serviceRequest(options);
  }

  return {
    createTenant(payload) {
      return serviceRequest({
        method: "POST",
        path: "/api/tenants",
        body: payload,
      });
    },

    bootstrapTenant(payload) {
      return serviceRequest({
        method: "POST",
        path: "/api/tenants/bootstrap",
        body: payload,
      });
    },

    exchangeTenantAccess(payload) {
      return serviceRequest({
        method: "POST",
        path: "/api/tenant-auth/exchange",
        body: payload,
      });
    },

    createNodeSession({ apiKey, payload }) {
      return apiKeyRequest({
        method: "POST",
        path: "/api/node-auth/session",
        body: payload,
        apiKey,
      });
    },

    getTenantMe({ tenantCredential }) {
      return tenantRequest({
        method: "GET",
        path: "/api/tenants/me",
        tenantCredential,
      });
    },

    listNodes({ tenantCredential, tenantId } = {}) {
      return tenantOrServiceRequest({
        method: "GET",
        path: "/api/nodes",
        query: { tenantId },
        tenantCredential,
      });
    },

    getNode({ id, tenantCredential }) {
      return tenantOrServiceRequest({
        method: "GET",
        path: `/api/nodes/${encodeURIComponent(id)}`,
        tenantCredential,
      });
    },

    createNode({ payload, tenantCredential }) {
      return tenantOrServiceRequest({
        method: "POST",
        path: "/api/nodes",
        body: payload,
        tenantCredential,
      });
    },

    createDelivery({ payload, tenantCredential, idempotencyKey }) {
      return tenantRequest({
        method: "POST",
        path: "/api/deliveries",
        body: payload,
        tenantCredential,
        idempotencyKey,
      });
    },

    listDeliveries({ tenantCredential, query } = {}) {
      return tenantRequest({
        method: "GET",
        path: "/api/deliveries",
        query,
        tenantCredential,
      });
    },

    getDelivery({ id, tenantCredential }) {
      return tenantRequest({
        method: "GET",
        path: `/api/deliveries/${encodeURIComponent(id)}`,
        tenantCredential,
      });
    },

    listDeliveryEvents({ tenantCredential, deliveryId }) {
      return tenantRequest({
        method: "GET",
        path: "/api/events",
        query: { deliveryId },
        tenantCredential,
      });
    },

    createDeliveryEvent({ payload, tenantCredential, idempotencyKey }) {
      return tenantRequest({
        method: "POST",
        path: "/api/events",
        body: payload,
        tenantCredential,
        idempotencyKey,
      });
    },

    listHandoffs({ tenantCredential, deliveryId }) {
      return tenantRequest({
        method: "GET",
        path: "/api/handoffs",
        query: { deliveryId },
        tenantCredential,
      });
    },

    getHandoff({ id, tenantCredential }) {
      return tenantRequest({
        method: "GET",
        path: `/api/handoffs/${encodeURIComponent(id)}`,
        tenantCredential,
      });
    },

    getHandoffStatus({ deliveryId, tenantCredential }) {
      return tenantRequest({
        method: "GET",
        path: `/api/handoffs/status/${encodeURIComponent(deliveryId)}`,
        tenantCredential,
      });
    },

    initiateHandoff({ payload, tenantCredential, idempotencyKey }) {
      return tenantRequest({
        method: "POST",
        path: "/api/handoffs/initiate",
        body: payload,
        tenantCredential,
        idempotencyKey,
      });
    },

    retryHandoff({ id, tenantCredential, idempotencyKey }) {
      return tenantRequest({
        method: "POST",
        path: `/api/handoffs/${encodeURIComponent(id)}/retry`,
        tenantCredential,
        idempotencyKey,
      });
    },

    verifyHandoff({ payload, tenantCredential, idempotencyKey }) {
      return tenantRequest({
        method: "POST",
        path: "/api/handoffs/verify",
        body: payload,
        tenantCredential,
        idempotencyKey,
      });
    },

    disputeHandoff({ payload, tenantCredential, idempotencyKey }) {
      return tenantRequest({
        method: "POST",
        path: "/api/handoffs/dispute",
        body: payload,
        tenantCredential,
        idempotencyKey,
      });
    },

    resolveHandoff({ id, payload, tenantCredential, idempotencyKey }) {
      return tenantRequest({
        method: "POST",
        path: `/api/handoffs/${encodeURIComponent(id)}/resolve`,
        body: payload,
        tenantCredential,
        idempotencyKey,
      });
    },
  };
}

function getLogisticsClient(options = {}) {
  const { env, ...overrides } = options || {};

  return createLogisticsClient({
    ...getLogisticsApiConfig(env || process.env),
    ...overrides,
  });
}

module.exports = {
  LogisticsApiError,
  createLogisticsClient,
  getLogisticsClient,
};
