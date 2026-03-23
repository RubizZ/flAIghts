import mongoose from "mongoose";
import logger from "../utils/logger.js";

export async function connectDB(mongoUri: string): Promise<void> {
    try {
        const conn = await mongoose.connect(mongoUri);
        logger.info(`MongoDB connected on host: ${conn.connection.host}`);
    } catch (error) {
        logger.error({ error }, "Error connecting to MongoDB");
        process.exit(1);
    }
}
