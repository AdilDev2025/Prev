const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../../Middlewares/auth_middleware");
const { checkWorkspaceRole } = require("../../../Middlewares/role_middleware");
const {
  createProductivitySnapshot,
  getProductivitySnapshots,
  getLatestSnapshot,
  generateWorkspaceSnapshots
} = require("../../controllers/dashboard/productivity_controller");

// All productivity routes require authentication
router.use(authMiddleware);

// Individual user endpoints
router.post("/snapshot", createProductivitySnapshot);
//specific individuals productivity scoring report
router.get("/snapshots/:userId/:workspaceId", getProductivitySnapshots);
router.get("/snapshot/latest/:userId/:workspaceId", getLatestSnapshot);

// Workspace-level endpoints (admin only)
router.post("/workspace/:workspaceId/generate-all", checkWorkspaceRole('admin'), generateWorkspaceSnapshots);

module.exports = router;

