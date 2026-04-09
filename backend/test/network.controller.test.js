const express = require("express");
const request = require("supertest");

jest.mock("../src/core/middlewares/localAuth", () =>
  jest.fn((req, res, next) => next())
);
jest.mock("../src/core/middlewares/authz", () => ({
  attachAuthz: jest.fn((req, res, next) => next()),
  requireAdmin: jest.fn((req, res, next) => next()),
}));
jest.mock("../src/app/network/network.service", () => ({
  bootstrapNetwork: jest.fn(),
  getNetworkContext: jest.fn(),
  listNetworkNodes: jest.fn(),
  createNetworkNode: jest.fn(),
}));

const localAuthMiddleware = require("../src/core/middlewares/localAuth");
const {
  attachAuthz,
  requireAdmin,
} = require("../src/core/middlewares/authz");
const NetworkService = require("../src/app/network/network.service");
const errorHandler = require("../src/core/middlewares/errorHandler");
const networkRouter = require("../src/app/network/network.controller");

describe("network controller bridge", () => {
  let app;

  beforeEach(() => {
    localAuthMiddleware.mockReset();
    attachAuthz.mockReset();
    requireAdmin.mockReset();
    NetworkService.bootstrapNetwork.mockReset();
    NetworkService.getNetworkContext.mockReset();
    NetworkService.listNetworkNodes.mockReset();
    NetworkService.createNetworkNode.mockReset();

    localAuthMiddleware.mockImplementation((req, res, next) => {
      req.user = { uid: "user-1", email: "user@example.com" };
      next();
    });
    attachAuthz.mockImplementation((req, res, next) => {
      req.authz = {
        uid: "user-1",
        isAdmin: false,
        user: { id: "user-1", email: "user@example.com" },
      };
      next();
    });
    requireAdmin.mockImplementation((req, res, next) => next());

    app = express();
    app.use(express.json());
    app.use("/api/v1/network", networkRouter);
    app.use(errorHandler);
  });

  test("GET /api/v1/network/context returns the resolved bridge payload", async () => {
    NetworkService.getNetworkContext.mockResolvedValue({
      actor: { uid: "user-1", email: "user@example.com", isAdmin: false },
      binding: null,
      effectiveContext: null,
      tenant: null,
      node: null,
      issues: [],
    });

    const response = await request(app).get("/api/v1/network/context");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      actor: { uid: "user-1", email: "user@example.com", isAdmin: false },
      binding: null,
      effectiveContext: null,
      tenant: null,
      node: null,
      issues: [],
    });
    expect(localAuthMiddleware).toHaveBeenCalled();
    expect(attachAuthz).toHaveBeenCalled();
    expect(NetworkService.getNetworkContext).toHaveBeenCalledWith(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      {}
    );
  });

  test("POST /api/v1/network/bootstrap remains admin-only", async () => {
    requireAdmin.mockImplementation((req, res) => {
      res.status(403).json({ message: "Admin privileges required" });
    });

    const response = await request(app)
      .post("/api/v1/network/bootstrap")
      .send({
        name: "Tenant One",
        firstNode: { phoneNumber: "+2348000000000" },
      });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Admin privileges required" });
    expect(NetworkService.bootstrapNetwork).not.toHaveBeenCalled();
  });

  test("POST /api/v1/network/nodes forwards the actor context and returns 201", async () => {
    NetworkService.createNetworkNode.mockResolvedValue({
      node: {
        id: "node-1",
        tenantId: "tenant-1",
        phoneNumber: "+2348000000000",
        trustScore: 0,
        createdAt: 123,
      },
    });

    const response = await request(app)
      .post("/api/v1/network/nodes")
      .send({
        phoneNumber: "+2348000000000",
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      node: {
        id: "node-1",
        tenantId: "tenant-1",
        phoneNumber: "+2348000000000",
        trustScore: 0,
        createdAt: 123,
      },
    });
    expect(NetworkService.createNetworkNode).toHaveBeenCalledWith(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      {
        phoneNumber: "+2348000000000",
      }
    );
  });
});
