import type { NextFunction, Request, Response } from "express";

import { Router } from "express";

import { ConfigManager } from "#/configs/config.manager";
import { routerV1 } from "#/router/api/v1";

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

router.use((req: Request, res: Response, next: NextFunction) => {
    const version = req.params.version ?? "";
    const handler = versionRouters.get(version);
    if (!handler) {
        return res.status(426).json({
            success: false,
            error: "Unsupported API version",
        });
    }
    return handler(req, res, next);
});

router.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: "Endpoint not found",
    });
});

export { router as routerApi };
