import type { Express } from "express";

import compression from "compression";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";

import { ConfigManager } from "#/configs/config.manager.js";
import { helmetConfig } from "#/configs/helmet.js";
import { httpLogger, logger } from "#/configs/logger.js";
import { initDatabase, loadTrustedIps } from "#/configs/root.init.js";
import { PATH_PUBLIC, PATH_VIEWS } from "#/constants/index.js";
import { globalErrorHandler } from "#/error/index.js";
import { requestContext, responseTimer } from "#/middlewares/index.js";
import { router } from "#/router/index.js";

const Config = ConfigManager.getInstance();

const app: Express = express();

// Security & performance middleware
app.use(requestContext);
app.use(responseTimer);
app.use(helmet(helmetConfig));
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

// Serve static files (all public assets are exposed under `/static`)
app.use("/static", express.static(PATH_PUBLIC));

app.use("/", router);

// Global error handler - handles all errors with consistent format
app.use(globalErrorHandler);

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

start().catch((err) => {
    logger.error("Failed to start server:", err);
    process.exit(1);
});

export default app;
