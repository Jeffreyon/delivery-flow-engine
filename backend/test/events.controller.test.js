const express = require("express");
const request = require("supertest");

jest.mock("../src/core/middlewares/localAuth", () =>
  jest.fn((req, res, next) => next())
);
jest.mock("../src/core/middlewares/authz", () => ({
  attachAuthz: jest.fn((req, res, next) => next()),
  requireAdmin: jest.fn((req, res, next) => next()),
}));
jest.mock("../src/app/events/events.service", () => ({
  listEvents: jest.fn(),
  createEvent: jest.fn(),
}));

const localAuthMiddleware = require("../src/core/middlewares/localAuth");
const { attachAuthz, requireAdmin } = require("../src/core/middlewares/authz");
const EventsService = require("../src/app/events/events.service");
const eventsRouter = require("../src/app/events/events.controller");

describe("events controller hardening", () => {
  let app;

  beforeEach(() => {
    localAuthMiddleware.mockReset();
    attachAuthz.mockReset();
    requireAdmin.mockReset();
    EventsService.listEvents.mockReset();
    EventsService.createEvent.mockReset();

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
    app.use("/api/events", eventsRouter);
  });

  test("GET /api/events remains public", async () => {
    EventsService.listEvents.mockResolvedValue([
      { id: "evt-1", type: "platform.healthcheck", payload: {}, createdAt: 1 },
    ]);

    const response = await request(app).get("/api/events");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: "evt-1", type: "platform.healthcheck", payload: {}, createdAt: 1 },
    ]);
    expect(EventsService.listEvents).toHaveBeenCalledWith(undefined);
    expect(localAuthMiddleware).not.toHaveBeenCalled();
    expect(attachAuthz).not.toHaveBeenCalled();
    expect(requireAdmin).not.toHaveBeenCalled();
  });

  test("POST /api/events uses authz middleware before creating an event", async () => {
    EventsService.createEvent.mockResolvedValue({
      id: "evt-2",
      type: "platform.healthcheck",
      payload: { ok: true },
      createdAt: 2,
    });

    const response = await request(app)
      .post("/api/events")
      .send({ type: "platform.healthcheck", payload: { ok: true } });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: "evt-2",
      type: "platform.healthcheck",
      payload: { ok: true },
      createdAt: 2,
    });
    expect(localAuthMiddleware).toHaveBeenCalled();
    expect(attachAuthz).toHaveBeenCalled();
    expect(requireAdmin).toHaveBeenCalled();
    expect(EventsService.createEvent).toHaveBeenCalledWith({
      type: "platform.healthcheck",
      payload: { ok: true },
    });
  });

  test("POST /api/events returns 403 when admin auth fails", async () => {
    requireAdmin.mockImplementation((req, res) => {
      res.status(403).json({ message: "Admin privileges required" });
    });

    const response = await request(app)
      .post("/api/events")
      .send({ type: "platform.healthcheck", payload: { ok: true } });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Admin privileges required" });
    expect(EventsService.createEvent).not.toHaveBeenCalled();
  });
});
