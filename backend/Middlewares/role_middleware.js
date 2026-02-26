const prisma = require('../src/lib/prisma');

const checkWorkspaceRole = (requiredRole) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.userId;
            const workspaceId = parseInt(req.params.id) || parseInt(req.params.workspaceId);

            if (!userId || !workspaceId) {
                return res.status(400).json({ message: "User ID and workspace ID required" });
            }

            // Check if user is workspace owner (always admin)
            const workspace = await prisma.workspace.findUnique({
                where: { id: workspaceId }
            });

            if (!workspace) {
                return res.status(404).json({ message: "Workspace not found" });
            }

            // Owner is always admin
            if (workspace.ownerId === userId) {
                req.user.workspaceRole = 'admin';
                return next();
            }

            // Check WorkspaceMember role
            const member = await prisma.workspaceMember.findUnique({
                where: {
                    workspaceId_userId: {
                        workspaceId: workspaceId,
                        userId: userId
                    }
                }
            });

            if (!member) {
                return res.status(403).json({ message: "Not a workspace member" });
            }

            req.user.workspaceRole = member.role;

            // Check if user has required role
            if (requiredRole === 'admin' && req.user.workspaceRole !== 'admin') {
                return res.status(403).json({ message: "Admin access required" });
            }

            next();
        } catch (error) {
            console.error("Role check error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    };
};

const checkGlobalRole = (requiredRole) => {
    return (req, res, next) => {
        const userRole = req.user?.role || 'user';

        if (userRole !== requiredRole) {
            return res.status(403).json({ message: `${requiredRole} role required` });
        }

        next();
    };
};

module.exports = { checkWorkspaceRole, checkGlobalRole };