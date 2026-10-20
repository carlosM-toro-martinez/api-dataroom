import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { logger } from "./config/logger.js";
import routes from "./routes/index.js";
import { auditContextMiddleware } from "./config/audit.js";

const app = express();
// Solo los sitios de Minera Marte pueden usar la API desde un navegador. Se pueden sumar más con la variable
// CORS_ORIGINS (separados por coma). Las peticiones sin «Origin» (apps móviles, servidores, curl) no pasan por CORS.
const DEFAULT_ORIGINS = [
  "https://marte.encuentrass.lat",
  "https://minmartesrl.com",
  "https://www.minmartesrl.com",
  "https://exploracion.marte.encuentrass.lat",
];
const allowedOrigins = new Set(
  [...DEFAULT_ORIGINS, ...(process.env.CORS_ORIGINS ?? "").split(",")].map((origin) => origin.trim().replace(/\/+$/, "")).filter(Boolean),
);
const isLocalDev = (origin: string) => process.env.NODE_ENV !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || isLocalDev(origin)) return callback(null, true);
    logger.warn({ origin }, "Origen bloqueado por CORS (agrégalo a CORS_ORIGINS si es legítimo)");
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-device-id", "x-requested-with", "x-request-id"],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
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

// Cada petición lleva su contexto (quién, desde dónde) para la bitácora de auditoría.
app.use(auditContextMiddleware);

app.use("/api", routes);

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = (err as any).statusCode || 500;
  const message = (err as any).message || "Internal server error";
  const details = (err as any).details;

  logger.error({ err, status }, "Unhandled error");

  res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
});

export default app;
