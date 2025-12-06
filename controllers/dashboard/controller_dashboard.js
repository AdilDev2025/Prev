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
                    include: { users: true }
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
                users: {  // Owner info
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

        // Check if user has admin workspaces
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

module.exports = { getAdminDashboard, getEmployeeDashboard, getUserDashboard };