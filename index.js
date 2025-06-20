require('dotenv').config();
require('./database/db');

const express = require("express");
const app = express();
const  cors = require("cors");
const tournamentRoutes = require('./routes/Tournaments');

app.use(express.json());
app.use('/api/tournaments', tournamentRoutes);
app.use(cors());
app.use(cors({
    origin: ['https://leaderboard-psi-seven.vercel.app/'],
    credentials: true,
  }));

app.listen(5050,()=>{
    console.log("Backend is running on port:"+5050);
})