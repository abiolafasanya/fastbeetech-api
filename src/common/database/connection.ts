import mongoose from "mongoose";
import logger from "../middleware/logger";

mongoose.set("strictQuery", true);

// Configurable retry parameters with sensible defaults
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000; // 1s base, exponential backoff

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let listenersAttached = false;
function attachConnectionEventListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

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
}

async function connectDB(url: string) {
  if (!url) throw new Error("Connection string required");

  const maxRetries = Number.parseInt(
    process.env.DB_CONNECT_MAX_RETRIES || "",
    10
  );
  const baseDelayMs = Number.parseInt(
    process.env.DB_CONNECT_RETRY_DELAY_MS || "",
    10
  );

  const effectiveMaxRetries =
    Number.isFinite(maxRetries) && maxRetries > 0
      ? maxRetries
      : DEFAULT_MAX_RETRIES;
  const effectiveBaseDelayMs =
    Number.isFinite(baseDelayMs) && baseDelayMs > 0
      ? baseDelayMs
      : DEFAULT_BASE_DELAY_MS;

  logger.info(
    `Connecting to MongoDB... (will retry up to ${effectiveMaxRetries} times)`
  );

  let lastError: unknown;
  for (let attempt = 1; attempt <= effectiveMaxRetries; attempt++) {
    try {
      const db = await mongoose.connect(url, {
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 1,
        maxIdleTimeMS: 30000,
      });

      // Attach listeners only once per process
      attachConnectionEventListeners();

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
      lastError = error;
      const errMsg = error instanceof Error ? error.message : String(error);
      if (attempt < effectiveMaxRetries) {
        const waitMs = effectiveBaseDelayMs * Math.pow(2, attempt - 1);
        logger.log(
          "warn",
          `MongoDB connection failed (attempt ${attempt}/${effectiveMaxRetries}): ${errMsg}. Retrying in ${waitMs}ms...`
        );
        await sleep(waitMs);
      } else {
        logger.error(
          `Failed to connect to MongoDB after ${effectiveMaxRetries} attempts: ${errMsg}`
        );
      }
    }
  }

  // If we reach here, all retries failed
  throw lastError;
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
