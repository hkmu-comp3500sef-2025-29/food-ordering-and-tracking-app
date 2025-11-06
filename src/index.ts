import type { Express, NextFunction, Request, Response } from "express";

import * as Path from "node:path";

import dotenv from "dotenv";
import express from "express";

import { connectDatabase } from "#/configs/database";
import { NODE_ENV, PATH_ENV, PATH_PUBLIC, PATH_VIEWS, PORT } from "#/constants";
import { router } from "#/router";

dotenv.config({
    path: Path.join(PATH_ENV, ".env"),
    override: true,
});

dotenv.config({
    path: Path.join(PATH_ENV, `.env.${NODE_ENV}`),
    override: true,
});

dotenv.config({
    path: Path.join(PATH_ENV, `.env.${NODE_ENV}.local`),
    override: true,
});

const app: Express = express();

app.set("view engine", "ejs");

app.set("views", PATH_VIEWS);

app.use(
    async (
        _req: Request,
        _res: Response,
        next: NextFunction,
    ): Promise<void> => {
        await connectDatabase();
        next();
    },
);

app.use(express.json());

app.use("/", router);

app.use("/static", express.static(PATH_PUBLIC));

app.listen(PORT, (): void => {
    console.log(`Server running on port ${PORT}`);
});
