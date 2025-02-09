import 'dotenv/config'
import { app } from "./app.js";
import connectDB from "./db/index.js";

connectDB()
.then(() =>{
    app.listen(process.env.PORT || 8000 , () => {
        console.log(`\n Server is running on port ${process.env.PORT}`)
    })
    app.get("/", (req, res) => {
        res.send("Server is listening")
    })
    app.on("error", (error) => {
        console.log( "Server failed to start !!!",error)
        throw error
    })

    
    
})
.catch((error) => {
    console.log("MongoDB connection failed !!!", error)
})
