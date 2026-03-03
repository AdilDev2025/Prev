const axios = require('axios')
const FormData = require('form-data')
const prisma = require('../../lib/prisma')
const crypto = require('crypto')
const { postCheckoutSnapshot } = require('../../services/productivity_services')

// Facial API configuration - read at call time to ensure dotenv has loaded
const getFacialApiUrl = () => process.env.FACIAL_API_URL || 'http://localhost:8000';

// ─── Attendance thresholds (hours) ───
const REGULAR_HOURS_THRESHOLD = 8;   // after 8h → afterHours starts
const AUTO_CHECKOUT_HOURS = 12;      // after 12h → auto-close session, new check-in starts fresh

const computeQdrantId = (user_id) => {
    const hex = crypto.createHash('md5').update(`${user_id}_face`).digest('hex');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};

// ─── Helper: detect if facial API is unreachable ───
function isServiceDown(error) {
    return error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' ||
        error.code === 'ERR_NETWORK' || error.code === 'ERR_BAD_RESPONSE' ||
        (error.cause && error.cause.code === 'ECONNREFUSED') ||
        (error.message && error.message.includes('ECONNREFUSED'));
}

// ─── Helper: auto-close stale sessions (>12h without checkout) ───
async function autoCloseStaleSession(userId, workspaceId) {
    const openSession = await prisma.attendance.findFirst({
        where: { userId, workspaceId, check_out: null },
        orderBy: { check_in: 'desc' }
    });

    if (!openSession) return null;

    const now = new Date();
    const elapsed = (now - new Date(openSession.check_in)) / (1000 * 60 * 60); // hours

    if (elapsed >= AUTO_CHECKOUT_HOURS) {
        // Auto-close at exactly 12h after check-in
        const autoCheckout = new Date(new Date(openSession.check_in).getTime() + AUTO_CHECKOUT_HOURS * 60 * 60 * 1000);
        const sessionDuration = AUTO_CHECKOUT_HOURS;

        await prisma.attendance.update({
            where: { id: openSession.id },
            data: {
                check_out: autoCheckout,
                sessionDuration: sessionDuration,
                isAfterHours: sessionDuration > REGULAR_HOURS_THRESHOLD,
                status: 'PRESENT'
            }
        });

        // Fire-and-forget: auto-generate productivity snapshot for the auto-closed session
        postCheckoutSnapshot(userId, workspaceId, openSession.check_in);

        return null; // session is now closed, caller can create new one
    }

    return openSession; // still open and within 12h
}

