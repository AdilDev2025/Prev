const prisma = require("../lib/prisma");
const {
    calculateAttendanceScore,
    calculateReliabilityScore,
    calculateFinalScore
} = require("../utils/scoring.utils");

/**
 * Core aggregation logic — shared by daily and monthly snapshot generators
 */
function aggregateAttendanceMetrics(attendanceRecords) {
    const completedRecords = attendanceRecords.filter(r => r.check_out != null);

    const totalHours = completedRecords.reduce(
        (sum, record) => sum + (record.sessionDuration || 0), 0
    );

    const recordsWithConfidence = attendanceRecords.filter(r => r.confidence != null && r.confidence > 0);
    const avgConfidence = recordsWithConfidence.length > 0
        ? recordsWithConfidence.reduce((sum, record) => sum + record.confidence, 0) / recordsWithConfidence.length
        : 0;

    const afterHours = completedRecords
        .filter(r => r.isAfterHours)
        .reduce((sum, r) => sum + Math.max(0, (r.sessionDuration || 0) - 8), 0);

    return { totalHours, avgConfidence, afterHours, completedSessions: completedRecords.length };
}

/**
 * Generic snapshot generator — handles both daily and monthly periods with upsert
 */
async function generateSnapshot(userId, workspaceId, startDate, endDate, periodType) {
    const attendanceRecords = await prisma.attendance.findMany({
        where: {
            userId,
            workspaceId,
            check_in: { gte: startDate, lte: endDate }
        }
    });

    if (!attendanceRecords.length) return null;

    const { totalHours, avgConfidence, afterHours } = aggregateAttendanceMetrics(attendanceRecords);

    // For daily snapshots, expected hours = 8; for monthly = 160
    const expectedHours = periodType === "daily" ? 8 : 160;
    const attendanceScore = calculateAttendanceScore(avgConfidence, totalHours, expectedHours);
    const reliabilityScore = calculateReliabilityScore(avgConfidence, attendanceRecords);
    const finalScore = calculateFinalScore(attendanceScore, reliabilityScore, afterHours);

    const snapshotData = {
        attendanceScore,
        reliabilityScore,
        totalHours,
        avgConfidence,
        afterHours,
        finalScore,
        periodType,
        periodStart: startDate,
        periodEnd: endDate,
        generatedAt: new Date()
    };

    // Upsert: update existing snapshot for same user+workspace+period, or create new
    const existing = await prisma.productivitySnapshot.findFirst({
        where: { userId, workspaceId, periodType, periodStart: startDate, periodEnd: endDate }
    });

    if (existing) {
        return prisma.productivitySnapshot.update({
            where: { id: existing.id },
            data: snapshotData
        });
    }

    return prisma.productivitySnapshot.create({
        data: { userId, workspaceId, ...snapshotData }
    });
}

/**
 * Generate monthly snapshot (used by manual "Generate Snapshot" button and admin generate-all)
 */
async function generateMonthlySnapshot(userId, workspaceId, startDate, endDate) {
    return generateSnapshot(userId, workspaceId, startDate, endDate, "monthly");
}

/**
 * Auto-generate snapshots after a checkout event.
 * Creates/updates:
 *   1. A daily snapshot for the check-in day
 *   2. The rolling monthly snapshot for the current month
 *
 * This runs fire-and-forget — errors are logged but don't block the checkout response.
 */
async function postCheckoutSnapshot(userId, workspaceId, checkInTime) {
    try {
        // 1. Daily snapshot for the day the session started
        const sessionDate = new Date(checkInTime);
        const dayStart = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        await generateSnapshot(userId, workspaceId, dayStart, dayEnd, "daily");

        // 2. Rolling monthly snapshot for the month of the session
        const monthStart = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), 1);
        const monthEnd = new Date(sessionDate.getFullYear(), sessionDate.getMonth() + 1, 0, 23, 59, 59, 999);

        await generateSnapshot(userId, workspaceId, monthStart, monthEnd, "monthly");

        console.log(`[Productivity] Auto-generated daily + monthly snapshots for user ${userId}, workspace ${workspaceId}`);
    } catch (error) {
        // Log but never throw — this must not break checkout
        console.error(`[Productivity] Auto-snapshot failed for user ${userId}:`, error.message);
    }
}

module.exports = { generateMonthlySnapshot, postCheckoutSnapshot };
