import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { ConfigManager } from "#/configs/config.manager";

const apiversion = ConfigManager.getInstance().get("API_VERSION");

const router: Router = Router({ mergeParams: true });

// api version check middleware
router.use("/", (req: Request, res: Response, next: NextFunction) => {
    if (req.params.version !== apiversion) {
        return res.status(426).json({ success: false, error: 'API version mismatch' });
    }
    return next();
});

// Health check endpoint
router.get("/health", async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({ success: true });
});


export { router as routerApi };