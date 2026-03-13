import mongoose from "mongoose";

export async function connectDB(mongoUri: string): Promise<void> {
    try {
        const conn = await mongoose.connect(mongoUri);
        console.log("MongoDB connected: ", conn.connection.host);
    } catch (error) {
        console.error("Error connecting to MongoDB: ", error);
        process.exit(1);
    }
}
