//workspace API
const prisma = require('../../lib/prisma')


const createWorkspace = async (req, res) => {
    try {
        const {name} = req.body;
        const ownerId = req.user?.userId;

        if (!name) {
            return res.status(400).json({message: "workspace name is required"});
        }

        if (!ownerId) {
            return res.status(401).json({message: "Authentication required"});
        }

        const checkWorkspace = await prisma.workspace.findFirst({
            where: {
                name,
                ownerId
            }
        });

        if(checkWorkspace) {
            return res.status(400).json({message: "workspace already exists"});
        }

        const newWorkspace = await prisma.workspace.create({
            data: {
                name,
                ownerId
            }
        });

        res.status(201).json({
            message: "workspace created successfully",
            workspace: newWorkspace
        });
    } catch (error) {
        console.error("Create workspace error:", error);
        res.status(500).json({message: "Internal server error"});
    }
}

const getWorkspaces = async (req, res) => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({message: "Authentication required"});
        }

        const workspaces = await prisma.workspace.findMany({
           where :{
               ownerId: userId
           }
        });

        res.status(200).json(workspaces);
    } catch (error) {
        console.error("Get workspaces error:", error);
        res.status(500).json({message: "Internal server error"});
    }
}


const updateWorkspace = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const userId = req.user?.userId;
        const {name} = req.body;

        if (!userId) {
            return res.status(401).json({message: "Authentication required"});
        }

        // Check if workspace exists and user is owner
        const workspace = await prisma.workspace.findUnique({
            where: {id}
        });

        if (!workspace) {
            return res.status(404).json({message: "workspace not found"});
        }

        if (workspace.ownerId !== userId) {
            return res.status(403).json({message: "Only workspace owner can update"});
        }

        const editWorkspace = await prisma.workspace.update({
            where: {id},
            data: {
                name: name || workspace.name,
                updatedAt: new Date()
            }
        });

        res.status(200).json({
            message: "workspace updated successfully",
            workspace: editWorkspace
        });
    } catch (error) {
        console.error("Update workspace error:", error);
        res.status(500).json({message: "Internal server error"});
    }
}

const deleteWorkspace = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({message: "Authentication required"});
        }

        // Check if workspace exists and user is owner
        const workspace = await prisma.workspace.findUnique({
            where: {id}
        });

        if (!workspace) {
            return res.status(404).json({message: "workspace not found"});
        }

        if (workspace.ownerId !== userId) {
            return res.status(403).json({message: "Only workspace owner can delete"});
        }

        await prisma.workspace.delete({
            where: {id}
        });

        res.status(200).json({
            message: "workspace deleted successfully"
        });
    } catch (error) {
        console.error("Delete workspace error:", error);
        res.status(500).json({message: "Internal server error"});
    }
}

const getWorkspaceMembers = async (req, res) => {
    try {
        const workspaceId = parseInt(req.params.id);

        const members = await prisma.workspaceMember.findMany({
            where: { workspaceId },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        // Add owner as admin
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { owner: true }
        });

        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" });
        }

        const allMembers = [
            {
                userId: workspace.owner.id,
                name: workspace.owner.name,
                email: workspace.owner.email,
                role: 'admin',
                isOwner: true
            },
            ...members.map(member => ({
                userId: member.users.id,
                name: member.users.name,
                email: member.users.email,
                role: member.role,
                isOwner: false
            }))
        ];

        res.status(200).json(allMembers);
    } catch (error) {
        console.error("Get workspace members error:", error);
        res.status(500).json({message: "Internal server error"});
    }
};
const updateMemberRole = async (req, res) => {
    try {
        const workspaceId = parseInt(req.params.id);
        const { userId, role } = req.body;
        const currentUserId = req.user.userId;

        if (!userId || !role) {
            return res.status(400).json({ message: "userId and role are required" });
        }

        if (!['admin', 'user'].includes(role)) {
            return res.status(400).json({ message: "Invalid role. Must be 'admin' or 'user'" });
        }

        // Verify current user is admin
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId }
        });

        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" });
        }

        if (workspace.ownerId !== currentUserId && req.user.workspaceRole !== 'admin') {
            return res.status(403).json({ message: "Admin access required" });
        }

        // Can't change owner's role
        if (userId === workspace.ownerId) {
            return res.status(400).json({ message: "Cannot change workspace owner's role" });
        }

        // Update member role
        const updatedMember = await prisma.workspaceMember.update({
            where: {
                workspaceId_userId: {
                    workspaceId: workspaceId,
                    userId: parseInt(userId)
                }
            },
            data: { role },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        res.status(200).json({
            message: "Member role updated successfully",
            member: updatedMember
        });
    } catch (error) {
        console.error("Update member role error:", error);
        res.status(500).json({message: "Internal server error"});
    }
};
module.exports = {createWorkspace, getWorkspaces, updateWorkspace, deleteWorkspace, getWorkspaceMembers,
    updateMemberRole}