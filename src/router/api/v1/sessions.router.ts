import { Router } from "express";
import { z } from "zod";

import {
    apiKeyAuth,
    asyncHandler,
    authLimiter,
    requireStaffRole,
    sessionContext,
} from "#/middlewares/index.js";
import {
    closeSession,
    createSession,
    findSession,
    findSessions,
    WithTableId as WithSessionTableId,
    WithStatus,
    WithUuid,
} from "#/modules/session/session.repo.js";
import {
    findTable,
    WithTableId as WithTableByNumber,
} from "#/modules/table/table.repo.js";
import { httpErrors as errors } from "#/utils/error/index.js";

const router: Router = Router({
    mergeParams: true,
});

const createSessionSchema = z.object({
    tableId: z.string().optional(),
    tableNumber: z
        .union([
            z.string(),
            z.number(),
        ])
        .optional(),
});

const listQuerySchema = z.object({
    status: z
        .enum([
            "active",
            "cancelled",
            "closed",
        ])
        .optional(),
});

router.get(
    "/current",
    sessionContext(),
    asyncHandler(async (req, res) => {
        if (!req.sessionContext) {
            throw errors.unauthorized("Session not found");
        }
        res.json({
            success: true,
            data: req.sessionContext,
        });
    }),
);

router.get(
    "/",
    apiKeyAuth(),
    requireStaffRole([
        "admin",
        "waiter",
    ]),
    asyncHandler(async (req, res) => {
        const parsed = listQuerySchema.safeParse(req.query);
        const params = [];
        if (parsed.success && parsed.data.status) {
            params.push(WithStatus(parsed.data.status));
        }
        const sessions = await findSessions(params);
        res.json({
            success: true,
            data: sessions,
        });
    }),
);

router.get(
    "/:uuid",
    apiKeyAuth(),
    requireStaffRole([
        "admin",
        "waiter",
    ]),
    asyncHandler(async (req, res) => {
        const { uuid } = req.params;
        if (!uuid) {
            throw errors.badRequest("uuid is required");
        }
        const session = await findSession([
            WithUuid(uuid),
        ]);
        if (!session) {
            throw errors.notFound("Session not found");
        }
        res.json({
            success: true,
            data: session,
        });
    }),
);

router.post(
    "/",
    authLimiter,
    apiKeyAuth(),
    requireStaffRole([
        "admin",
        "waiter",
    ]),
    asyncHandler(async (req, res) => {
        const payload = createSessionSchema.parse(req.body ?? {});
        const params = [];

        if (payload.tableId) {
            params.push(WithSessionTableId(payload.tableId));
        } else if (payload.tableNumber !== undefined) {
            const tableNumber =
                typeof payload.tableNumber === "string"
                    ? Number(payload.tableNumber)
                    : payload.tableNumber;
            if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
                throw errors.badRequest(
                    "tableNumber must be a positive integer",
                );
            }
            const tableDoc = await findTable([
                WithTableByNumber(tableNumber),
            ]);
            if (!tableDoc) {
                throw errors.notFound("Table not found");
            }
            params.push(WithSessionTableId(tableDoc._id as string));
        }

        const session = await createSession(params);
        res.status(201).json({
            success: true,
            data: session,
        });
    }),
);

router.patch(
    "/:uuid/close",
    apiKeyAuth(),
    requireStaffRole([
        "admin",
        "waiter",
    ]),
    asyncHandler(async (req, res) => {
        const { uuid } = req.params;
        if (!uuid) {
            throw errors.badRequest("uuid is required");
        }
        const session = await closeSession([
            WithUuid(uuid),
        ]);
        if (!session) {
            throw errors.notFound("Session not found");
        }
        res.json({
            success: true,
            data: session,
        });
    }),
);

export { router as sessionsRouter };
