require('dotenv').config();
require('./database/db');

const express = require("express");
const app = express();
const cors = require("cors");
const tournamentRoutes = require('./routes/Tournaments');

// Middleware
app.use(cors({
  origin: ['https://leaderboard-psi-seven.vercel.app'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/tournaments', tournamentRoutes);

module.exports = app;
