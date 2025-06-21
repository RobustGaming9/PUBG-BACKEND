require('dotenv').config();
require('./database/db');

const express = require("express");
const app = express();
const cors = require("cors");
const tournamentRoutes = require('./routes/Tournaments');

app.use(cors({
  origin: 'https://leaderboard-psi-seven.vercel.app',
  credentials: true
}));


app.use(express.json());


app.use('/api/tournaments', tournamentRoutes);

const port = process.env.PORT || 5050;
app.listen(port, () => {
  console.log(`Backend is running on port: ${port}`);
});
