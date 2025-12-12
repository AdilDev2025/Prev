const express = require('express');
const workspace_dashboard = express.Router();
const { authMiddleware } = require('../../Middlewares/auth_middleware');

const { registerForAttendance, attendance_WM } = require('../../controllers/dashboard/attendance_WM_controller');
const { getWorkspaceDashboard } = require('../../controllers/dashboard/controller_dashboard');

// Middleware for all workspace dashboard routes
workspace_dashboard.use(authMiddleware);

// Workspace Dashboard Overview
workspace_dashboard.get('/:workspaceId', getWorkspaceDashboard);


// Face registration for workspace attendance
workspace_dashboard.post('/:workspaceId/attendance/register-face',
    express.raw({ type: 'multipart/form-data', limit: '10mb' }),
    (req, res, next) => {
        // Parse multipart form data
        const multer = require('multer');
        const upload = multer({ storage: multer.memoryStorage() });
        upload.single('face')(req, res, (err) => {
            if (err) return res.status(400).json({ message: 'File upload error' });
            next();
        });
    },
    registerForAttendance
);

// Face recognition for attendance marking
workspace_dashboard.post('/:workspaceId/attendance/mark-attendance',
    express.raw({ type: 'multipart/form-data', limit: '10mb' }),
    (req, res, next) => {
        // Parse multipart form data
        const multer = require('multer');
        const upload = multer({ storage: multer.memoryStorage() });
        upload.single('face')(req, res, (err) => {
            if (err) return res.status(400).json({ message: 'File upload error' });
            next();
        });
    },
    attendance_WM
);



module.exports = workspace_dashboard;
