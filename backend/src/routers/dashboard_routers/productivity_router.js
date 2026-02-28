const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../../Middlewares/auth_middleware");
const { checkWorkspaceRole } = require("../../../Middlewares/role_middleware");
const {
  createProductivitySnapshot,
  getProductivitySnapshots,
  getLatestSnapshot,
  generateWorkspaceSnapshots,
  getWorkspaceAllSnapshots,
  getLiveHours,
  getWorkspaceLiveHours
} = require("../../controllers/dashboard/productivity_controller");

// All productivity routes require authentication
router.use(authMiddleware);

// Individual user endpoints
router.post("/snapshot", createProductivitySnapshot);
router.get("/snapshots/:userId/:workspaceId", getProductivitySnapshots);
router.get("/snapshot/latest/:userId/:workspaceId", getLatestSnapshot);
router.get("/live-hours/:userId/:workspaceId", getLiveHours);

// Workspace-level endpoints (admin only)
router.get("/workspace/:workspaceId/snapshots", checkWorkspaceRole('admin'), getWorkspaceAllSnapshots);
router.get("/workspace/:workspaceId/live-hours", checkWorkspaceRole('admin'), getWorkspaceLiveHours);
router.post("/workspace/:workspaceId/generate-all", checkWorkspaceRole('admin'), generateWorkspaceSnapshots);

module.exports = router;

