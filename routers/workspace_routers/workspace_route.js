const { Router } = require('express');
const {createWorkspace, getWorkspaces, updateWorkspace, deleteWorkspace} = require('../../controllers/workspace/workspace_controller.js');
const {authMiddleware} = require('../../Middlewares/auth_middleware');

const workspace_controller_router = Router();

// All workspace routes require authentication
workspace_controller_router.use(authMiddleware);

workspace_controller_router.get('/', getWorkspaces);
workspace_controller_router.post('/', createWorkspace);
workspace_controller_router.patch('/:id', updateWorkspace);
workspace_controller_router.delete('/:id', deleteWorkspace);

module.exports = workspace_controller_router;