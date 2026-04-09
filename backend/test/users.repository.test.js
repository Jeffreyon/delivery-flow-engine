const UsersRepository = require("../src/app/users/users.repository");

describe("UsersRepository", () => {
  test("upsertWithClient uses one placeholder per inserted user column", async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "user-1",
              email: "user@example.com",
              display_name: "User One",
              photo_url: null,
              preferences: {},
              roles: ["user"],
              email_verified: false,
              created_at: 1,
              updated_at: 2,
            },
          ],
        }),
    };

    await UsersRepository.upsertWithClient(client, "user-1", {
      email: "user@example.com",
      displayName: "User One",
      roles: ["user"],
      emailVerified: false,
      createdAt: 1,
      updatedAt: 2,
      preferences: {},
    });

    const insertQuery = client.query.mock.calls[0][0];

    expect(insertQuery).toContain(
      ") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"
    );
    expect(insertQuery).not.toContain("$11");
    expect(client.query.mock.calls[0][1]).toHaveLength(10);
  });
});
