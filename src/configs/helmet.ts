import type { HelmetOptions } from "helmet";

export const helmetConfig: Readonly<HelmetOptions> = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: [
                "'self'",
            ],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
            ],
            imgSrc: [
                "'self'",
                "data:",
                "https:",
            ],
            connectSrc: [
                "'self'",
            ],
            fontSrc: [
                "'self'",
            ],
            objectSrc: [
                "'none'",
            ],
            mediaSrc: [
                "'self'",
            ],
            frameSrc: [
                "'none'",
            ],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: {
        policy: "same-origin-allow-popups",
    },
    crossOriginResourcePolicy: {
        policy: "same-origin",
    },
    dnsPrefetchControl: {
        allow: false,
    },
    frameguard: {
        action: "deny",
    },
    hidePoweredBy: true,
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: {
        policy: "strict-origin-when-cross-origin",
    },
    xssFilter: true,
};
