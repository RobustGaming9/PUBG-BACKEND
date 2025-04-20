require('dotenv').config();
require('./database/db');

const express = require("express");
const app = express();
const port = process.env.PORT;
const  cors = require("cors");
const userRoute = require("./routes/User");
const billRoutes = require("./routes/Bill");

app.use(cors());
app.use(express.json());
app.use("/api/user",userRoute);
app.use('/api/bill', billRoutes);
app.use(cors({
    origin: ['https://bill-generator-backend.vercel.app/'],
    credentials: true,
  }));
app.listen(port,()=>{
    console.log("Backend is running on port:"+port);
})