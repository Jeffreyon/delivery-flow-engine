const express = require("express");
const router = express.Router();
const asyncHandler = require("../../core/middlewares/asyncHandler");
const localAuthMiddleware = require("../../core/middlewares/localAuth");
const { attachAuthz, requireAdmin } = require("../../core/middlewares/authz");
const DeliveryEventsService = require("./deliveryEvents.service");

// List delivery events, optionally filtered by type
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { type } = req.query;
    const events = await DeliveryEventsService.listDeliveryEvents(type);
    res.json(events);
  })
);

// Create a new delivery event (admin only)
router.post(
  "/",
  localAuthMiddleware,
  attachAuthz,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const event = await DeliveryEventsService.createDeliveryEvent(req.body || {});
    res.status(201).json(event);
  })
);

module.exports = router;
