const express = require('express');
const user_dashboard = express.Router();
const {getUserDashboard} = require('../../controllers/dashboard/controller_dashboard')
const {authMiddleware} = require('../../../Middlewares/auth_middleware');

user_dashboard.use(authMiddleware);

user_dashboard.get('/', getUserDashboard )

module.exports = user_dashboard;

