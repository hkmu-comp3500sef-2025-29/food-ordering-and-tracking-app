import { z } from "zod";

const MONGODB_URI_REGEX = /^mongodb(\+srv)?:\/\/.+/;
const MONGODB_DATABASE_NAME_REGEX = /^[\w-]+$/;

export const configSchema = z.object({
    MONGODB_URI: z
        .string()
        .min(10, "MongoDB URI is too short")
        .regex(MONGODB_URI_REGEX, "Invalid MongoDB URI format"),

    MONGODB_DB_NAME: z
        .string()
        .min(1, "Database name cannot be empty")
        .max(64, "Database name is too long")
        .regex(
            MONGODB_DATABASE_NAME_REGEX,
            "Database name must contain only letters, digits, hyphens, or underscores.",
        )
        .refine(
            (val) =>
                ![
                    "admin",
                    "local",
                    "config",
                ].includes(val),
            {
                message: "Database name is a reserved system name.",
            },
        )
        .optional()
        .default("food-ordering-and-tracking-app"),

    PORT: z.coerce
        .number()
        .min(1, "Port number must be at least 1")
        .max(65535, "Port number must be at most 65535")
        .optional()
        .default(3000),

    API_VERSION: z
        .string()
        .regex(/^v\d+$/, 'API version must follow the format "vN", e.g., "v1".')
        .optional()
        .default("v1"),

    INIT_ADMIN_NAME: z
        .string()
        .min(1, "Initial admin name must be at least 1 character long")
        .optional()
        .default("admin"),
    INIT_ADMIN_API_KEY: z.boolean().optional().default(false),
});

export type Config = z.infer<typeof configSchema>;
export type ConfigKey = keyof Config;
