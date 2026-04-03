const express = require("express");
const request = require("supertest");

describe("auth controller cookie policy", () => {
  afterEach(() => {
    delete process.env.SESSION_COOKIE_SECURE;
    delete process.env.SESSION_COOKIE_DOMAIN;
    jest.resetModules();
    jest.clearAllMocks();
  });

  function buildApp({ secure }) {
    process.env.SESSION_COOKIE_SECURE = secure ? "true" : "false";

    const mockAuthService = {
      signup: jest.fn(),
      login: jest.fn().mockResolvedValue({
        idToken: "id-token",
        user: { id: "user-1", email: "admin@example.com" },
      }),
      createSessionCookie: jest.fn().mockResolvedValue({
        sessionCookie: "session-cookie",
        expiresIn: 60 * 60 * 1000,
      }),
      forgotPassword: jest.fn(),
      resendVerification: jest.fn(),
      logout: jest.fn(),
    };

    jest.doMock("../src/app/auth/auth.service", () => mockAuthService);
    jest.doMock(
      "../src/core/middlewares/localAuth",
      () => jest.fn((req, res, next) => next())
    );
    jest.doMock("../src/core/middlewares/authz", () => ({
      attachAuthz: jest.fn((req, res, next) => next()),
    }));

    const authRouter = require("../src/app/auth/auth.controller");

    const app = express();
    app.use(express.json());
    app.use("/api/auth", authRouter);

    return { app, mockAuthService };
  }

  test("sets SameSite=None for secure deployments", async () => {
    const { app, mockAuthService } = buildApp({ secure: true });

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "password123" });

    expect(response.status).toBe(200);
    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "password123",
      context: {
        ip: "::ffff:127.0.0.1",
        userAgent: null,
      },
    });
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Secure"),
      ])
    );
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("SameSite=None"),
      ])
    );
  });

  test("keeps SameSite=Lax for insecure local deployments", async () => {
    const { app } = buildApp({ secure: false });

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "password123" });

    expect(response.status).toBe(200);
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("SameSite=Lax"),
      ])
    );
    expect(response.headers["set-cookie"][0]).not.toContain("Secure");
  });
});
