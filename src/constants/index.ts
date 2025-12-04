import path from "node:path";

/**
 * The environment variable for the application.
 */
const NODE_ENV: string = process.env.NODE_ENV || "development";

/**
 * Whether the application is running in development mode.
 */
const IS_DEV: boolean = NODE_ENV === "development";

/**
 * Whether the application is running in production mode.
 */
const IS_PRD: boolean = NODE_ENV === "production";

/**
 * The path to the root directory.
 */
const PATH_ROOT: string = process.cwd();

const PATH_ENV: string = IS_PRD
    ? path.join(PATH_ROOT, "env")
    : path.join(PATH_ROOT);

/**
 * The path to the views directory.
 */
const PATH_VIEWS: string = IS_PRD
    ? path.join(PATH_ROOT, "dist", "views")
    : path.join(PATH_ROOT, "src", "views");

/**
 * The path to the public directory.
 */
const PATH_PUBLIC: string = IS_PRD
    ? path.join(PATH_ROOT, "dist", "public")
    : path.join(PATH_ROOT, "public");

/**
 * Hardcoded API key for the application.
 *
 * This is a worst practice, but it works.
 */
const HARDCODED_API_KEY =
    "279fca02ea24283477a4e3723e490b69f2c9d99a714f26859038cd290fc7a875" as const;

export {
    NODE_ENV,
    IS_DEV,
    IS_PRD,
    PATH_ROOT,
    PATH_ENV,
    PATH_VIEWS,
    PATH_PUBLIC,
    HARDCODED_API_KEY,
};
