const express = require("express");
const router = express.Router();
const {
  createProductivitySnapshot,
  getProductivitySnapshots,
  getLatestSnapshot,
  generateWorkspaceSnapshots
} = require("../../controllers/dashboard/productivity_controller");

// Individual user endpoints
router.post("/snapshot", createProductivitySnapshot);
//specific individuals productivity scoring report
router.get("/snapshots/:userId/:workspaceId", getProductivitySnapshots);
router.get("/snapshot/latest/:userId/:workspaceId", getLatestSnapshot);

// Workspace-level endpoints (admin)
router.post("/workspace/:workspaceId/generate-all", generateWorkspaceSnapshots);

module.exports = router;

