const { Router } = require('express');
const {
    createWorkspace,
    getWorkspaces,
    updateWorkspace,
    deleteWorkspace,
    getWorkspaceMembers,
    updateMemberRole
} = require('../../controllers/workspace/workspace_controller.js');


const { authMiddleware } = require('../../../Middlewares/auth_middleware');
const { checkWorkspaceRole } = require('../../../Middlewares/role_middleware');

const workspace_controller_router = Router();

// All routes require authentication
workspace_controller_router.use(authMiddleware);

workspace_controller_router.get('/', getWorkspaces);
workspace_controller_router.post('/', createWorkspace);

// Admin-only routes
workspace_controller_router.patch('/:id', checkWorkspaceRole('admin'), updateWorkspace);
workspace_controller_router.delete('/:id', checkWorkspaceRole('admin'), deleteWorkspace);

// Member management (admin only)
workspace_controller_router.get('/:id/members', checkWorkspaceRole('admin'), getWorkspaceMembers);
workspace_controller_router.patch('/:id/members', checkWorkspaceRole('admin'), updateMemberRole);

module.exports = workspace_controller_router;