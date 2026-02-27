const prisma = require('../../lib/prisma');
const getAdminDashboard = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get workspaces where user is admin/owner
        const adminWorkspaces = await prisma.workspace.findMany({
            where: {
                OR: [
                    { ownerId: userId },  // Owner
                    {
                        WorkspaceMember: {
                            some: {
                                userId: userId,
                                role: 'admin'  // Admin member
                            }
                        }
                    }
                ]
            },
            include: {
                WorkspaceMember: {
                    include: {
                        users: {
                            select: { id: true, name: true, email: true, face_registered: true }
                        }
                    }
                },
                Invite: true
            }
        });

        // Calculate stats
        const stats = {
            totalWorkspaces: adminWorkspaces.length,
            totalMembers: adminWorkspaces.reduce((sum, ws) => sum + ws.WorkspaceMember.length + 1, 0),
            pendingInvites: adminWorkspaces.reduce((sum, ws) => sum + ws.Invite.filter(inv => inv.status === 'PENDING').length, 0),
            totalInvites: adminWorkspaces.reduce((sum, ws) => sum + ws.Invite.length, 0)
        };

        res.status(200).json({
            user: {
                id: req.user.userId,
                name: req.user.name,
                email: req.user.email,
                role: 'admin'
            },
            workspaces: adminWorkspaces,
            stats
        });
    } catch (error) {
        console.error("Admin dashboard error:", error);
        res.status(500).json({message: "Internal server error"});
    }
};

const getEmployeeDashboard = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get workspaces where user is regular member
        const memberWorkspaces = await prisma.workspace.findMany({
            where: {
                AND: [
                    {
                        WorkspaceMember: {
                            some: {
                                userId: userId,
                                role: 'user'  // Regular user, not admin
                            }
                        }
                    },
                    { ownerId: { not: userId } }  // Not owner
                ]
            },
            include: {
                owner: {  // Owner info
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                WorkspaceMember: {
                    where: { userId: userId },
                    select: { role: true }
                }
            }
        });

        res.status(200).json({
            user: {
                id: req.user.userId,
                name: req.user.name,
                email: req.user.email,
                role: 'employee'
            },
            workspaces: memberWorkspaces
        });
    } catch (error) {
        console.error("Employee dashboard error:", error);
        res.status(500).json({message: "Internal server error"});
    }
};

const getUserDashboard = async (req, res) => {
    try {
        const userId = req.user.userId;


        const adminWorkspaces = await prisma.workspace.findMany({
            where: {
                OR: [
                    { ownerId: userId },
                    {
                        WorkspaceMember: {
                            some: {
                                userId: userId,
                                role: 'admin'
                            }
                        }
                    }
                ]
            }
        });


        const memberWorkspaces = await prisma.workspace.findMany({
            where: {
                AND: [
                    {
                        WorkspaceMember: {
                            some: {
                                userId: userId,
                                role: 'user'
                            }
                        }
                    },
                    { ownerId: { not: userId } }
                ]
            }
        });

        // Determine dashboard type
        if (adminWorkspaces.length > 0) {
            return getAdminDashboard(req, res);
        } else if (memberWorkspaces.length > 0) {
            return getEmployeeDashboard(req, res);
        } else {
            // New user with no workspaces
            res.status(200).json({
                user: {
                    id: req.user.userId,
                    name: req.user.name,
                    email: req.user.email,
                    role: 'user'
                },
                workspaces: [],
                message: "Welcome! Create your first workspace or join one via invite."
            });
        }
    } catch (error) {
        console.error("User dashboard error:", error);
        res.status(500).json({message: "Internal server error"});
    }
};

// Workspace Dashboard - Shows specific workspace with components
const getWorkspaceDashboard = async (req, res) => {
    try {
        const workspaceId = parseInt(req.params.workspaceId);
        const userId = req.user.userId;

        // Check if user is workspace owner
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId }
        });

        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" });
        }

        const isOwner = workspace.ownerId === userId;

        // Verify user is a member of this workspace (or owner)
        let membership = null;
        if (!isOwner) {
            membership = await prisma.workspaceMember.findUnique({
                where: {
                    workspaceId_userId: {
                        workspaceId: workspaceId,
                        userId: userId
                    }
                }
            });

            if (!membership) {
                return res.status(403).json({
                    message: "You are not a member of this workspace"
                });
            }
        }

        const userRole = isOwner ? 'admin' : (membership && membership.role) || 'user';

        // Get workspace details with relations
        const workspaceDetails = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                owner: { // Workspace owner
                    select: { id: true, name: true, email: true, face_registered: true }
                },
                WorkspaceMember: {
                    include: {
                        users: {
                            select: { id: true, name: true, email: true, face_registered: true }
                        }
                    }
                }
            }
        });

        if (!workspaceDetails) {
            return res.status(404).json({ message: "Workspace not found" });
        }

        // Get recent attendance records for this workspace
        const recentAttendance = await prisma.attendance.findMany({
            where: {
                workspaceId: workspaceId
            },
            include: {
                user: {
                    select: { name: true }
                }
            },
            orderBy: { check_in: 'desc' },
            take: 10 // Last 10 attendance records
        });

        // Get user's face registration status - check both owner and member
        let userFaceRegistered = false;
        if (isOwner) {
            userFaceRegistered = workspaceDetails.owner.face_registered;
        } else {
            const userDetails = workspaceDetails.WorkspaceMember.find(
                member => member.userId === userId
            );
            userFaceRegistered = userDetails ? userDetails.users.face_registered : false;
        }

        // Calculate workspace stats (include owner in counts)
        const totalMembers = workspaceDetails.WorkspaceMember.length + 1; // +1 for owner
        const registeredFaces = workspaceDetails.WorkspaceMember.filter(
            member => member.users.face_registered
        ).length + (workspaceDetails.owner.face_registered ? 1 : 0);

        res.status(200).json({
            workspace: {
                id: workspaceDetails.id,
                name: workspaceDetails.name,
                owner: workspaceDetails.owner,
                user_role: userRole,
                created_at: workspaceDetails.createdAt
            },
            user: {
                id: req.user.userId,
                name: req.user.name,
                email: req.user.email,
                face_registered: userFaceRegistered
            },
            stats: {
                total_members: totalMembers,
                registered_faces: registeredFaces,
                recent_attendance_count: recentAttendance.length
            },
            recent_attendance: recentAttendance.map(record => ({
                id: record.id,
                user_name: record.user.name,
                check_in: record.check_in,
                confidence: record.confidence,
                status: record.status
            })),
            components: {
                attendance: {
                    available: true,
                    registered: userFaceRegistered,
                    recent_count: recentAttendance.length
                }
                // Core focus: facial attendance only
            },
            actions_available: [
                !userFaceRegistered ? "register_face" : null,
                "mark_attendance"
            ].filter(Boolean)
        });

    } catch (error) {
        console.error("Workspace dashboard error:", error);
        res.status(500).json({
            message: "Failed to load workspace dashboard",
            error: error.message
        });
    }
};

module.exports = { getAdminDashboard, getEmployeeDashboard, getUserDashboard, getWorkspaceDashboard };