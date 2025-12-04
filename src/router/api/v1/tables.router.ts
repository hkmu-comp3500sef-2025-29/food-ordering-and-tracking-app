import { Router } from "express";

import { createTable, WithTableId } from "#/modules/table/table.repo.js";

const router: Router = Router({
    mergeParams: true,
});

router.post("/init", async (_req, res) => {
    for (let i: number = 0; i < 100; i++) {
        await createTable([
            WithTableId(i),
        ]);
    }

    return res.json({
        success: true,
    });
});

export { router as tablesRouter };
