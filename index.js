require('dotenv').config();
const express = require('express');
const app = express();
const port = 3001;
const {router} = require('./routers/authenticationroute')

app.use(express.json());

app.use('/', router)

app.listen(port , ()=>
{
    console.log(`server running at http://localhost:${port}/`)
})