const { Router } = require('express');
const auth_router = Router();
const { register , login } = require('../controllers/auth.js');


auth_router.post('/register', register);
auth_router.post('/login', login);

module.exports = { auth_router};