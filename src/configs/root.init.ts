import { ConfigManager } from "#/configs/config.manager.js";
import { DatabaseManager } from "#/configs/database.js";
import { logger } from "#/configs/logger.js";
import { createApiKey } from "#/modules/apikey/apikey.repo.js";
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
    if (Config.get("INIT_ADMIN_API_KEY")) {
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
            if (namedAdmin) {
                try {
                    const apiKey = await createApiKey(
                        [],
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
            } else {
                logger.info(
                    "Admin user(s) already exist; skipping initial admin creation.",
                );
            }
        } else {
            // 2) No admin exists. If a staff exists with the configured INIT_ADMIN_NAME, do NOT elevate them.
            const existingByName = await Staff.countDocuments({
                name: initName,
            }).exec();
            if (existingByName > 0) {
                logger.error(
                    `Staff with name "${initName}" already exists but is not an admin. Cannot elevate to admin for security reasons. System cannot proceed without an admin. Please resolve this conflict manually.`,
                );
            } else {
                // 3) Create an admin staff and an API key assigned to them
                const created = await Staff.create({
                    name: initName,
                    role: "admin",
                    apiKey: [],
                });
                try {
                    const apiKey = await createApiKey([], created._id);
                    logger.info("Initial admin created:", initName);
                    logger.info(
                        "Initial admin API key (store this securely):",
                        apiKey,
                    );
                } catch (err) {
                    logger.error(
                        "Failed to create API key for initial admin:",
                        err,
                    );
                }
            }
        }
    }
}
