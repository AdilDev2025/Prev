/**
 * Calculate attendance score based on confidence and hours worked
 * @param {number} avgConfidence - Average facial recognition confidence (0-1)
 * @param {number} totalHours - Total hours worked in the period
 * @param {number} expectedHours - Expected hours for the period (default: 160 for monthly)
 * @returns {number} Score between 0 and 1
 */
function calculateAttendanceScore(avgConfidence, totalHours, expectedHours = 160) {
    // Normalize hours worked (cap at 1.0 even if overtime)
    const hoursWeight = Math.min(totalHours / expectedHours, 1.0);

    // Weight: 60% confidence quality, 40% hours completion
    return (avgConfidence * 0.6) + (hoursWeight * 0.4);
}

/**
 * Calculate reliability score based on consistency and anomalies
 * @param {number} avgConfidence - Average confidence score
 * @param {Array} attendanceRecords - All attendance records for analysis
 * @returns {number} Score between 0 and 1
 */
function calculateReliabilityScore(avgConfidence, attendanceRecords = []) {
    if (!attendanceRecords.length) return avgConfidence;

    // 1. Base score from confidence
    let reliabilityScore = avgConfidence;

    // 2. Consistency penalty: check variance in confidence scores
    const confidences = attendanceRecords
        .map(r => r.confidence || 0)
        .filter(c => c > 0);

    if (confidences.length > 1) {
        const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
        const variance = confidences.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / confidences.length;
        const stdDev = Math.sqrt(variance);

        // High variance (inconsistent recognition) = penalty up to 0.15
        const consistencyPenalty = Math.min(stdDev * 0.3, 0.15);
        reliabilityScore -= consistencyPenalty;
    }

    // 3. Anomaly detection: very low confidence sessions
    const lowConfidenceCount = attendanceRecords.filter(r => (r.confidence || 0) < 0.7).length;
    const anomalyPenalty = (lowConfidenceCount / attendanceRecords.length) * 0.1;
    reliabilityScore -= anomalyPenalty;

    // 4. Embedding drift penalty (if available)
    const driftRecords = attendanceRecords.filter(r => r.embeddingDrift != null);
    if (driftRecords.length > 0) {
        const avgDrift = driftRecords.reduce((sum, r) => sum + r.embeddingDrift, 0) / driftRecords.length;
        // High drift indicates face changes/inconsistency
        const driftPenalty = Math.min(avgDrift * 0.05, 0.1);
        reliabilityScore -= driftPenalty;
    }

    return Math.max(reliabilityScore, 0);
}

/**
 * Calculate final productivity score
 * @param {number} attendanceScore - Attendance score (0-1)
 * @param {number} reliabilityScore - Reliability score (0-1)
 * @param {number} afterHoursBonus - Hours worked after standard hours
 * @returns {number} Final score out of 100
 */
function calculateFinalScore(attendanceScore, reliabilityScore, afterHoursBonus = 0) {
    // Base score: 70% attendance, 30% reliability
    let finalScore = (attendanceScore * 0.7) + (reliabilityScore * 0.3);

    // Bonus for after-hours work (up to 5% boost)
    const bonus = Math.min(afterHoursBonus / 40, 0.05); // max bonus at 40 after-hours
    finalScore += bonus;

    // Convert to 0-100 scale and cap at 100
    return Math.min(finalScore * 100, 100);
}

module.exports = {
    calculateAttendanceScore,
    calculateReliabilityScore,
    calculateFinalScore
};