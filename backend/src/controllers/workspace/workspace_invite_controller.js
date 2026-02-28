const prisma = require('../../lib/prisma');
const { sendInviteEmail } = require('../../utils/mailer');

const send_workspace_invite = async (req, res) => {
    try {
        const workspace_id = parseInt(req.params.id);
        const { email, role = 'user' } = req.body;  // Default role for new members
        const inviter_id = req.user.userId;

        // Check if inviter is admin
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspace_id }
        });

        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" });
        }

        // Only workspace admin can send invites
        if (workspace.ownerId !== inviter_id && req.user.workspaceRole !== 'admin') {
            return res.status(403).json({ message: "Only workspace admins can send invites" });
        }

        // Validate role
        if (!['admin', 'user'].includes(role)) {
            return res.status(400).json({ message: "Invalid role. Must be 'admin' or 'user'" });
        }

        // Check if user exists
        const userToInvite = await prisma.users.findUnique({
            where: { email: email }
        });

        if (!userToInvite) {
            return res.status(404).json({ message: "User with this email not found" });
        }

        // Check existing member
        const existingMember = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: workspace_id,
                    userId: userToInvite.id
                }
            }
        });

        if (existingMember) {
            return res.status(400).json({ message: "User is already a workspace member" });
        }

        // Check pending invite
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
                invitedBy: inviter_id,
                role: role  // Store intended role in invite
            }
        });

        // Send invitation email
        const emailResult = await sendInviteEmail({
            to: email,
            inviterName: req.user.name,
            workspaceName: workspace.name,
            inviteId: invite.id,
            role: role,
        });

        return res.status(200).json({
            message: emailResult.sent
                ? "Invite sent successfully — email delivered"
                : "Invite created — email could not be sent (check SMTP config)",
            emailSent: emailResult.sent,
            invite: {
                ...invite,
                role: role
            }
        });

    } catch (error) {
        console.error("Send invite error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { send_workspace_invite };