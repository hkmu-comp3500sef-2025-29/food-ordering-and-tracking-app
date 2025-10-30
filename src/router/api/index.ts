import type { Request, Response } from "express";

import { createJsonResponse } from "@jderstd/express";
import { Router } from "express";

import { routerApiSession } from "#/router/api/session";

const router: Router = Router();

router.get("/", async (_req: Request, res: Response): Promise<Response> => {
    return createJsonResponse(res);
});

router.use("/sessions/", routerApiSession);

router.get("/test", async (_req: Request, res: Response): Promise<Response> => {
    return createJsonResponse(res, {
        data: {
            message: "Hello, World!",
        },
    });
});

export { router as routerApi };
