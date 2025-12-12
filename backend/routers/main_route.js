const workspace_controller_router = require('./workspace_routers/workspace_route');
const auth_router = require('./authenticationroute');
const workspace_invite_router = require('./workspace_routers/workspace_invite_router');
const acceptWorkspaceInvitation = require('./workspace_routers/workspace_acceptInvite_router');
const user_dashboard = require('./dashboard_routers/user_dashboard_route');
const workspace_dashboard = require('./dashboard_routers/workspace_dashboard_route');

const router = require('express').Router();

// Authentication routes
router.use('/auth', auth_router);

// User dashboard (for regular users)
router.use('/dashboard', user_dashboard);

// Workspace routes
router.use('/workspace', workspace_controller_router);

// Workspace dashboard (for workspace members)
router.use('/workspace-dashboard', workspace_dashboard);

// Invitation routes
router.use(workspace_invite_router);
router.use(acceptWorkspaceInvitation);

module.exports = { router };