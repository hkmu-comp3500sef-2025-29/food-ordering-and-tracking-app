import type { Express, NextFunction, Request, Response } from "express";

import compression from "compression";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";

import { ConfigManager } from "#/configs/config.manager";
import { httpLogger, logger } from "#/configs/logger";
import { initDatabase, loadTrustedIps } from "#/configs/root.init";
import { PATH_PUBLIC, PATH_VIEWS } from "#/constants";
import { requestContext, responseTimer } from "#/middlewares";
import { router } from "#/router";
import { isHttpError } from "#/utils/error";

const Config = ConfigManager.getInstance();

const app: Express = express();

// Security & performance middleware
app.use(requestContext);
app.use(responseTimer);
app.use(helmet());
app.use(compression());
app.use(httpLogger);

// Core parsers with size limits to prevent DoS attacks
app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb", // Limit request body size
    }),
);
app.use(
    express.json({
        limit: "10mb", // Limit JSON payload size
    }),
);
app.use(cookieParser());

app.set("view engine", "ejs");

app.set("views", PATH_VIEWS);

app.use("/", router);

app.use("/static", express.static(PATH_PUBLIC));

// Basic error handler, returns 500 if unhandled
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    if (isHttpError(err)) {
        const payload = {
            success: false,
            error: err.errorCode,
            message: err.message ? err.message : "Internal Server Error",
            requestId: req.requestId,
        };
        logger.warn(
            "HTTP Error:",
            payload,
            err.errorDetails ? err.errorDetails : "",
        );
        return res.status(err.statusCode).json(payload);
    }
    logger.error("Unhandled error:", err);
    return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        requestId: req.requestId,
    });
});

async function start(): Promise<void> {
    const PORT: number = Config.get("PORT");
    // Load and set trusted proxy IPs before starting the server.
    try {
        const ips = await loadTrustedIps();
        app.set("trust proxy", ips);
        logger.info("Configured trusted proxy IPs:", ips.length, "entries");
    } catch (err) {
        logger.warn("Could not configure trusted proxy IPs:", err);
    }

    await initDatabase();

    return new Promise((resolve) => {
        app.listen(PORT, () => {
            logger.success(`Server listening on http://localhost:${PORT}`);
            resolve();
        });
    });
}

// If run directly, start the server
if (require.main === module) {
    start().catch((err) => {
        logger.error("Failed to start server:", err);
        process.exit(1);
    });
}

export default app;
