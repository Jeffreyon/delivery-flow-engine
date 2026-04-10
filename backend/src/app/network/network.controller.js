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

router.post(
  "/provision-self",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await NetworkService.provisionSelfNetwork(
      buildActor(req),
      req.body || {}
    );
    res.status(201).json(result);
  })
);

router.post(
  "/workspaces/bootstrap",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await NetworkService.provisionSelfNetwork(
      buildActor(req),
      req.body || {}
    );
    res.status(201).json(result);
  })
);

router.post(
  "/nodes/self/request-otp",
  asyncHandler(async (req, res) => {
    const result = await NetworkService.requestSelfNodeOtp(
      buildActor(req),
      req.body || {}
    );
    res.status(201).json(result);
  })
);

router.post(
  "/nodes/self/verify-otp",
  asyncHandler(async (req, res) => {
    const result = await NetworkService.verifySelfNodeOtp(
      buildActor(req),
      req.body || {}
    );
    res.json(result);
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

router.get(
  "/invitations",
  asyncHandler(async (req, res) => {
    const result = await NetworkService.listNetworkInvitations(
      buildActor(req),
      req.query || {}
    );
    res.json(result);
  })
);

router.post(
  "/invitations",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await NetworkService.createTenantInvitation(
      buildActor(req),
      req.body || {}
    );
    res.status(201).json(result);
  })
);

router.post(
  "/invitations/:invitationId/accept",
  asyncHandler(async (req, res) => {
    const result = await NetworkService.acceptTenantInvitation(
      buildActor(req),
      req.params || {}
    );
    res.json(result);
  })
);

router.post(
  "/invitations/:invitationId/revoke",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await NetworkService.revokeTenantInvitation(
      buildActor(req),
      req.params || {}
    );
    res.json(result);
  })
);

router.post(
  "/nodes",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await NetworkService.createNetworkNode(
      buildActor(req),
      req.body || {}
    );
    res.status(201).json(result);
  })
);

router.get(
  "/users",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await NetworkService.listTenantUsers(
      buildActor(req),
      req.query || {}
    );
    res.json(result);
  })
);

router.put(
  "/users/:userId",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await NetworkService.upsertTenantUserAccess(
      buildActor(req),
      req.params || {},
      req.body || {}
    );
    res.json(result);
  })
);

module.exports = router;
