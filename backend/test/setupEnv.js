process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@127.0.0.1:5432/delivery_flow_engine_test";
process.env.BLN_TENANT_CREDENTIALS_SECRET =
  process.env.BLN_TENANT_CREDENTIALS_SECRET || "bln-tenant-test-secret";
process.env.BLN_OWNER_CREDENTIALS_SECRET =
  process.env.BLN_OWNER_CREDENTIALS_SECRET || "bln-owner-test-secret";
