const express = require("express");
const router = express.Router();
const asyncHandler = require("../../core/middlewares/asyncHandler");
const localAuthMiddleware = require("../../core/middlewares/localAuth");
const { attachAuthz, requireAdmin } = require("../../core/middlewares/authz");
const EventsService = require("./events.service");

// List platform events, optionally filtered by type
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { type } = req.query;
    const events = await EventsService.listEvents(type);
    res.json(events);
  })
);

// Create a new platform event (admin only)
router.post(
  "/",
  localAuthMiddleware,
  attachAuthz,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const event = await EventsService.createEvent(req.body || {});
    res.status(201).json(event);
  })
);

module.exports = router;
