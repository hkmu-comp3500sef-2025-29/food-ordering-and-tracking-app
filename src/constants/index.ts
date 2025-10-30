import * as Path from "node:path";

/**
 * The path to the views directory.
 */
const PATH_VIEWS: string = import.meta.env.PROD
    ? Path.join(__dirname, "views")
    : Path.join(process.cwd(), "src", "views");

/**
 * The path to the public directory.
 */
const PATH_PUBLIC: string = import.meta.env.PROD
    ? Path.join(__dirname)
    : Path.join(process.cwd(), "public");

/**
 * The port to run the server on.
 *
 * By default, it is `3000`.
 */
const PORT: number = Number(import.meta.env.VITE_PORT) || 3000;

export { PATH_VIEWS, PATH_PUBLIC, PORT };
