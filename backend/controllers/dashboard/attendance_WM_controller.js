const axios = require('axios')
const FormData = require('form-data')
const prisma = require('../../lib/prisma')
const crypto = require('crypto')

// Facial API configuration
const FACIAL_API_URL = process.env.FACIAL_API_URL || 'http://localhost:8000';

const computeQdrantId = (user_id) => {
    // Must match Python: hashlib.md5(f"{user_id}_face".encode()).hexdigest()
    return crypto.createHash('md5').update(`${user_id}_face`).digest('hex');
};

const registerForAttendance = async (req, res) => {
    try {
        const workspaceId = parseInt(req.params.workspaceId);
        const userId = req.user?.userId;

        // Authentication check
        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        // File validation
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ message: "Face image is required" });
        }

        const faceImageBuffer = req.file.buffer;

        // Get user details
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { name: true, user_id: true, face_registered: true }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Verify workspace membership
        const workspaceMember = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: workspaceId,
                    userId: userId
                }
            }
        });

        if (!workspaceMember) {
            return res.status(403).json({ message: "Not a member of this workspace" });
        }

        // Check if face already registered
        if (user.face_registered) {
            return res.status(400).json({ message: "Face already registered for this user" });
        }

        // Generate unique user_id for facial recognition
        const user_id = `ws${workspaceId}_user${userId}`;

        // Prepare form data for Python API
        const formData = new FormData();
        formData.append('file', faceImageBuffer, {
            filename: 'face.jpg',
            contentType: 'image/jpeg'
        });

        // Call Python facial recognition API
        const enrollmentResponse = await axios({
            method: 'POST',
            url: `${FACIAL_API_URL}/enroll-face?user_id=${user_id}&user_name=${encodeURIComponent(user.name)}`,
            data: formData,
            headers: formData.getHeaders()
        });

        // Check enrollment success
        if (enrollmentResponse.data.status === 'success') {
            // Update user record with face registration status
            await prisma.users.update({
                where: { id: userId },
                data: {
                    user_id: user_id,
                    face_registered: true
                }
            });

            // Create face embedding record for tracking
            const qdrantId = enrollmentResponse.data.qdrant_id || computeQdrantId(user_id);
            const faceEmbedding = await prisma.faceEmbedding.create({
                data: {
                    user_id: user_id,
                    qdrant_id: qdrantId,
                    is_active: true
                }
            });

            res.status(200).json({
                message: "Face registered successfully for attendance",
                user_id: user_id,
                workspace_id: workspaceId,
                embedding_id: faceEmbedding.id,
                embedding_created: true
            });
        } else {
            res.status(400).json({
                message: "Face enrollment failed",
                details: enrollmentResponse.data.message
            });
        }

    } catch (error) {
        console.error("Face registration error:", error);
        res.status(500).json({
            message: "Face registration failed",
            error: error.message
        });
    }
};

// Attendance Recognition for Workspace Members
// Recognizes faces and logs attendance in Prisma Attendance table
const attendance_WM = async (req, res) => {
    try {
        const workspaceId = parseInt(req.params.workspaceId);
        const userId = req.user?.userId;

        // Authentication check
        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        // Verify workspace membership (user must be member to mark attendance)
        const checkMemberOfWorkspace = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: workspaceId,
                    userId: userId
                }
            }
        });

        if (!checkMemberOfWorkspace) {
            return res.status(403).json({ message: "Not a member of this workspace" });
        }

        // File validation
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ message: "Face image is required" });
        }

        const faceImageBuffer = req.file.buffer;

        // Prepare form data for Python recognition API
        const formData = new FormData();
        formData.append('file', faceImageBuffer, {
            filename: 'face.jpg',
            contentType: 'image/jpeg'
        });

        // Call Python facial recognition API for recognition
        const recognitionResponse = await axios({
            method: 'POST',
            url: `${FACIAL_API_URL}/attendance-recognition`,
            data: formData,
            headers: formData.getHeaders()
        });

        const recognitionResult = recognitionResponse.data;

        if (recognitionResult.status === 'success') {
            // Parse the recognized user_id to verify workspace
            const recognized_user_id = recognitionResult.user_id;
            const match = recognized_user_id.match(/^ws(\d+)_user(\d+)$/);

            if (!match) {
                return res.status(400).json({ message: "Invalid recognition result format" });
            }

            const recognizedWorkspaceId = parseInt(match[1]);
            const recognizedUserId = parseInt(match[2]);

            // Verify the recognized user belongs to the requested workspace
            if (recognizedWorkspaceId !== workspaceId) {
                return res.status(403).json({
                    message: "Recognized user belongs to a different workspace"
                });
            }

            // Verify the recognized user is still a workspace member
            const recognizedMember = await prisma.workspaceMember.findUnique({
                where: {
                    workspaceId_userId: {
                        workspaceId: recognizedWorkspaceId,
                        userId: recognizedUserId
                    }
                }
            });

            if (!recognizedMember) {
                return res.status(403).json({
                    message: "Recognized user is no longer a workspace member"
                });
            }

            // Log attendance in database
            const attendance = await prisma.attendance.create({
                data: {
                    user_id: recognized_user_id,
                    confidence: recognitionResult.confidence,
                    location: `Workspace ${workspaceId}`,
                    status: "present"
                }
            });

            res.status(200).json({
                message: "Attendance marked successfully",
                recognized_user: {
                    user_id: recognized_user_id,
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

        } else {
            res.status(404).json({
                message: recognitionResult.message || "Face not recognized",
                status: "recognition_failed",
                workspace_id: workspaceId
            });
        }

    } catch (error) {
        console.error("Attendance recognition error:", error);
        res.status(500).json({
            message: "Attendance recognition failed",
            error: error.message
        });
    }
};


module.exports = {
    registerForAttendance,
    attendance_WM
};