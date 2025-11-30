import { Router } from "express";
import { z } from "zod";

import { safeDbOperation } from "#/error/index.js";
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
    sessionContext({ optional: true }),
    asyncHandler(async (req, res) => {
        if (!req.sessionContext || !req.sessionContext.session) {
            throw errors.unauthorized(
                "Valid session identifier required to access current session",
                401,
                "SESSION_NOT_FOUND",
            );
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
        const params: any[] = [];
        if (parsed.success) {
            if (parsed.data.status) {
                params.push(WithStatus(parsed.data.status));
            }
        } else {
            throw errors.badRequest(
                "Invalid query parameters",
                400,
                "INVALID_QUERY_PARAMS",
                parsed.error.issues.map((issue) => ({
                    path: issue.path.join("."),
                    message: issue.message,
                })),
            );
        }
        const sessions = await safeDbOperation(() => findSessions(params));
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
            throw errors.badRequest(
                "Session UUID is required in the URL path",
                400,
                "MISSING_SESSION_UUID",
            );
        }
        const session = await safeDbOperation(() => findSession([
            WithUuid(uuid),
        ]));
        if (!session) {
            throw errors.notFound(
                `Session with UUID '${uuid}' not found`,
                404,
                "SESSION_NOT_FOUND",
            );
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
        const params: any[] = [];

        if (payload.tableId) {
            params.push(WithSessionTableId(payload.tableId));
        } else if (payload.tableNumber !== undefined) {
            const tableNumber =
                typeof payload.tableNumber === "string"
                    ? Number(payload.tableNumber)
                    : payload.tableNumber;
            if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
                throw errors.badRequest(
                    "Table number must be a positive integer",
                    400,
                    "INVALID_TABLE_NUMBER",
                );
            }
            const tableDoc = await safeDbOperation(() => findTable([
                WithTableByNumber(tableNumber),
            ]));
            if (!tableDoc) {
                throw errors.notFound(
                    `Table number ${tableNumber} not found`,
                    404,
                    "TABLE_NOT_FOUND",
                );
            }
            params.push(WithSessionTableId(tableDoc._id as string));
        }

        const session = await safeDbOperation(() => createSession(params));
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
            throw errors.badRequest(
                "Session UUID is required in the URL path",
                400,
                "MISSING_SESSION_UUID",
            );
        }
        const session = await closeSession([
            WithUuid(uuid),
        ]);
        if (!session) {
            throw errors.notFound(
                `Session with UUID '${uuid}' not found or already closed`,
                404,
                "SESSION_NOT_FOUND",
            );
        }
        res.json({
            success: true,
            data: session,
        });
    }),
);

export { router as sessionsRouter };
