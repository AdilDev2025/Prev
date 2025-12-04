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


    const existingMember = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId: invite.workspaceId,
            userId: req.user.userId
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

    await prisma.workspaceMember.create({
        data: {
            workspaceId: invite.workspaceId,
            userId: req.user.userId,
            role: "user"
        }
    });

    // Mark invite as accepted
    await prisma.invite.update({
        where: { id: inviteId },
        data: { status: "ACCEPTED" }
    });

    return res.json({
        message: "You have successfully joined the workspace!",
    });
    } catch (error) {
        console.error("Accept invite error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


module.exports = { acceptWorkspaceInvite };