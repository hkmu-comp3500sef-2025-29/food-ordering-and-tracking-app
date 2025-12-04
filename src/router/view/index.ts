import type { NextFunction, Request, Response } from "express";

import type { DishDocument } from "#/modules/dish/dish.schema.js";

import { Router } from "express";

import {
    apiKeyAuth,
    asyncHandler,
    requireStaffRole,
    sessionContext,
} from "#/middlewares/index.js";
import { WithMongoId } from "#/modules/common/params.js";
import { findDish, findDishes } from "#/modules/dish/dish.repo.js";
import {
    findSession,
    findSessions,
    WithUuid,
} from "#/modules/session/session.repo.js";
import { httpErrors as errors, httpErrors } from "#/utils/error/index.js";

const router: Router = Router({
    mergeParams: true,
});

const navStack = [
    sessionContext({
        optional: true,
    }),
    attachNavContext,
];
const adminStack = [
    apiKeyAuth(),
    requireStaffRole([
        "admin",
    ]),
] as const;

router.get("/", ...navStack, (_req: Request, res: Response) => {
    res.render("home");
});

router.get("/menu", ...navStack, async (_req: Request, res: Response) => {
    res.locals.page = "menu";

    const items: DishDocument[] = await findDishes([]);

    res.render("menu", {
        items,
    });
});

router.get(
    "/menu/customize/:id",
    ...navStack,
    async (req: Request, res: Response) => {
        res.locals.page = "menu-customize";

        const id: string | undefined = req.params.id;

        if (!id) {
            throw httpErrors.badRequest("Dish ID is required");
        }

        const item: DishDocument | null = await findDish([
            WithMongoId(id),
        ]);

        if (!item) {
            throw httpErrors.notFound("Dish not found");
        }

        return res.render("customize", {
            item,
        });
    },
);

router.get("/cart", ...navStack, (_req: Request, res: Response) => {
    res.locals.page = "cart";
    res.render("cart");
});

router.get("/record", ...navStack, (_req: Request, res: Response) => {
    res.locals.page = "record";
    res.render("record");
});

router.get("/settings", ...navStack, (_req: Request, res: Response) => {
    res.locals.page = "settings";
    res.render("settings");
});

router.get(
    "/admin",
    ...navStack,
    ...adminStack,
    (_req: Request, res: Response) => {
        res.locals.page = "admin";
        res.render("admin/index");
    },
);

router.get(
    "/admin/qr",
    ...navStack,
    ...adminStack,
    (_req: Request, res: Response) => {
        res.locals.page = "admin-qr";
        res.render("admin/qr");
    },
);

router.get(
    "/admin/sessions",
    ...navStack,
    ...adminStack,
    asyncHandler(async (_req: Request, res: Response) => {
        res.locals.page = "admin-sessions";
        const sessions = await findSessions([]);
        res.render("admin/sessions", {
            sessions,
        });
    }),
);

router.get(
    "/admin/sessions/:uuid",
    ...navStack,
    ...adminStack,
    asyncHandler(async (req: Request, res: Response) => {
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
        res.locals.page = "admin-session";
        res.render("admin/session", {
            session,
        });
    }),
);

function attachNavContext(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    const session = req.sessionContext?.session ?? null;
    const table = req.sessionContext?.table ?? null;
    res.locals.navContext = {
        restaurantName: "Food Ordering & Tracking",
        tableNumber: table?.tableId ?? null,
        sessionUuid: session?.uuid ?? null,
    };
    next();
}

export { router as routerView };
