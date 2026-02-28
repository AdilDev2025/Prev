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

/**
 * Get all productivity snapshots for every member of a workspace (admin)
 * GET /api/productivity/workspace/:workspaceId/snapshots
 */
async function getWorkspaceAllSnapshots(req, res) {
  try {
    const { workspaceId } = req.params;
    const { limit = 50 } = req.query;

    const snapshots = await prisma.productivitySnapshot.findMany({
      where: { workspaceId: parseInt(workspaceId) },
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { generatedAt: "desc" },
      take: parseInt(limit)
    });

    res.json({
      success: true,
      count: snapshots.length,
      data: snapshots
    });
  } catch (error) {
    console.error("Error fetching workspace snapshots:", error);
    res.status(500).json({
      error: "Failed to fetch workspace snapshots",
      details: error.message
    });
  }
}

/**
 * Get live hours for a single user (completed sessions + active session)
 * GET /api/productivity/live-hours/:userId/:workspaceId
 */
async function getLiveHours(req, res) {
  try {
    const { userId, workspaceId } = req.params;
    const uid = parseInt(userId);
    const wid = parseInt(workspaceId);

    // Current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // All attendance records this month
    const records = await prisma.attendance.findMany({
      where: { userId: uid, workspaceId: wid, check_in: { gte: monthStart } }
    });

    // Completed sessions
    const completed = records.filter(r => r.check_out != null);
    const completedHours = completed.reduce((sum, r) => sum + (r.sessionDuration || 0), 0);
    const completedAfterHours = completed
      .filter(r => r.isAfterHours)
      .reduce((sum, r) => sum + Math.max(0, (r.sessionDuration || 0) - 8), 0);

    // Active session (open, no check_out)
    const activeSession = records.find(r => r.check_out == null);
    let activeHours = 0;
    let activeAfterHours = 0;
    if (activeSession) {
      activeHours = (now - new Date(activeSession.check_in)) / (1000 * 60 * 60);
      activeAfterHours = Math.max(0, activeHours - 8);
    }

    // Today's hours
    const todayRecords = records.filter(r => new Date(r.check_in) >= todayStart);
    const todayCompleted = todayRecords.filter(r => r.check_out != null);
    const todayCompletedHours = todayCompleted.reduce((sum, r) => sum + (r.sessionDuration || 0), 0);
    const todayActiveHours = activeSession && new Date(activeSession.check_in) >= todayStart ? activeHours : 0;

    res.json({
      success: true,
      data: {
        userId: uid,
        month: {
          total_hours: parseFloat((completedHours + activeHours).toFixed(2)),
          completed_hours: parseFloat(completedHours.toFixed(2)),
          after_hours: parseFloat((completedAfterHours + activeAfterHours).toFixed(2)),
          sessions_count: completed.length + (activeSession ? 1 : 0)
        },
        today: {
          total_hours: parseFloat((todayCompletedHours + todayActiveHours).toFixed(2)),
          completed_hours: parseFloat(todayCompletedHours.toFixed(2)),
          active_hours: parseFloat(todayActiveHours.toFixed(2))
        },
        active_session: activeSession ? {
          id: activeSession.id,
          check_in: activeSession.check_in,
          elapsed_hours: parseFloat(activeHours.toFixed(2)),
          regular_hours: parseFloat(Math.min(activeHours, 8).toFixed(2)),
          after_hours: parseFloat(activeAfterHours.toFixed(2))
        } : null
      }
    });
  } catch (error) {
    console.error("Error fetching live hours:", error);
    res.status(500).json({ error: "Failed to fetch live hours", details: error.message });
  }
}

/**
 * Get live hours for ALL workspace members (admin)
 * GET /api/productivity/workspace/:workspaceId/live-hours
 */
async function getWorkspaceLiveHours(req, res) {
  try {
    const { workspaceId } = req.params;
    const wid = parseInt(workspaceId);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Get workspace + all members
    const workspace = await prisma.workspace.findUnique({
      where: { id: wid },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        WorkspaceMember: { include: { users: { select: { id: true, name: true, email: true } } } }
      }
    });

    if (!workspace) return res.status(404).json({ error: "Workspace not found" });

    // Only non-admin members (employees)
    const employees = workspace.WorkspaceMember
      .filter(m => m.role !== 'admin')
      .map(m => m.users);

    // Get all attendance this month for the workspace
    const allRecords = await prisma.attendance.findMany({
      where: { workspaceId: wid, check_in: { gte: monthStart } }
    });

    const result = employees.map(emp => {
      const records = allRecords.filter(r => r.userId === emp.id);
      const completed = records.filter(r => r.check_out != null);
      const completedHours = completed.reduce((sum, r) => sum + (r.sessionDuration || 0), 0);
      const completedAfterHours = completed
        .filter(r => r.isAfterHours)
        .reduce((sum, r) => sum + Math.max(0, (r.sessionDuration || 0) - 8), 0);

      const activeSession = records.find(r => r.check_out == null);
      let activeHours = 0;
      let activeAfterHours = 0;
      if (activeSession) {
        activeHours = (now - new Date(activeSession.check_in)) / (1000 * 60 * 60);
        activeAfterHours = Math.max(0, activeHours - 8);
      }

      const todayRecords = records.filter(r => new Date(r.check_in) >= todayStart);
      const todayCompleted = todayRecords.filter(r => r.check_out != null);
      const todayHours = todayCompleted.reduce((sum, r) => sum + (r.sessionDuration || 0), 0)
        + (activeSession && new Date(activeSession.check_in) >= todayStart ? activeHours : 0);

      return {
        user_id: emp.id,
        name: emp.name,
        email: emp.email,
        is_active: !!activeSession,
        today_hours: parseFloat(todayHours.toFixed(2)),
        month_hours: parseFloat((completedHours + activeHours).toFixed(2)),
        month_after_hours: parseFloat((completedAfterHours + activeAfterHours).toFixed(2)),
        sessions_count: completed.length + (activeSession ? 1 : 0),
        active_since: activeSession ? activeSession.check_in : null
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching workspace live hours:", error);
    res.status(500).json({ error: "Failed to fetch workspace live hours", details: error.message });
  }
}

module.exports = {
  createProductivitySnapshot,
  getProductivitySnapshots,
  getLatestSnapshot,
  generateWorkspaceSnapshots,
  getWorkspaceAllSnapshots,
  getLiveHours,
  getWorkspaceLiveHours
};

