import { createHmac, timingSafeEqual } from "node:crypto";

import { ConfigManager } from "#/configs/config.manager";
import { logger } from "#/configs/logger";
import { findApiKey, WithApiKey } from "#/modules/apikey/apikey.repo";

export interface AuthCookiePayload {
    role: string;
    apiKey: string;
    expiredAt: number; // Unix timestamp in milliseconds
}

// Get secret from environment variable - REQUIRED in production
const getCookieSecret = (): Buffer => {
    const secret = ConfigManager.getInstance().get("COOKIE_SECRET");

    if (!secret) {
        const isProduction = process.env.NODE_ENV === "production";
        if (isProduction) {
            logger.error(
                "COOKIE_SECRET is not set in production environment. This is a critical security issue.",
            );
            throw new Error(
                "COOKIE_SECRET must be set in production environment",
            );
        }
        logger.warn(
            "COOKIE_SECRET is not set. Using insecure default for development only.",
        );
        // Use a weak default only for development
        return Buffer.from("dev-insecure-secret-change-me", "utf-8");
    }

    return secret;
};

const COOKIE_SECRET = getCookieSecret();
const COOKIE_NAME = "auth_token";
const COOKIE_MAX_AGE = 15 * 60 * 1000;
const REFRESH_THRESHOLD = 5 * 60 * 1000;

function signPayload(payload: string): string {
    const hmac = createHmac("sha256", COOKIE_SECRET);
    hmac.update(payload);
    return hmac.digest("base64url");
}

function verifySignature(payload: string, signature: string): boolean {
    const expectedSignature = signPayload(payload);

    // Convert to buffers for timing-safe comparison
    const expectedBuffer = Buffer.from(expectedSignature);
    const receivedBuffer = Buffer.from(signature);

    // Ensure both buffers are the same length before comparing
    if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
    }

    return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function createAuthCookie(payload: AuthCookiePayload): string {
    const payloadString = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadString).toString("base64url");
    const signature = signPayload(payloadBase64);

    // Format: <base64url_payload>.<signature>
    return `${payloadBase64}.${signature}`;
}

export const refreshAuthCookie = async (
    payload: AuthCookiePayload,
): Promise<string | null> => {
    const apiKeyDoc = await findApiKey([
        WithApiKey(payload.apiKey),
    ]);
    if (!apiKeyDoc) {
        return null;
    }
    if (apiKeyDoc.expiredAt && apiKeyDoc.expiredAt.getTime() <= Date.now()) {
        return null;
    }
    const apiKeyExpiryTime = apiKeyDoc.expiredAt
        ? apiKeyDoc.expiredAt.getTime()
        : Number.MAX_SAFE_INTEGER;

    const newExpiredAtTime = Math.min(
        apiKeyExpiryTime,
        Date.now() + COOKIE_MAX_AGE,
    );
    const newPayload: AuthCookiePayload = {
        role: payload.role,
        apiKey: payload.apiKey,
        expiredAt: newExpiredAtTime,
    };
    return createAuthCookie(newPayload);
};

export function parseAuthCookie(cookieValue: string): AuthCookiePayload | null {
    try {
        const parts = cookieValue.split(".");
        if (parts.length !== 2) {
            return null;
        }

        const [payloadBase64, signature] = parts;

        if (!payloadBase64 || !signature) {
            return null;
        }

        if (!verifySignature(payloadBase64, signature)) {
            return null;
        }

        // Decode and parse payload
        const payloadString = Buffer.from(payloadBase64, "base64url").toString(
            "utf-8",
        );
        const payload = JSON.parse(payloadString) as AuthCookiePayload;

        // Validate payload structure
        if (
            !payload.role ||
            !payload.apiKey ||
            typeof payload.expiredAt !== "number"
        ) {
            return null;
        }

        return payload;
    } catch (_error) {
        return null;
    }
}

export function isCookieExpired(payload: AuthCookiePayload): boolean {
    return Date.now() >= payload.expiredAt;
}

export function shouldRefreshCookie(payload: AuthCookiePayload): boolean {
    const timeUntilExpiry = payload.expiredAt - Date.now();
    return timeUntilExpiry > 0 && timeUntilExpiry <= REFRESH_THRESHOLD;
}

export function getCookieConfig() {
    return {
        name: COOKIE_NAME,
        maxAge: COOKIE_MAX_AGE,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // HTTPS only in production
        sameSite: "strict" as const,
        path: "/",
    };
}
