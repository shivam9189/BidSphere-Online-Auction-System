import mongoose from "mongoose";
import 'dotenv/config'; 
const connectDB = async () => {
    try {
      mongoose.connect(process.env.MONGO_URI)
      
    } catch (error) {
      console.log("config error");
    }
}

export default connectDB;