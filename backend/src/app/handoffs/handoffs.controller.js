const express = require("express");
const asyncHandler = require("../../core/middlewares/asyncHandler");
const localAuthMiddleware = require("../../core/middlewares/localAuth");
const { attachAuthz, requireAdmin } = require("../../core/middlewares/authz");
const HandoffsService = require("./handoffs.service");

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
    const result = await HandoffsService.listHandoffs(
      buildActor(req),
      req.query || {}
    );
    res.json(result);
  })
);

router.post(
  "/initiate",
  asyncHandler(async (req, res) => {
    const result = await HandoffsService.initiateHandoff(
      buildActor(req),
      req.body || {},
      {
        idempotencyKey: getIdempotencyKey(req),
      }
    );
    res.status(201).json(result);
  })
);

router.post(
  "/verify",
  asyncHandler(async (req, res) => {
    const result = await HandoffsService.verifyHandoff(
      buildActor(req),
      req.body || {},
      {
        idempotencyKey: getIdempotencyKey(req),
      }
    );
    res.json(result);
  })
);

router.post(
  "/dispute",
  asyncHandler(async (req, res) => {
    const result = await HandoffsService.disputeHandoff(
      buildActor(req),
      req.body || {},
      {
        idempotencyKey: getIdempotencyKey(req),
      }
    );
    res.json(result);
  })
);

router.post(
  "/:id/retry",
  asyncHandler(async (req, res) => {
    const result = await HandoffsService.retryHandoff(
      buildActor(req),
      req.params || {},
      req.body || {},
      {
        idempotencyKey: getIdempotencyKey(req),
      }
    );
    res.json(result);
  })
);

router.post(
  "/:id/resolve",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await HandoffsService.resolveHandoff(
      buildActor(req),
      req.params || {},
      req.body || {},
      {
        idempotencyKey: getIdempotencyKey(req),
      }
    );
    res.json(result);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await HandoffsService.getHandoff(
      buildActor(req),
      req.params || {},
      req.query || {}
    );
    res.json(result);
  })
);

module.exports = router;
