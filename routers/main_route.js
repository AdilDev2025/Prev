const workspace_controller_router = require('./workspace_routers/workspace_route');
const auth_router = require('./authenticationroute');
const workspace_invite_router = require('./workspace_routers/workspace_invite_router');
const acceptWorkspaceInvitation = require('./workspace_routers/workspace_acceptInvite_router');
const user_dashboard = require('./dashboard_routers/user_dashboard_route');

const router = require('express').Router();

router.use('/auth', auth_router);
router.use('/workspace', workspace_controller_router);
router.use('/dashboard', user_dashboard);

router.use(workspace_invite_router);
router.use(acceptWorkspaceInvitation);

module.exports = { router };