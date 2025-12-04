const prisma = require('../../lib/prisma')

const send_workspace_invite = async (req, res) => {
    try {
        const workspace_id = parseInt(req.params.id);
        const email = req.body.email;
        const inviter_id = req.user.userId;

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspace_id }
        });

        if (!workspace) {
            return res.status(404).json({ message: "workspace not found" });
        }


        const existingMember = await prisma.workspaceMember.findFirst({
            where: {
                workspaceId: workspace_id,
                users: { email: email }
            },
            include: { users: true }
        });

        if (existingMember) {
            return res.status(400).json({ message: "User already in workspace" });
        }


        // Check if user exists
        const userToInvite = await prisma.users.findUnique({
            where: { email: email }
        });

        if (!userToInvite) {
            return res.status(404).json({ message: "User with this email not found" });
        }

        // Check for existing pending invite
        const existingInvite = await prisma.invite.findFirst({
            where: {
                email: email,
                workspaceId: workspace_id,
                status: 'PENDING'
            }
        });

        if (existingInvite) {
            return res.status(400).json({ message: "Invite already sent to this user" });
        }

        const invite = await prisma.invite.create({
            data: {
                email: email,
                workspaceId: workspace_id,
                invitedBy: inviter_id
            }
        });

        return res.status(200).json({
            message: "Invite sent successfully",
            invite
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error", error });
    }
};

module.exports = { send_workspace_invite };