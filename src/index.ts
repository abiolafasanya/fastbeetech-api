import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import routeHandler from "./routes";
import helmet from "helmet";
import path from "path";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import logger from "./common/middleware/logger";
import { AppErrorHandler, NotFoundException } from "./common/middleware/errors";
import connectDB from "./common/database/connection";
import { SECRETS } from "./common/constant";
import deepSanitize from "./common/utils/sanitze";

const app = express();

const apiRouter = express.Router();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "../public")));
// Allow larger payloads
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));
app.use(cookieParser()); // 👈 REQUIRED before your authenticate middleware

app.use(
  cors({
    origin: process.env.CLIENT_URL, // e.g., http://localhost:3000
    credentials: true, // 🔑 allow cookies to be sent
  })
);

app.use(express.json());
app.use(express.urlencoded());

// Set security HTTP headers
app.use(helmet());

app.use(
  morgan(
    (tokens, req, res) => {
      return JSON.stringify({
        method: tokens.method(req, res),
        url: tokens.url(req, res),
        status: Number(tokens.status(req, res)),
        responseTime: `${tokens["response-time"](req, res)} ms`,
        contentLength: tokens.res(req, res, "content-length"),
        timestamp: new Date().toISOString(),
      });
    },
    {
      stream: {
        write: (message: string) => {
          try {
            const parsed = JSON.parse(message);
            logger.info("HTTP_LOG", parsed);
          } catch (err) {
            console.error("Failed to parse Morgan message", err);
          }
        },
      },
    }
  )
);

const port = Number(process.env.PORT || 4000);

// Routes
app.use((req, res, next) => {
  deepSanitize(req.body);
  deepSanitize(req.query); // only mutate, don't reassign
  deepSanitize(req.params);
  next();
});

//Data sanitization against NoSQL query injection
routeHandler(apiRouter);
app.use("/api/v1", apiRouter);

app.use((req, res, next) => {
  const message = `Can't find ${req.originalUrl} on this server`;
  logger.warn(`404 - ${message}`);
  next(new NotFoundException(message));
});

const MONGO_URI: string = SECRETS.mongo_uri;

const start = async () => {
  try {
    if (!MONGO_URI) throw new Error("MONGO_URI is missing");
    await connectDB(MONGO_URI);
    app.listen(port, () => {
      logger.info(`Server running on port ${port}...`);
    });
  } catch (error) {
    console.error("Error starting the server:", JSON.stringify(error));
    process.exit(1); // Exit process with failure
  }
};

try {
  app.use(AppErrorHandler);
} catch (error) {
  console.error("Failed to attach AppErrorHandler", error);
}

start().then((data) => data);
