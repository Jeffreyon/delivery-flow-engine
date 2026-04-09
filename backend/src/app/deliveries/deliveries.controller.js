const express = require("express");
const asyncHandler = require("../../core/middlewares/asyncHandler");
const localAuthMiddleware = require("../../core/middlewares/localAuth");
const { attachAuthz } = require("../../core/middlewares/authz");
const DeliveriesService = require("./deliveries.service");

const router = express.Router();

function buildActor(req) {
  return {
    uid: req.authz?.uid,
    email: req.user?.email || req.authz?.user?.email || null,
    isAdmin: Boolean(req.authz?.isAdmin),
  };
}

function getIdempotencyKey(req) {
  const rawValue = req.get("Idempotency-Key");
  const value = String(rawValue || "").trim();
  return value || undefined;
}

router.use(localAuthMiddleware, attachAuthz);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await DeliveriesService.listDeliveries(
      buildActor(req),
      req.query || {}
    );
    res.json(result);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const result = await DeliveriesService.createDelivery(
      buildActor(req),
      req.body || {},
      {
        idempotencyKey: getIdempotencyKey(req),
      }
    );
    res.status(201).json(result);
  })
);

router.get(
  "/:id/events",
  asyncHandler(async (req, res) => {
    const result = await DeliveriesService.listDeliveryEvents(
      buildActor(req),
      req.params || {},
      req.query || {}
    );
    res.json(result);
  })
);

router.post(
  "/:id/events",
  asyncHandler(async (req, res) => {
    const result = await DeliveriesService.appendDeliveryEvent(
      buildActor(req),
      req.params || {},
      req.body || {},
      {
        idempotencyKey: getIdempotencyKey(req),
      }
    );
    res.status(201).json(result);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await DeliveriesService.getDelivery(
      buildActor(req),
      req.params || {},
      req.query || {}
    );
    res.json(result);
  })
);

module.exports = router;
