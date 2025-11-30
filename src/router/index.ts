import { Router } from "express";

import { routerApi } from "#/router/api/index.js";
import { routerView } from "#/router/view/index.js";

const router: Router = Router({
    mergeParams: true,
});

// API routes should come first to avoid being caught by view routes
router.use("/api/:version/", routerApi);

router.get("/health", async (_req, res) => {
    return res.status(200).json({
        success: true,
    });
});

// View routes come last
router.use("/", routerView);

// Global 404 handler for unmatched routes
router.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "The requested resource was not found",
    });
});

export { router };
