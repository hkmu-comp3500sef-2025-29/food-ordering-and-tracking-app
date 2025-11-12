import { Router } from "express";

import { routerApi } from "#/router/api/index.js";
import { routerView } from "#/router/view/index.js";

const router: Router = Router({
    mergeParams: true,
});

router.use("/", routerView);

router.use("/api/:version/", routerApi);

router.get("/health", async (_req, res) => {
    return res.status(200).json({
        success: true,
    });
});

export { router };