// ═══════════════════════════════════════════════════════════════
// REGISTER FACE (unchanged logic — employees only)
// ═══════════════════════════════════════════════════════════════
const registerForAttendance = async (req, res) => {
    try {
        const workspaceId = parseInt(req.params.workspaceId);
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: "Authentication required" });
        if (!req.file || !req.file.buffer) return res.status(400).json({ message: "Face image is required" });

        const faceImageBuffer = req.file.buffer;

        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { name: true, user_id: true, face_registered: true }
        });
        if (!user) return res.status(404).json({ message: "User not found" });

        const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
        if (!workspace) return res.status(404).json({ message: "Workspace not found" });

        if (workspace.ownerId === userId) {
            return res.status(403).json({ message: "Admin/owner is exempt from attendance. Only employees need to register their face." });
        }

        const workspaceMember = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } }
        });
        if (!workspaceMember) return res.status(403).json({ message: "Not a member of this workspace" });
        if (workspaceMember.role === 'admin') {
            return res.status(403).json({ message: "Admins are exempt from attendance." });
        }

        if (user.face_registered) {
            return res.status(400).json({ message: "Face already registered for this user" });
        }

        const user_id = `ws${workspaceId}_user${userId}`;

        const formData = new FormData();
        formData.append('file', faceImageBuffer, { filename: 'face.jpg', contentType: 'image/jpeg' });

        const enrollmentResponse = await axios({
            method: 'POST',
            url: `${getFacialApiUrl()}/enroll-face?user_id=${user_id}&user_name=${encodeURIComponent(user.name)}`,
            data: formData,
            headers: formData.getHeaders()
        });

        if (enrollmentResponse.data.status === 'success') {
            await prisma.users.update({
                where: { id: userId },
                data: { user_id: user_id, face_registered: true }
            });

            const qdrantId = enrollmentResponse.data.qdrant_id || computeQdrantId(user_id);
            const faceEmbedding = await prisma.faceEmbedding.create({
                data: { userId, qdrant_id: qdrantId, is_active: true }
            });

            res.status(200).json({
                message: "Face registered successfully for attendance",
                user_id, workspace_id: workspaceId,
                embedding_id: faceEmbedding.id, embedding_created: true
            });
        } else {
            res.status(400).json({ message: "Face enrollment failed", details: enrollmentResponse.data.message });
        }
    } catch (error) {
        console.error("Face registration error:", error.code, error.message);
        if (isServiceDown(error)) {
            return res.status(503).json({
                message: "Facial recognition service is not running.",
                service: "facial-api", error: error.message
            });
        }
        res.status(500).json({ message: "Face registration failed", error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// Helper: call Python facial API and verify workspace membership
// Returns { recognizedUserId, recognitionResult } or sends error response
// ═══════════════════════════════════════════════════════════════
async function recognizeFaceAndVerify(req, res, workspaceId) {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ message: "Authentication required" }); return null; }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) { res.status(404).json({ message: "Workspace not found" }); return null; }

    if (workspace.ownerId === userId) {
        res.status(403).json({ message: "Admin/owner is exempt from attendance." });
        return null;
    }

    const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } }
    });
    if (!member) { res.status(403).json({ message: "Not a member of this workspace" }); return null; }
    if (member.role === 'admin') {
        res.status(403).json({ message: "Admins are exempt from attendance." });
        return null;
    }

    if (!req.file || !req.file.buffer) {
        res.status(400).json({ message: "Face image is required" });
        return null;
    }

    const formData = new FormData();
    formData.append('file', req.file.buffer, { filename: 'face.jpg', contentType: 'image/jpeg' });

    const recognitionResponse = await axios({
        method: 'POST',
        url: `${getFacialApiUrl()}/attendance-recognition`,
        data: formData,
        headers: formData.getHeaders()
    });

    const result = recognitionResponse.data;
    if (result.status !== 'success') {
        res.status(404).json({
            message: result.message || "Face not recognized",
            status: "recognition_failed", workspace_id: workspaceId
        });
        return null;
    }

    const match = result.user_id.match(/^ws(\d+)_user(\d+)$/);
    if (!match) { res.status(400).json({ message: "Invalid recognition result format" }); return null; }

    const recognizedWs = parseInt(match[1]);
    const recognizedUser = parseInt(match[2]);

    if (recognizedWs !== workspaceId) {
        res.status(403).json({ message: "Recognized user belongs to a different workspace" });
        return null;
    }

    // ─── IDENTITY CHECK: recognized face MUST match the logged-in user ───
    // Prevents User A from marking attendance using User B's face
    if (recognizedUser !== userId) {
        res.status(403).json({
            message: "Face does not match your account. You can only mark your own attendance.",
            status: "identity_mismatch"
        });
        return null;
    }

    // Verify recognized user is still a member
    if (workspace.ownerId !== recognizedUser) {
        const rmember = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: recognizedWs, userId: recognizedUser } }
        });
        if (!rmember) {
            res.status(403).json({ message: "Recognized user is no longer a workspace member" });
            return null;
        }
    }

    return { recognizedUserId: recognizedUser, recognitionResult: result };
}

