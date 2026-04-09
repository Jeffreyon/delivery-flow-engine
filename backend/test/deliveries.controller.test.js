const express = require("express");
const request = require("supertest");

jest.mock("../src/core/middlewares/localAuth", () =>
  jest.fn((req, res, next) => next())
);
jest.mock("../src/core/middlewares/authz", () => ({
  attachAuthz: jest.fn((req, res, next) => next()),
}));
jest.mock("../src/app/deliveries/deliveries.service", () => ({
  createDelivery: jest.fn(),
  listDeliveries: jest.fn(),
  getDelivery: jest.fn(),
  listDeliveryEvents: jest.fn(),
  appendDeliveryEvent: jest.fn(),
}));

const localAuthMiddleware = require("../src/core/middlewares/localAuth");
const { attachAuthz } = require("../src/core/middlewares/authz");
const DeliveriesService = require("../src/app/deliveries/deliveries.service");
const errorHandler = require("../src/core/middlewares/errorHandler");
const deliveriesRouter = require("../src/app/deliveries/deliveries.controller");

describe("remote deliveries facade controller", () => {
  let app;

  beforeEach(() => {
    localAuthMiddleware.mockReset();
    attachAuthz.mockReset();
    DeliveriesService.createDelivery.mockReset();
    DeliveriesService.listDeliveries.mockReset();
    DeliveriesService.getDelivery.mockReset();
    DeliveriesService.listDeliveryEvents.mockReset();
    DeliveriesService.appendDeliveryEvent.mockReset();

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

    app = express();
    app.use(express.json());
    app.use("/api/v1/deliveries", deliveriesRouter);
    app.use(errorHandler);
  });

  test("POST /api/v1/deliveries returns 201 and forwards the idempotency key", async () => {
    DeliveriesService.createDelivery.mockResolvedValue({
      id: "delivery-1",
      status: "CREATED",
    });

    const response = await request(app)
      .post("/api/v1/deliveries")
      .set("Idempotency-Key", "idem-1")
      .send({
        externalId: "order-1",
        metadata: { priority: "high" },
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: "delivery-1",
      status: "CREATED",
    });
    expect(DeliveriesService.createDelivery).toHaveBeenCalledWith(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      {
        externalId: "order-1",
        metadata: { priority: "high" },
      },
      {
        idempotencyKey: "idem-1",
      }
    );
  });

  test("GET /api/v1/deliveries lists remote deliveries for the current actor", async () => {
    DeliveriesService.listDeliveries.mockResolvedValue({
      items: [{ id: "delivery-1" }],
      nextCursor: null,
    });

    const response = await request(app).get(
      "/api/v1/deliveries?status=IN_TRANSIT"
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [{ id: "delivery-1" }],
      nextCursor: null,
    });
    expect(DeliveriesService.listDeliveries).toHaveBeenCalledWith(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      {
        status: "IN_TRANSIT",
      }
    );
  });

  test("POST /api/v1/deliveries/:id/events returns 201 and injects path params", async () => {
    DeliveriesService.appendDeliveryEvent.mockResolvedValue({ success: true });

    const response = await request(app)
      .post("/api/v1/deliveries/delivery-1/events")
      .set("Idempotency-Key", "idem-2")
      .send({
        type: "DISPATCHED",
        payload: { checkpoint: "hub-a" },
        source: "delivery-flow-engine",
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ success: true });
    expect(DeliveriesService.appendDeliveryEvent).toHaveBeenCalledWith(
      {
        uid: "user-1",
        email: "user@example.com",
        isAdmin: false,
      },
      {
        id: "delivery-1",
      },
      {
        type: "DISPATCHED",
        payload: { checkpoint: "hub-a" },
        source: "delivery-flow-engine",
      },
      {
        idempotencyKey: "idem-2",
      }
    );
  });
});
