import dotenv from "dotenv";
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: ".env", override: true });
  // console.log("key", process.env.IVORYPAY_SECRET_KEY);
} else {
  dotenv.config();
}
import express from "express";
import cors from "cors";
import routeHandler from "./routes";
import helmet from "helmet";
import path from "path";
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
// app.use(bodyParser.json({ limit: "100mb" }));
// app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));
app.use(cookieParser()); // 👈 REQUIRED before your authenticate middleware

// Parse allowed origins from environment variable
const allowedOrigins = process.env.CLIENT_URLS
  ? process.env.CLIENT_URLS.split(",").map((url) => url.trim())
  : [
      "https://hexonest.com.ng",
      "https://www.hexonest.com.ng",
      "https://hexonest.vercel.app", // keep for fallback
      "http://localhost:3000", // fallback for development
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      logger.warn(`CORS blocked origin: ${origin}`);
      return callback(
        new Error(`CORS policy violation: Origin ${origin} not allowed`)
      );
    },
    credentials: true, // 🔑 allow cookies to be sent
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

const port = process.env.PORT || 5000;

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

app.use("/health-check", (req, res) => {
  res.send("Server is running...");
});

app.use("/", (req, res) => {
  res.send("Server is running...");
});

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
