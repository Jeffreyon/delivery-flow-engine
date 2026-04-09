const crypto = require("crypto");

const CIPHER_VERSION = "v1";
const CIPHER_ALGORITHM = "aes-256-gcm";
const CIPHER_SECRET =
  process.env.BLN_TENANT_CREDENTIALS_SECRET ||
  process.env.BLN_OWNER_CREDENTIALS_SECRET ||
  process.env.JWT_SECRET;

if (!CIPHER_SECRET) {
  throw new Error(
    "BLN_TENANT_CREDENTIALS_SECRET, BLN_OWNER_CREDENTIALS_SECRET, or JWT_SECRET is required for BLN credential storage"
  );
}

function deriveKey(secret) {
  return crypto.createHash("sha256").update(String(secret)).digest();
}

function encryptTenantApiKey(value) {
  const plaintext = String(value || "");
  if (!plaintext) {
    throw new Error("A tenant API key is required for encryption");
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    CIPHER_ALGORITHM,
    deriveKey(CIPHER_SECRET),
    iv
  );

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    CIPHER_VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

function decryptTenantApiKey(value) {
  const serialized = String(value || "").trim();
  if (!serialized) {
    throw new Error("An encrypted tenant API key is required for decryption");
  }

  const [version, ivBase64, authTagBase64, ciphertextBase64] =
    serialized.split(":");

  if (
    version !== CIPHER_VERSION ||
    !ivBase64 ||
    !authTagBase64 ||
    !ciphertextBase64
  ) {
    throw new Error("Unsupported encrypted tenant API key format");
  }

  const decipher = crypto.createDecipheriv(
    CIPHER_ALGORITHM,
    deriveKey(CIPHER_SECRET),
    Buffer.from(ivBase64, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTagBase64, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextBase64, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

module.exports = {
  encryptTenantApiKey,
  decryptTenantApiKey,
};
