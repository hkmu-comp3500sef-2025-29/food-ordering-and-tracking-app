import type { ApiKeyDocument } from "#/modules/apikey/apikey.schema.js";

import { ConfigManager } from "#/configs/config.manager.js";
import { DatabaseManager } from "#/configs/database.js";
import { logger } from "#/configs/logger.js";
import { HARDCODED_API_KEY } from "#/constants/index.js";
import {
    createApiKey,
    findApiKey,
    WithApiKey,
} from "#/modules/apikey/apikey.repo.js";
import { Staff } from "#/modules/staff/staff.schema.js";

const Config: ConfigManager = ConfigManager.getInstance();

export async function loadTrustedIps(): Promise<string[]> {
    const fallback = [
        "loopback",
    ];
    try {
        const response = await fetch(
            "https://api.cloudflare.com/client/v4/ips",
        );
        if (!response.ok) {
            logger.warn(
                "Failed to fetch Cloudflare IPs, status:",
                response.status,
            );
            return fallback;
        }
        const data = await response.json();
        const result = data?.result ? data.result : data;
        const ipv4: string[] = Array.isArray(result.ipv4_cidrs)
            ? result.ipv4_cidrs
            : [];
        const ipv6: string[] = Array.isArray(result.ipv6_cidrs)
            ? result.ipv6_cidrs
            : [];
        const merged = Array.from(
            new Set([
                "loopback",
                ...ipv4,
                ...ipv6,
            ]),
        );
        return merged;
    } catch (err) {
        logger.warn("Error fetching Cloudflare IPs:", err);
        return fallback;
    }
}

export async function initDatabase(): Promise<void> {
    // Ensure DB is connected for entire process lifetime
    await DatabaseManager.getInstance();

    if (!Config.get("INIT_ADMIN_API_KEY")) return void 0;

    // 1) If any admin already exists, check if the init-name admin exists and
    // create an API key for them; otherwise skip creating an additional admin.
    const adminCount = await Staff.countDocuments({
        role: "admin",
    }).exec();

    const initName = Config.get("INIT_ADMIN_NAME");

    if (adminCount > 0) {
        // If an admin with the init name exists, create a key for them.
        const namedAdmin = await Staff.findOne({
            name: initName,
            role: "admin",
        }).exec();

        if (!namedAdmin) {
            logger.info(
                "Admin user(s) already exist; skipping initial admin creation.",
            );

            return void 0;
        }

        // Check if API key already exists
        try {
            const existingApiKey: ApiKeyDocument | null = await findApiKey([
                WithApiKey(HARDCODED_API_KEY),
            ]);

            if (existingApiKey) {
                logger.info(
                    `API key already exists for existing admin '${initName}':`,
                    existingApiKey,
                );
                return void 0;
            }
        } catch (err: unknown) {
            logger.error(
                `Failed to check for existing API key for existing admin '${initName}':`,
                err,
            );
        }

        // Create API key if it doesn't exist
        try {
            const apiKey = await createApiKey(
                [
                    WithApiKey(HARDCODED_API_KEY),
                ],
                namedAdmin._id,
            );
            logger.info(
                `Created initial API key for existing admin '${initName}':`,
                apiKey,
            );
        } catch (err) {
            logger.error(
                `Failed to create API key for existing admin '${initName}':`,
                err,
            );
        }

        return void 0;
    }

    // 2) No admin exists. If a staff exists with the configured INIT_ADMIN_NAME, do NOT elevate them.
    const existingByName = await Staff.countDocuments({
        name: initName,
    }).exec();

    if (existingByName > 0) {
        logger.error(
            `Staff with name "${initName}" already exists but is not an admin. Cannot elevate to admin for security reasons. System cannot proceed without an admin. Please resolve this conflict manually.`,
        );

        return void 0;
    }

    // 3) Create an admin staff and an API key assigned to them
    const created = await Staff.create({
        name: initName,
        role: "admin",
        apiKey: [],
    });

    try {
        const apiKey = await createApiKey(
            [
                WithApiKey(HARDCODED_API_KEY),
            ],
            created._id,
        );
        logger.info("Initial admin created:", initName);
        logger.info("Initial admin API key (store this securely):", apiKey);
    } catch (err) {
        logger.error("Failed to create API key for initial admin:", err);
    }
}
