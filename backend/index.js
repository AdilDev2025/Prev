const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');
const app = express();

// Port configuration
const PORT = process.env.PORT || 3000;
const FACIAL_API_URL = process.env.FACIAL_API_URL || 'http://localhost:8000';

const { router } = require('./src/routers/main_route');

// ─── Auto-start Python Facial Recognition API ───
let facialProcess = null;

function startFacialApi() {
    const facialDir = path.join(__dirname, 'facial-attendance');
    const venvPython = path.join(facialDir, 'venv', 'bin', 'python');
    const systemPython = 'python3';

    // Try venv first, fall back to system python
    const fs = require('fs');
    const pythonBin = fs.existsSync(venvPython) ? venvPython : systemPython;

    console.log(`\n🧠 Starting Facial Recognition API using: ${pythonBin}`);

    facialProcess = spawn(pythonBin, ['-m', 'uvicorn', 'app:app', '--host', '0.0.0.0', '--port', '8000'], {
        cwd: facialDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    facialProcess.stdout.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) console.log(`[Facial API] ${msg}`);
    });

    facialProcess.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) console.log(`[Facial API] ${msg}`);
    });

    facialProcess.on('error', (err) => {
        console.error(`[Facial API] Failed to start: ${err.message}`);
        console.error(`[Facial API] You may need to install Python deps: cd facial-attendance && pip install -r ../requirements.txt`);
        facialProcess = null;
    });

    facialProcess.on('exit', (code) => {
        if (code !== null && code !== 0) {
            console.error(`[Facial API] Exited with code ${code}`);
        }
        facialProcess = null;
    });
}

// Graceful shutdown
function cleanup() {
    if (facialProcess) {
        console.log('\n🛑 Stopping Facial Recognition API...');
        facialProcess.kill('SIGTERM');
    }
    process.exit(0);
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start facial API automatically
startFacialApi();

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:4200'],
    credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Server is running',
        services: {
            backend: `http://localhost:${PORT}`,
            facialApi: FACIAL_API_URL
        }
    });
});

// SMTP / Email health check
app.get('/health/smtp', async (req, res) => {
    const nodemailer = require('nodemailer');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
        return res.json({ status: 'not_configured', message: 'SMTP_USER or SMTP_PASS missing in .env' });
    }
    if (pass.length < 10 || pass.startsWith('REPLACE') || pass === 'abcdefghijklmno') {
        return res.json({ status: 'placeholder', message: 'SMTP_PASS is still a placeholder — generate a real Google App Password' });
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
        connectionTimeout: 10000,
    });

    try {
        await transporter.verify();
        res.json({ status: 'ok', message: `SMTP verified — ready to send emails as ${user}` });
    } catch (err) {
        res.json({ status: 'error', message: err.message, hint: 'Check SMTP_PASS — use a Google App Password, not your regular password' });
    }
});

// Facial API service status check (before proxy)
app.get('/api/facial/status', async (req, res) => {
    try {
        const axios = require('axios');
        const resp = await axios.get(`${FACIAL_API_URL}/health`, { timeout: 3000 });
        res.json({
            status: 'online',
            facial_api: resp.data,
            url: FACIAL_API_URL
        });
    } catch (err) {
        res.json({
            status: 'offline',
            message: 'Facial recognition service is starting or unavailable',
            url: FACIAL_API_URL,
            error: err.message
        });
    }
});

// Proxy middleware for facial recognition API
// Routes /api/facial/* to the Python FastAPI server
app.use('/api/facial', createProxyMiddleware({
    target: FACIAL_API_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/api/facial': '' // Remove /api/facial prefix when forwarding
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log(`[Proxy] ${req.method} ${req.originalUrl} -> ${FACIAL_API_URL}${req.url}`);
    },
    onError: (err, req, res) => {
        console.error('[Proxy Error]', err.message);
        res.status(503).json({
            status: 'error',
            message: 'Facial recognition service unavailable',
            details: err.message
        });
    }
}));

// API routes
app.use('/api', router);

app.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}/`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`📋 API routes available at: http://localhost:${PORT}/api/`);
    console.log(`🤖 Facial API proxy: http://localhost:${PORT}/api/facial/ -> ${FACIAL_API_URL}`);
    console.log(`\n[Ports Configuration]`);
    console.log(`   Backend API: ${PORT}`);
    console.log(`   Facial Recognition: ${FACIAL_API_URL.split(':').pop()}`);
});
