import type { NextFunction, Request, Response } from "express";

import { Router } from "express";

import { ConfigManager } from "#/configs/config.manager.js";
import { apiLimiter } from "#/middlewares/index.js";
import { routerV1 } from "#/router/api/v1/index.js";

const configVersion = ConfigManager.getInstance().get("API_VERSION");

const versionRouters = new Map<string, Router>([
    [
        configVersion,
        routerV1,
    ],
]);

const router: Router = Router({
    mergeParams: true,
});

// Apply general rate limiting to all API endpoints
router.use(apiLimiter);

router.use((req: Request, res: Response, next: NextFunction) => {
    const version = req.params.version ?? "";
    const handler = versionRouters.get(version);
    if (!handler) {
        const payload: {
            success: false;
            error: string;
            message: string;
            requestId?: string;
        } = {
            success: false,
            error: "UNSUPPORTED_API_VERSION",
            message: `API version '${version}' is not supported. Available version: ${configVersion}`,
        };
        if (req.requestId) {
            payload.requestId = req.requestId;
        }
        return res.status(426).json(payload);
    }
    return handler(req, res, next);
});

router.use((req: Request, res: Response) => {
    const payload: {
        success: false;
        error: string;
        message: string;
        requestId?: string;
    } = {
        success: false,
        error: "ENDPOINT_NOT_FOUND",
        message: `API endpoint '${req.path}' not found`,
    };
    if (req.requestId) {
        payload.requestId = req.requestId;
    }
    res.status(404).json(payload);
});

export { router as routerApi };
