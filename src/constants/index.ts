import * as Path from "node:path";

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
    ? Path.join(PATH_ROOT, "env")
    : Path.join(PATH_ROOT);

/**
 * The path to the views directory.
 */
const PATH_VIEWS: string = IS_PRD
    ? Path.join(PATH_ROOT, "views")
    : Path.join(PATH_ROOT, "src", "views");

/**
 * The path to the public directory.
 */
const PATH_PUBLIC: string = Path.join(PATH_ROOT, "public");

/**
 * The port to run the server on.
 *
 * By default, it is `8080`.
 */
const PORT: number = Number(process.env.PORT || 8080);

/**
 * The MongoDB connection URI.
 */
const MONGODB_URI: string = process.env.MONGODB_URI ?? "";

/**
 * The MongoDB database name.
 */
const MONGODB_DB_NAME: string = process.env.MONGODB_DB_NAME ?? "";

export {
    NODE_ENV,
    IS_DEV,
    IS_PRD,
    PATH_ROOT,
    PATH_ENV,
    PATH_VIEWS,
    PATH_PUBLIC,
    PORT,
    MONGODB_URI,
    MONGODB_DB_NAME,
};
