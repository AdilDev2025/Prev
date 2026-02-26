const express = require('express');
const multer = require('multer');
const workspace_dashboard = express.Router();
const { authMiddleware } = require('../../../Middlewares/auth_middleware');

const { registerForAttendance, attendance_WM } = require('../../controllers/dashboard/attendance_WM_controller');
const { getWorkspaceDashboard } = require('../../controllers/dashboard/controller_dashboard');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Middleware for all workspace dashboard routes
workspace_dashboard.use(authMiddleware);

// Workspace Dashboard Overview
workspace_dashboard.get('/:workspaceId', getWorkspaceDashboard);


// Face registration for workspace attendance
workspace_dashboard.post('/:workspaceId/attendance/register-face',
    upload.single('face'),
    registerForAttendance
);

// Face recognition for attendance marking
workspace_dashboard.post('/:workspaceId/attendance/mark-attendance',
    upload.single('face'),
    attendance_WM
);



module.exports = workspace_dashboard;
