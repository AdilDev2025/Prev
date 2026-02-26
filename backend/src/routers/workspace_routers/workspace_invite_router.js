const { Router } = require('express');
const {send_workspace_invite} = require('../../controllers/workspace/workspace_invite_controller.js')
const {authMiddleware} = require('../../../Middlewares/auth_middleware')
const {checkWorkspaceRole} = require('../../../Middlewares/role_middleware')
const workspace_invite_router = Router();
workspace_invite_router.post('/workspace/:id/invite', authMiddleware, checkWorkspaceRole('admin'), send_workspace_invite);

module.exports = workspace_invite_router;