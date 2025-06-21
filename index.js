require('dotenv').config();
require('./database/db');

const express = require('express');
const cors = require('cors');
const app = express();

const tournamentRoutes = require('./routes/Tournaments');

// ✅ CORS middleware FIRST
app.use(cors({
  origin: 'https://leaderboard-psi-seven.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// ✅ Respond to all OPTIONS requests (preflight)
app.options('*', cors());

// ✅ Body parser
app.use(express.json());

// ✅ Routes
app.use('/api/tournaments', tournamentRoutes);

// ✅ Start server
const port = process.env.PORT || 5050;
app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
