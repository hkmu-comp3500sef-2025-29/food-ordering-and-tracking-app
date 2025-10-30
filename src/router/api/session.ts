import type { Request, Response } from "express";
import type { WithId } from "mongodb";

import type { Session } from "#/modules/session/schema";

import { createJsonResponse } from "@jderstd/express";
import { Router } from "express";

import { serviceFindSession } from "#/modules/session/services";

const router: Router = Router();

router.get("/{:id}", async (req: Request, res: Response): Promise<Response> => {
    if (!req.params.id) {
        return createJsonResponse(res, {
            errors: [
                {
                    code: "parse",
                    path: [
                        "id",
                    ],
                    message: "Session ID is required.",
                },
            ],
        });
    }

    const result: WithId<Session> | null = await serviceFindSession(
        req.params.id,
    );

    if (!result) {
        return createJsonResponse(res, {
            errors: [
                {
                    code: "not_found",
                    path: [
                        "session",
                    ],
                    message: "Session not found.",
                },
            ],
        });
    }

    return createJsonResponse(res, {
        data: result,
    });
});

export { router as routerApiSession };
