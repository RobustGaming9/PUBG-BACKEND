require('dotenv').config();
require('../database/db');

const express = require("express");
const cors = require("cors");
const tournamentRoutes = require('../routes/Tournaments');

const app = express();

// ✅ CORS middleware
app.use(cors({
  origin: 'https://leaderboard-psi-seven.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// ✅ Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use('/api/tournaments', tournamentRoutes);

const port = process.env.PORT || 5050;
app.listen(port, () => {
  console.log(`Backend is running on port: ${port}`);
});
