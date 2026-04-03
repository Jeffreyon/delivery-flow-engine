const express = require("express");
const request = require("supertest");

jest.mock("../src/core/middlewares/localAuth", () =>
  jest.fn((req, res, next) => next())
);
jest.mock("../src/core/middlewares/authz", () => ({
  attachAuthz: jest.fn((req, res, next) => next()),
  requireAdmin: jest.fn((req, res, next) => next()),
}));
jest.mock("../src/app/deliveryEvents/deliveryEvents.service", () => ({
  listDeliveryEvents: jest.fn(),
  createDeliveryEvent: jest.fn(),
}));

const localAuthMiddleware = require("../src/core/middlewares/localAuth");
const { attachAuthz, requireAdmin } = require("../src/core/middlewares/authz");
const DeliveryEventsService = require("../src/app/deliveryEvents/deliveryEvents.service");
const deliveryEventsRouter = require("../src/app/deliveryEvents/deliveryEvents.controller");

describe("delivery events controller hardening", () => {
  let app;

  beforeEach(() => {
    localAuthMiddleware.mockReset();
    attachAuthz.mockReset();
    requireAdmin.mockReset();
    DeliveryEventsService.listDeliveryEvents.mockReset();
    DeliveryEventsService.createDeliveryEvent.mockReset();

    localAuthMiddleware.mockImplementation((req, res, next) => {
      req.user = { uid: "admin-1" };
      next();
    });
    attachAuthz.mockImplementation((req, res, next) => {
      req.authz = { uid: "admin-1", isAdmin: true };
      next();
    });
    requireAdmin.mockImplementation((req, res, next) => next());

    app = express();
    app.use(express.json());
    app.use("/api/delivery-events", deliveryEventsRouter);
  });

  test("GET /api/delivery-events remains public", async () => {
    DeliveryEventsService.listDeliveryEvents.mockResolvedValue([
      { id: "evt-1", type: "delivery.created", payload: {}, createdAt: 1 },
    ]);

    const response = await request(app).get("/api/delivery-events");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: "evt-1", type: "delivery.created", payload: {}, createdAt: 1 },
    ]);
    expect(DeliveryEventsService.listDeliveryEvents).toHaveBeenCalledWith(undefined);
    expect(localAuthMiddleware).not.toHaveBeenCalled();
    expect(attachAuthz).not.toHaveBeenCalled();
    expect(requireAdmin).not.toHaveBeenCalled();
  });

  test("POST /api/delivery-events uses authz middleware before creating an event", async () => {
    DeliveryEventsService.createDeliveryEvent.mockResolvedValue({
      id: "evt-2",
      type: "delivery.failed",
      payload: { ok: true },
      createdAt: 2,
    });

    const response = await request(app)
      .post("/api/delivery-events")
      .send({ type: "delivery.failed", payload: { ok: true } });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: "evt-2",
      type: "delivery.failed",
      payload: { ok: true },
      createdAt: 2,
    });
    expect(localAuthMiddleware).toHaveBeenCalled();
    expect(attachAuthz).toHaveBeenCalled();
    expect(requireAdmin).toHaveBeenCalled();
    expect(DeliveryEventsService.createDeliveryEvent).toHaveBeenCalledWith({
      type: "delivery.failed",
      payload: { ok: true },
    });
  });

  test("POST /api/delivery-events returns 403 when admin auth fails", async () => {
    requireAdmin.mockImplementation((req, res) => {
      res.status(403).json({ message: "Admin privileges required" });
    });

    const response = await request(app)
      .post("/api/delivery-events")
      .send({ type: "delivery.failed", payload: { ok: true } });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Admin privileges required" });
    expect(DeliveryEventsService.createDeliveryEvent).not.toHaveBeenCalled();
  });
});