// ═══════════════════════════════════════════════════════════════
// CHECK-IN  (POST /:workspaceId/attendance/mark-attendance)
// ═══════════════════════════════════════════════════════════════
const attendance_WM = async (req, res) => {
    try {
        const workspaceId = parseInt(req.params.workspaceId);

        const verified = await recognizeFaceAndVerify(req, res, workspaceId);
        if (!verified) return; // response already sent

        const { recognizedUserId, recognitionResult } = verified;

        // Auto-close stale sessions (>12h)
        const openSession = await autoCloseStaleSession(recognizedUserId, workspaceId);

        if (openSession) {
            // User already checked in — tell them to check out first
            const elapsed = ((new Date() - new Date(openSession.check_in)) / (1000 * 60 * 60)).toFixed(1);
            return res.status(409).json({
                message: `You are already checked in since ${new Date(openSession.check_in).toLocaleTimeString()}. Please check out first.`,
                status: "already_checked_in",
                session: {
                    id: openSession.id,
                    check_in: openSession.check_in,
                    elapsed_hours: parseFloat(elapsed)
                },
                workspace_id: workspaceId
            });
        }

        // Create new check-in
        const attendance = await prisma.attendance.create({
            data: {
                userId: recognizedUserId,
                workspaceId,
                confidence: recognitionResult.confidence,
                location: `Workspace ${workspaceId}`,
                status: "PRESENT"
            }
        });

        res.status(200).json({
            message: "Checked in successfully",
            action: "check_in",
            recognized_user: {
                user_id: recognitionResult.user_id,
                user_name: recognitionResult.user_name,
                confidence: recognitionResult.confidence
            },
            attendance_record: {
                id: attendance.id,
                status: attendance.status,
                location: attendance.location,
                timestamp: attendance.check_in
            },
            workspace_id: workspaceId
        });

    } catch (error) {
        console.error("Check-in error:", error.code, error.message);
        if (isServiceDown(error)) {
            return res.status(503).json({
                message: "Facial recognition service is not running.",
                service: "facial-api", error: error.message
            });
        }
        res.status(500).json({ message: "Check-in failed", error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// CHECK-OUT  (POST /:workspaceId/attendance/check-out)
// ═══════════════════════════════════════════════════════════════
const checkout_WM = async (req, res) => {
    try {
        const workspaceId = parseInt(req.params.workspaceId);

        const verified = await recognizeFaceAndVerify(req, res, workspaceId);
        if (!verified) return;

        const { recognizedUserId, recognitionResult } = verified;

        // Find open session
        const openSession = await prisma.attendance.findFirst({
            where: { userId: recognizedUserId, workspaceId, check_out: null },
            orderBy: { check_in: 'desc' }
        });

        if (!openSession) {
            return res.status(404).json({
                message: "No active check-in found. Please check in first.",
                status: "not_checked_in",
                workspace_id: workspaceId
            });
        }

        const now = new Date();
        const checkInTime = new Date(openSession.check_in);
        const sessionDuration = (now - checkInTime) / (1000 * 60 * 60); // hours

        // If session >12h, auto-close at 12h mark and tell user
        let checkOutTime = now;
        let finalDuration = sessionDuration;
        if (sessionDuration >= AUTO_CHECKOUT_HOURS) {
            checkOutTime = new Date(checkInTime.getTime() + AUTO_CHECKOUT_HOURS * 60 * 60 * 1000);
            finalDuration = AUTO_CHECKOUT_HOURS;
        }

        const finalAfterHours = Math.max(0, finalDuration - REGULAR_HOURS_THRESHOLD);

        const updated = await prisma.attendance.update({
            where: { id: openSession.id },
            data: {
                check_out: checkOutTime,
                sessionDuration: parseFloat(finalDuration.toFixed(2)),
                isAfterHours: finalAfterHours > 0
            }
        });

        // Fire-and-forget: auto-generate daily + monthly productivity snapshots
        postCheckoutSnapshot(recognizedUserId, workspaceId, openSession.check_in);

        res.status(200).json({
            message: "Checked out successfully",
            action: "check_out",
            recognized_user: {
                user_id: recognitionResult.user_id,
                user_name: recognitionResult.user_name,
                confidence: recognitionResult.confidence
            },
            attendance_record: {
                id: updated.id,
                check_in: updated.check_in,
                check_out: updated.check_out,
                session_duration_hours: parseFloat(finalDuration.toFixed(2)),
                regular_hours: parseFloat(Math.min(finalDuration, REGULAR_HOURS_THRESHOLD).toFixed(2)),
                after_hours: parseFloat(finalAfterHours.toFixed(2)),
                is_after_hours: finalAfterHours > 0,
                status: updated.status
            },
            workspace_id: workspaceId
        });

    } catch (error) {
        console.error("Check-out error:", error.code, error.message);
        if (isServiceDown(error)) {
            return res.status(503).json({
                message: "Facial recognition service is not running.",
                service: "facial-api", error: error.message
            });
        }
        res.status(500).json({ message: "Check-out failed", error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// ATTENDANCE STATUS (GET /:workspaceId/attendance/status)
// Returns whether the current user has an open session
// ═══════════════════════════════════════════════════════════════
const getAttendanceStatus = async (req, res) => {
    try {
        const workspaceId = parseInt(req.params.workspaceId);
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: "Authentication required" });

        // Auto-close stale sessions first
        await autoCloseStaleSession(userId, workspaceId);

        const openSession = await prisma.attendance.findFirst({
            where: { userId, workspaceId, check_out: null },
            orderBy: { check_in: 'desc' }
        });

        if (openSession) {
            const now = new Date();
            const elapsed = (now - new Date(openSession.check_in)) / (1000 * 60 * 60);
            const afterHours = Math.max(0, elapsed - REGULAR_HOURS_THRESHOLD);

            return res.json({
                checked_in: true,
                session: {
                    id: openSession.id,
                    check_in: openSession.check_in,
                    elapsed_hours: parseFloat(elapsed.toFixed(2)),
                    regular_hours: parseFloat(Math.min(elapsed, REGULAR_HOURS_THRESHOLD).toFixed(2)),
                    after_hours: parseFloat(afterHours.toFixed(2)),
                    is_after_hours: afterHours > 0
                }
            });
        }

        res.json({ checked_in: false, session: null });

    } catch (error) {
        console.error("Status check error:", error.message);
        res.status(500).json({ message: "Failed to check status", error: error.message });
    }
};

module.exports = {
    registerForAttendance,
    attendance_WM,
    checkout_WM,
    getAttendanceStatus
};