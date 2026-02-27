const prisma = require("../lib/prisma");
const {
    calculateAttendanceScore,
    calculateReliabilityScore,
    calculateFinalScore
} = require("../utils/scoring.utils");

async function generateMonthlySnapshot(userId, workspaceId, startDate, endDate) {
    const attendanceRecords = await prisma.attendance.findMany({
        where: {
            userId,
            workspaceId,
            check_in: {
                gte: startDate,
                lte: endDate
            }
        }
    });

    if (!attendanceRecords.length) return null;

    // ---- AGGREGATION ----
    const totalHours = attendanceRecords.reduce(
        (sum, record) => sum + (record.sessionDuration || 0),
        0
    );

    const avgConfidence =
        attendanceRecords.reduce((sum, record) => sum + (record.confidence || 0), 0) /
        attendanceRecords.length;

    const afterHours = attendanceRecords
        .filter(r => r.isAfterHours)
        .reduce((sum, r) => sum + (r.sessionDuration || 0), 0);

    // ---- SCORING ----
    const attendanceScore = calculateAttendanceScore(avgConfidence, totalHours, 160);
    const reliabilityScore = calculateReliabilityScore(avgConfidence, attendanceRecords);
    const finalScore = calculateFinalScore(attendanceScore, reliabilityScore, afterHours);

    // ---- STORE SNAPSHOT ----
    return prisma.productivitySnapshot.create({
        data: {
            userId,
            workspaceId,
            attendanceScore,
            reliabilityScore,
            totalHours,
            avgConfidence,
            afterHours,
            finalScore,
            periodType: "monthly",
            periodStart: startDate,
            periodEnd: endDate
        }
    });
}

module.exports = { generateMonthlySnapshot };