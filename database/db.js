const mongoose = require("mongoose"); 
mongoose.
connect("mongodb+srv://gamingrobust1:gamingrobust1@cluster0.jwbxrs9.mongodb.net/").then(()=>{
    console.log("Database Connected successfully...");
}).catch((e)=>{
    console.log("Error...")
});


