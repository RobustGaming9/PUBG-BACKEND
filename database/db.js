const mongoose = require("mongoose"); 
mongoose.
connect(process.env.URL).then(()=>{
    console.log("Database Connected successfully...");
}).catch((e)=>{
    console.log("Error...")
});

