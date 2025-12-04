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

module.exports = {createWorkspace, getWorkspaces, updateWorkspace, deleteWorkspace}