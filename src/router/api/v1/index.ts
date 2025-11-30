import { Router } from "express";

import { dishesRouter } from "#/router/api/v1/dishes.router.js";
import { ordersRouter } from "#/router/api/v1/orders.router.js";
import { sessionsRouter } from "#/router/api/v1/sessions.router.js";

const router: Router = Router({
    mergeParams: true,
});

router.get("/health", (_req, res) => {
    res.status(200).json({
        success: true,
        version: "v1",
    });
});

router.use("/dishes", dishesRouter);
router.use("/orders", ordersRouter);
router.use("/sessions", sessionsRouter);

router.use((req, res) => {
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

export { router as routerV1 };
