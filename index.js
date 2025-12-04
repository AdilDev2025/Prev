require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const {router} = require('./routers/main_route');

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// API routes
app.use('/api', router);

app.listen(port , ()=>
{
    console.log(`Server running at http://localhost:${port}/`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`API routes available at: http://localhost:${port}/api/`);
})