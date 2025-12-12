const prisma = require('../../lib/prisma')
const acceptWorkspaceInvite = async (req, res) => {
    try {
        const { inviteId } = req.params;

        const invite = await prisma.invite.findUnique({
            where: { id: inviteId },
        });

        if (!invite) {
            return res.status(404).json({ message: "Invite not found" });
        }

        if (invite.status !== "PENDING") {
            return res.status(400).json({ message: "Invite already used or expired" });
        }

        if (req.user.email !== invite.email) {
            return res.status(403).json({ message: "This invite is not for your account" });
        }

        // Check if already a member
        const existingMember = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: invite.workspaceId,
                    userId: req.user.userId
                }
            }
        });

        if (existingMember) {
            await prisma.invite.update({
                where: { id: inviteId },
                data: { status: "ACCEPTED" }
            });
            return res.status(400).json({
                message: "You are already a member of this workspace"
            });
        }

        // Create membership with role from invite
        const role = invite.role || 'user';  // Default to user if not specified

        await prisma.workspaceMember.create({
            data: {
                workspaceId: invite.workspaceId,
                userId: req.user.userId,
                role: role
            }
        });

        // Mark invite as accepted
        await prisma.invite.update({
            where: { id: inviteId },
            data: { status: "ACCEPTED" }
        });

        // Get workspace details for dashboard redirect
        const workspace = await prisma.workspace.findUnique({
            where: { id: invite.workspaceId },
            select: { id: true, name: true }
        });

        return res.status(200).json({
            message: `Welcome to ${workspace.name}! You have successfully joined as ${role}`,
            role: role,
            workspace: {
                id: workspace.id,
                name: workspace.name
            },
            next_steps: [
                "Register your face for attendance tracking",
                "Explore workspace features and tools"
            ],
            dashboard_url: `/workspace-dashboard/${workspace.id}`,
            redirect_suggested: true
        });
    } catch (error) {
        console.error("Accept invite error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
module.exports = { acceptWorkspaceInvite };