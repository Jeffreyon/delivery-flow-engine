const express = require("express");
const asyncHandler = require("../../core/middlewares/asyncHandler");
const localAuthMiddleware = require("../../core/middlewares/localAuth");
const {
  attachAuthz,
  requireAdmin,
} = require("../../core/middlewares/authz");
const NetworkService = require("./network.service");

const router = express.Router();

function buildActor(req) {
  return {
    uid: req.authz?.uid,
    email: req.user?.email || req.authz?.user?.email || null,
    isAdmin: Boolean(req.authz?.isAdmin),
  };
}

router.use(localAuthMiddleware, attachAuthz);

router.post(
  "/bootstrap",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await NetworkService.bootstrapNetwork(
      buildActor(req),
      req.body || {}
    );
    res.status(201).json(result);
  })
);

router.get(
  "/context",
  asyncHandler(async (req, res) => {
    const result = await NetworkService.getNetworkContext(
      buildActor(req),
      req.query || {}
    );
    res.json(result);
  })
);

router.get(
  "/nodes",
  asyncHandler(async (req, res) => {
    const result = await NetworkService.listNetworkNodes(
      buildActor(req),
      req.query || {}
    );
    res.json(result);
  })
);

router.post(
  "/nodes",
  asyncHandler(async (req, res) => {
    const result = await NetworkService.createNetworkNode(
      buildActor(req),
      req.body || {}
    );
    res.status(201).json(result);
  })
);

module.exports = router;
