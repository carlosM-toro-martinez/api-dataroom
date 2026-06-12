import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { logger } from "./config/logger.js";
import routes from "./routes/index.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  logger.info({ method: req.method, url: req.originalUrl }, "Incoming request");

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(
      { method: req.method, url: req.originalUrl, status: res.statusCode, duration: `${duration}ms` },
      "Request completed",
    );
  });

  next();
});

app.use(helmet());

app.use("/api", routes);

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = (err as any).statusCode || 500;
  const message = (err as any).message || "Internal server error";
  const details = (err as any).details;

  logger.error({ err, status }, "Unhandled error");

  res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
});

export default app;
