import type { Request, Response } from "express";

import { Router } from "express";

const router: Router = Router({ mergeParams: true });

router.get("/", async (_req: Request, res: Response): Promise<void> => {
    return res.render("home");
});

router.get("/menu", async (_req: Request, res: Response): Promise<void> => {
    return res.render("menu");
});

export { router as routerView };
