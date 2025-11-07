import type { Express, NextFunction, Request, Response } from "express";
import express from "express";
import { PATH_PUBLIC, PATH_VIEWS } from "#/constants";
import { router } from "#/router";
import { ConfigManager } from "#/configs/config.manager";
import helmet from "helmet";
import compression from "compression";
import cookieParser from 'cookie-parser';
import { initDatabase, loadTrustedIps } from "#/configs/root.init";
import { httpLogger, logger } from "#/configs/logger";


const Config = ConfigManager.getInstance();

const app: Express = express();

// Security & performance middleware
app.use(helmet());
app.use(compression());
app.use(httpLogger);

// Core parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.set("view engine", "ejs");

app.set("views", PATH_VIEWS);

app.use("/", router);

app.use("/static", express.static(PATH_PUBLIC));

// Basic error handler, returns 500 if unhandled
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
	logger.error('Unhandled error:', err);
	res.status(500).json({ error: 'Internal Server Error' });
});

async function start(): Promise<void> {
	const PORT: number = Config.get('PORT');
	// Load and set trusted proxy IPs before starting the server.
	try {
		const ips = await loadTrustedIps();
		app.set('trust proxy', ips);
		logger.info('Configured trusted proxy IPs:', ips.length, 'entries');
	} catch (err) {
		logger.warn('Could not configure trusted proxy IPs:', err);
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
		logger.error('Failed to start server:', err);
		process.exit(1);
	});
}

export default app;