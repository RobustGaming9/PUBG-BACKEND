require('dotenv').config();
require('../database/db');

const express = require("express");
const app = express();
const port = process.env.PORT;
const  cors = require("cors");
const tournamentRoutes = require('../routes/Tournaments');

app.use(cors());
app.use(express.json());
app.use('/api/tournaments', tournamentRoutes);
// app.listen(port,()=>{
//     console.log("Backend is running on port:"+port);
// })

module.exports = app;

const serverless = require('serverless-http');
module.exports = serverless(app);
