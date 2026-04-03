jest.mock("../src/app/users/users.repository", () => ({
  getById: jest.fn(),
  getByEmail: jest.fn(),
  list: jest.fn(),
  upsert: jest.fn(),
}));

const UsersRepository = require("../src/app/users/users.repository");
const UsersService = require("../src/app/users/users.service");

const existingUser = {
  id: "user-123",
  email: "user@example.com",
  displayName: "Existing User",
  photoURL: "https://example.com/avatar.png",
  preferences: {
    locale: "en",
    theme: "dark",
  },
  roles: ["user"],
  emailVerified: false,
  createdAt: 100,
  updatedAt: 200,
};

describe("UsersService hardening", () => {
  beforeEach(() => {
    UsersRepository.getById.mockReset();
    UsersRepository.getByEmail.mockReset();
    UsersRepository.list.mockReset();
    UsersRepository.upsert.mockReset();
  });

  test("updateSelfUser only changes self-safe fields and merges preferences", async () => {
    UsersRepository.getById.mockResolvedValue(existingUser);
    UsersRepository.upsert.mockImplementation(async (id, payload) => ({
      ...existingUser,
      ...payload,
      id,
    }));

    const result = await UsersService.updateSelfUser("user-123", {
      displayName: "Updated User",
      preferences: { locale: "fr" },
    });

    expect(UsersRepository.upsert).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        email: "user@example.com",
        displayName: "Updated User",
        photoURL: "https://example.com/avatar.png",
        preferences: {
          locale: "fr",
          theme: "dark",
        },
        roles: ["user"],
        emailVerified: false,
        createdAt: 100,
      })
    );
    expect(result).toMatchObject({
      id: "user-123",
      email: "user@example.com",
      displayName: "Updated User",
      roles: ["user"],
      emailVerified: false,
    });
  });

  test("updateSelfUser rejects admin-only fields", async () => {
    UsersRepository.getById.mockResolvedValue(existingUser);

    await expect(
      UsersService.updateSelfUser("user-123", {
        roles: ["admin"],
      })
    ).rejects.toMatchObject({
      name: "ZodError",
    });

    expect(UsersRepository.upsert).not.toHaveBeenCalled();
  });

  test("updateAdminUser allows admin-safe fields on an existing user", async () => {
    UsersRepository.getById.mockResolvedValue(existingUser);
    UsersRepository.upsert.mockImplementation(async (id, payload) => ({
      ...existingUser,
      ...payload,
      id,
    }));

    const result = await UsersService.updateAdminUser("user-123", {
      email: "updated@example.com",
      roles: ["admin", "user"],
      emailVerified: true,
    });

    expect(UsersRepository.upsert).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        email: "updated@example.com",
        roles: ["admin", "user"],
        emailVerified: true,
      })
    );
    expect(result).toMatchObject({
      email: "updated@example.com",
      roles: ["admin", "user"],
      emailVerified: true,
    });
  });

  test("updateAdminUser returns 404 when the user does not exist", async () => {
    UsersRepository.getById.mockResolvedValue(null);

    await expect(
      UsersService.updateAdminUser("missing-user", {
        email: "updated@example.com",
      })
    ).rejects.toMatchObject({
      status: 404,
      message: "User not found",
    });

    expect(UsersRepository.upsert).not.toHaveBeenCalled();
  });
});
