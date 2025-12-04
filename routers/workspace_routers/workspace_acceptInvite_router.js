const {Router} = require('express');

const {acceptWorkspaceInvite} = require('../../controllers/workspace/workspace_Accept_controller');
const {authMiddleware} = require('../../Middlewares/auth_middleware');

const acceptWorkspaceInvitation = Router();

acceptWorkspaceInvitation.post('/workspace/invite/:inviteId/accept', authMiddleware, acceptWorkspaceInvite);

module.exports = acceptWorkspaceInvitation;