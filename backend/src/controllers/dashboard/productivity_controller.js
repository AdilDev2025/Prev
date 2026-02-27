const { generateMonthlySnapshot } = require("../../services/productivity_services");
const prisma = require("../../lib/prisma");

/**
 * Generate productivity snapshot for a user in a workspace
 * POST /api/productivity/snapshot
 */
async function createProductivitySnapshot(req, res) {
  try {
    const { userId, workspaceId, startDate, endDate } = req.body;

    // Validate inputs
    if (!userId || !workspaceId || !startDate || !endDate) {
      return res.status(400).json({
        error: "Missing required fields: userId, workspaceId, startDate, endDate"
      });
    }

    // Generate snapshot
    const snapshot = await generateMonthlySnapshot(
      parseInt(userId),
      parseInt(workspaceId),
      new Date(startDate),
      new Date(endDate)
    );

    if (!snapshot) {
      return res.status(404).json({
        error: "No attendance data found for the specified period"
      });
    }

    res.json({
      success: true,
      message: "Productivity snapshot generated successfully",
      data: snapshot
    });
  } catch (error) {
    console.error("Error generating productivity snapshot:", error);
    res.status(500).json({
      error: "Failed to generate productivity snapshot",
      details: error.message
    });
  }
}

/**
 * Get all productivity snapshots for a user in a workspace
 * GET /api/productivity/snapshots/:userId/:workspaceId
 */
async function getProductivitySnapshots(req, res) {
  try {
    const { userId, workspaceId } = req.params;
    const { periodType, limit = 12 } = req.query;

    const where = {
      userId: parseInt(userId),
      workspaceId: parseInt(workspaceId)
    };

    if (periodType) {
      where.periodType = periodType;
    }

    const snapshots = await prisma.productivitySnapshot.findMany({
      where,
      orderBy: { periodStart: "desc" },
      take: parseInt(limit)
    });

    res.json({
      success: true,
      count: snapshots.length,
      data: snapshots
    });
  } catch (error) {
    console.error("Error fetching productivity snapshots:", error);
    res.status(500).json({
      error: "Failed to fetch productivity snapshots",
      details: error.message
    });
  }
}

/**
 * Get latest productivity snapshot
 * GET /api/productivity/snapshot/latest/:userId/:workspaceId
 */
async function getLatestSnapshot(req, res) {
  try {
    const { userId, workspaceId } = req.params;

    const snapshot = await prisma.productivitySnapshot.findFirst({
      where: {
        userId: parseInt(userId),
        workspaceId: parseInt(workspaceId)
      },
      orderBy: { generatedAt: "desc" }
    });

    if (!snapshot) {
      return res.status(404).json({
        error: "No productivity snapshot found"
      });
    }

    res.json({
      success: true,
      data: snapshot
    });
  } catch (error) {
    console.error("Error fetching latest snapshot:", error);
    res.status(500).json({
      error: "Failed to fetch latest snapshot",
      details: error.message
    });
  }
}

/**
 * Generate snapshots for all users in a workspace (admin only)
 * POST /api/productivity/workspace/:workspaceId/generate-all
 */
async function generateWorkspaceSnapshots(req, res) {
  try {
    const { workspaceId } = req.params;
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "Missing required fields: startDate, endDate"
      });
    }

    // Get the workspace to include the owner
    const workspace = await prisma.workspace.findUnique({
      where: { id: parseInt(workspaceId) },
      select: { ownerId: true }
    });

    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    // Get all members of the workspace
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: parseInt(workspaceId) },
      select: { userId: true }
    });

    // Combine owner + members (avoid duplicates)
    const allUserIds = new Set([workspace.ownerId, ...members.map(m => m.userId)]);

    const results = [];
    const errors = [];

    // Generate snapshot for each user (owner + members)
    for (const memberId of allUserIds) {
      try {
        const snapshot = await generateMonthlySnapshot(
          memberId,
          parseInt(workspaceId),
          new Date(startDate),
          new Date(endDate)
        );

        if (snapshot) {
          results.push({
            userId: memberId,
            status: "success",
            snapshot
          });
        } else {
          results.push({
            userId: memberId,
            status: "no_data"
          });
        }
      } catch (error) {
        errors.push({
          userId: memberId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Generated ${results.length} snapshots`,
      generated: results.filter(r => r.status === "success").length,
      noData: results.filter(r => r.status === "no_data").length,
      errors: errors.length,
      details: { results, errors }
    });
  } catch (error) {
    console.error("Error generating workspace snapshots:", error);
    res.status(500).json({
      error: "Failed to generate workspace snapshots",
      details: error.message
    });
  }
}

module.exports = {
  createProductivitySnapshot,
  getProductivitySnapshots,
  getLatestSnapshot,
  generateWorkspaceSnapshots
};

