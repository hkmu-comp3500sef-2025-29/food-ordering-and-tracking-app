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

router.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: "Endpoint not found",
    });
});

export { router as routerV1 };
