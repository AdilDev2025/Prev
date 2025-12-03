const {workspace_controller_router} = require('../routers/workspace_route');

const {auth_router} = require('../routers/authenticationroute');

const router = require('express').Router();

router.use('/workspace', workspace_controller_router);
router.use('/auth', auth_router);

module.exports = router;