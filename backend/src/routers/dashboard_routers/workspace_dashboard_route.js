const express = require('express');
const multer = require('multer');
const workspace_dashboard = express.Router();
const { authMiddleware } = require('../../../Middlewares/auth_middleware');

const { registerForAttendance, attendance_WM, checkout_WM, getAttendanceStatus } = require('../../controllers/dashboard/attendance_WM_controller');
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

// Check-in via facial recognition
workspace_dashboard.post('/:workspaceId/attendance/mark-attendance',
    upload.single('face'),
    attendance_WM
);

// Check-out via facial recognition
workspace_dashboard.post('/:workspaceId/attendance/check-out',
    upload.single('face'),
    checkout_WM
);

// Get current attendance status (checked in or not)
workspace_dashboard.get('/:workspaceId/attendance/status',
    getAttendanceStatus
);



module.exports = workspace_dashboard;
