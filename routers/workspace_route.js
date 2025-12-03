const { Router } = require('express');
const {createWorkspace, getWorkspaces, updateWorkspace, deleteWorkspace} = require('../controllers/workspace_controller.js')

const workspace_controller_router = Router();

workspace_controller_router.get('/', getWorkspaces);
workspace_controller_router.post('/', createWorkspace);
workspace_controller_router.patch('/:id', updateWorkspace);
workspace_controller_router.delete('/:id', deleteWorkspace);

module.exports = { workspace_controller_router };