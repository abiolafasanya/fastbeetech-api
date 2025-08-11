import mongoose from "mongoose";
import logger from "../middleware/logger";

mongoose.set("strictQuery", true);

async function connectDB(url: string) {
  if (!url) throw new Error("Connection string required");

  try {
    const db = await mongoose.connect(url, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
    });

    mongoose.connection.on("connected", () =>
      logger.log("info", "MongoDB connection established")
    );

    mongoose.connection.on("error", (err) =>
      logger.error(`MongoDB connection error: ${JSON.stringify(err)}`)
    );

    mongoose.connection.on("disconnected", () =>
      logger.log("warn", "MongoDB connection disconnected")
    );

    mongoose.connection.on("reconnected", () =>
      logger.log("info", "MongoDB connection reestablished")
    );

    const connectionInfo = {
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
    };

    logger.log(
      "success",
      `MongoDB connected to ${connectionInfo.host}:${connectionInfo.port}/${connectionInfo.name}`
    );

    return db;
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Failed to connect to MongoDB: ${error.message}`);
    }
    throw error;
  }
}

export async function refreshDBConnections() {
  try {
    if (mongoose.connection.readyState === 1) {
      logger.log("info", "Refreshing database connections");

      if (!mongoose.connection.db) {
        logger.error("No database connection found to refresh.");
        return;
      }

      const statsBefore = await mongoose.connection.db
        .admin()
        .serverStatus()
        .then((data) => data.connections);

      await mongoose.connection.db.admin().command({ refreshSessions: [] });

      const statsAfter = await mongoose.connection.db
        .admin()
        .serverStatus()
        .then((data) => data.connections);

      logger.log(
        "info",
        `Connection refresh complete.\nBefore: ${JSON.stringify(
          statsBefore
        )}\nAfter: ${JSON.stringify(statsAfter)}`
      );
    }
  } catch (error) {
    console.error(`Error refreshing connections`, error);
  }
}

export default connectDB;
