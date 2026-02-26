require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// Port configuration
const PORT = process.env.PORT || 3000;
const FACIAL_API_URL = process.env.FACIAL_API_URL || 'http://localhost:8000';

const { router } = require('./src/routers/main_route');

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4200'],
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
