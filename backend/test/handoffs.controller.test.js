const express = require("express");
const request = require("supertest");

jest.mock("../src/core/middlewares/localAuth", () =>
  jest.fn((req, res, next) => next())
);
jest.mock("../src/core/middlewares/authz", () => ({
  attachAuthz: jest.fn((req, res, next) => next()),
  requireAdmin: jest.fn((req, res, next) => next()),
}));
jest.mock("../src/app/handoffs/handoffs.service", () => ({
  getDeliveryHandoffStatus: jest.fn(),
  listHandoffs: jest.fn(),
  getHandoff: jest.fn(),
  initiateHandoff: jest.fn(),
  retryHandoff: jest.fn(),
  verifyHandoff: jest.fn(),
  disputeHandoff: jest.fn(),
  resolveHandoff: jest.fn(),
}));

const localAuthMiddleware = require("../src/core/middlewares/localAuth");
const {
  attachAuthz,
  requireAdmin,
} = require("../src/core/middlewares/authz");
const HandoffsService = require("../src/app/handoffs/handoffs.service");
const errorHandler = require("../src/core/middlewares/errorHandler");
const handoffsRouter = require("../src/app/handoffs/handoffs.controller");

describe("remote handoffs facade controller", () => {
  let app;

  beforeEach(() => {
    localAuthMiddleware.mockReset();
    attachAuthz.mockReset();
    requireAdmin.mockReset();
    HandoffsService.getDeliveryHandoffStatus.mockReset();
    HandoffsService.listHandoffs.mockReset();
    HandoffsService.getHandoff.mockReset();
    HandoffsService.initiateHandoff.mockReset();
    HandoffsService.retryHandoff.mockReset();
    HandoffsService.verifyHandoff.mockReset();
    HandoffsService.disputeHandoff.mockReset();
    HandoffsService.resolveHandoff.mockReset();

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
    app.use("/api/v1/handoffs", handoffsRouter);
    app.use(errorHandler);
  });

  test("GET /api/v1/handoffs returns the upstream handoff history", async () => {
    HandoffsService.listHandoffs.mockResolvedValue({
      items: [{ id: "handoff-1" }],
    });

    const response = await request(app).get(
      "/api/v1/handoffs?deliveryId=delivery-1"
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [{ id: "handoff-1" }],
    });
    expect(HandoffsService.listHandoffs).toHaveBeenCalledWith(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      {
        deliveryId: "delivery-1",
      }
    );
  });

  test("POST /api/v1/handoffs/initiate returns 201 and forwards the idempotency key", async () => {
    HandoffsService.initiateHandoff.mockResolvedValue({
      handoff: { id: "handoff-1", status: "REQUESTED" },
    });

    const response = await request(app)
      .post("/api/v1/handoffs/initiate")
      .set("Idempotency-Key", "idem-1")
      .send({
        deliveryId: "delivery-1",
        fromNodeId: "node-a",
        toTenantId: "tenant-2",
        toNodeId: "node-b",
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      handoff: { id: "handoff-1", status: "REQUESTED" },
    });
    expect(HandoffsService.initiateHandoff).toHaveBeenCalledWith(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      {
        deliveryId: "delivery-1",
        fromNodeId: "node-a",
        toTenantId: "tenant-2",
        toNodeId: "node-b",
      },
      {
        idempotencyKey: "idem-1",
      }
    );
  });

  test("POST /api/v1/handoffs/verify forwards the request body", async () => {
    HandoffsService.verifyHandoff.mockResolvedValue({
      handoff: { id: "handoff-1", status: "COMPLETED" },
    });

    const response = await request(app)
      .post("/api/v1/handoffs/verify")
      .send({
        handoffId: "handoff-1",
        pin: "123456",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      handoff: { id: "handoff-1", status: "COMPLETED" },
    });
    expect(HandoffsService.verifyHandoff).toHaveBeenCalledWith(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      {
        handoffId: "handoff-1",
        pin: "123456",
      },
      {
        idempotencyKey: undefined,
      }
    );
  });

  test("POST /api/v1/handoffs/:id/retry forwards params, body, and idempotency", async () => {
    HandoffsService.retryHandoff.mockResolvedValue({
      handoff: { id: "handoff-1", status: "REQUESTED" },
    });

    const response = await request(app)
      .post("/api/v1/handoffs/handoff-1/retry")
      .set("Idempotency-Key", "idem-2")
      .send({
        tenantId: "tenant-1",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      handoff: { id: "handoff-1", status: "REQUESTED" },
    });
    expect(HandoffsService.retryHandoff).toHaveBeenCalledWith(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      {
        id: "handoff-1",
      },
      {
        tenantId: "tenant-1",
      },
      {
        idempotencyKey: "idem-2",
      }
    );
  });

  test("POST /api/v1/handoffs/:id/resolve remains admin-only", async () => {
    requireAdmin.mockImplementation((req, res) => {
      res.status(403).json({ message: "Admin privileges required" });
    });

    const response = await request(app)
      .post("/api/v1/handoffs/handoff-1/resolve")
      .send({
        resolution: "CONFIRMED",
      });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Admin privileges required" });
    expect(HandoffsService.resolveHandoff).not.toHaveBeenCalled();
  });
});
