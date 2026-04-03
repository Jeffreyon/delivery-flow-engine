const { z } = require("zod");
const UsersRepository = require("./users.repository");

const internalUserPayloadSchema = z
  .object({
    displayName: z.string().trim().min(1).nullable().optional(),
    email: z.string().email().optional(),
    photoURL: z.string().url().nullable().optional(),
    preferences: z
      .object({
        locale: z.string().optional(),
        theme: z.string().optional(),
      })
      .partial()
      .optional(),
    roles: z.array(z.string()).optional(),
    emailVerified: z.boolean().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    passwordHash: z.string().optional(),
  })
  .strict();

const selfUserUpdateSchema = z
  .object({
    displayName: z.string().trim().min(1).nullable().optional(),
    photoURL: z.string().url().nullable().optional(),
    preferences: z
      .object({
        locale: z.string().optional(),
        theme: z.string().optional(),
      })
      .partial()
      .optional(),
  })
  .strict();

const adminUserUpdateSchema = selfUserUpdateSchema
  .extend({
    email: z.string().email().optional(),
    roles: z.array(z.string()).optional(),
    emailVerified: z.boolean().optional(),
  })
  .strict();

function toUserDTO(doc) {
  if (!doc) return null;
  const {
    id,
    displayName,
    email,
    photoURL,
    preferences,
    roles,
  } = doc;

  return {
    id,
    displayName: displayName || null,
    email: email || null,
    photoURL: typeof photoURL === "string" ? photoURL : null,
    preferences: preferences || {},
    roles: roles || [],
    emailVerified: !!doc.emailVerified,
  };
}

async function listUsers() {
  const docs = await UsersRepository.list();
  return docs.map(toUserDTO).filter(Boolean);
}

async function getUser(id) {
  const doc = await UsersRepository.getById(id);
  return toUserDTO(doc);
}

async function getUserByEmail(email) {
  const doc = await UsersRepository.getByEmail(email);
  return toUserDTO(doc);
}

function hasOwn(payload, key) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

async function requireExistingUser(id) {
  const existing = await UsersRepository.getById(id);
  if (!existing) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  return existing;
}

function mergeUserUpdate(existing, payload, options = {}) {
  const next = {
    email: existing.email || null,
    displayName:
      typeof existing.displayName === "string" ? existing.displayName : null,
    photoURL: typeof existing.photoURL === "string" ? existing.photoURL : null,
    preferences: existing.preferences || {},
    roles: Array.isArray(existing.roles) ? existing.roles : [],
    emailVerified: Boolean(existing.emailVerified),
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };

  if (hasOwn(payload, "displayName")) {
    next.displayName = payload.displayName ?? null;
  }

  if (hasOwn(payload, "photoURL")) {
    next.photoURL = payload.photoURL ?? null;
  }

  if (hasOwn(payload, "preferences")) {
    next.preferences = {
      ...(existing.preferences || {}),
      ...(payload.preferences || {}),
    };
  }

  if (options.allowEmail && hasOwn(payload, "email")) {
    next.email = payload.email;
  }

  if (options.allowRoles && hasOwn(payload, "roles")) {
    next.roles = payload.roles;
  }

  if (options.allowEmailVerified && hasOwn(payload, "emailVerified")) {
    next.emailVerified = payload.emailVerified;
  }

  return next;
}

async function upsertUser(id, payload) {
  const parsed = internalUserPayloadSchema.parse(payload || {});
  const data = {
    ...parsed,
    updatedAt: Date.now(),
  };
  const saved = await UsersRepository.upsert(id, data);
  return toUserDTO(saved);
}

async function updateSelfUser(id, payload) {
  const existing = await requireExistingUser(id);
  const parsed = selfUserUpdateSchema.parse(payload || {});
  const saved = await UsersRepository.upsert(
    id,
    mergeUserUpdate(existing, parsed)
  );
  return toUserDTO(saved);
}

async function updateAdminUser(id, payload) {
  const existing = await requireExistingUser(id);
  const parsed = adminUserUpdateSchema.parse(payload || {});
  const saved = await UsersRepository.upsert(
    id,
    mergeUserUpdate(existing, parsed, {
      allowEmail: true,
      allowRoles: true,
      allowEmailVerified: true,
    })
  );
  return toUserDTO(saved);
}

module.exports = {
  listUsers,
  getUser,
  getUserByEmail,
  upsertUser,
  updateSelfUser,
  updateAdminUser,
};
