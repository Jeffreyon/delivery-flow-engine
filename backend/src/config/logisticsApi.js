const DEFAULT_LOGISTICS_API_TIMEOUT_MS = 10000;

function requireTrimmedValue(name, value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    throw new Error(`${name} is required for the logistics-api client`);
  }

  return trimmed;
}

function normalizeBaseUrl(value) {
  const trimmed = requireTrimmedValue("LOGISTICS_API_URL", value);

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("LOGISTICS_API_URL must be a valid http or https URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("LOGISTICS_API_URL must use http or https");
  }

  return trimmed.replace(/\/+$/, "");
}

function parseTimeoutMs(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return DEFAULT_LOGISTICS_API_TIMEOUT_MS;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error("LOGISTICS_API_TIMEOUT_MS must be a positive number");
  }

  return Math.floor(parsed);
}

function getLogisticsApiConfig(env = process.env) {
  return {
    baseUrl: normalizeBaseUrl(env.LOGISTICS_API_URL),
    serviceSecret: requireTrimmedValue(
      "LOGISTICS_API_SERVICE_SECRET",
      env.LOGISTICS_API_SERVICE_SECRET
    ),
    timeoutMs: parseTimeoutMs(env.LOGISTICS_API_TIMEOUT_MS),
  };
}

module.exports = {
  DEFAULT_LOGISTICS_API_TIMEOUT_MS,
  getLogisticsApiConfig,
};
