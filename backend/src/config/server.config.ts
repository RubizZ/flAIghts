import "dotenv/config";
import { singleton } from "tsyringe";
import { z } from "zod";
import ms from "ms";
import type { StringValue } from "ms";
import bytes from "bytes";
import logger from "../utils/logger.js";

const emptyToUndefined = (val: unknown) => {
    if (typeof val !== "string") return val;
    const trimmed = val.trim();
    return trimmed === "" ? undefined : trimmed;
};

// Validador para formatos de tiempo de la librería 'ms'
const msSchema = z.string().refine((val) => {
    try {
        const result = ms(val as any);
        return result !== undefined && result !== null;
    } catch {
        return false;
    }
}, {
    message: "Invalid time format (e.g., '30d', '1h', '2 days')"
});

const bytesSchema = z.string().refine((val) => {
    try {
        const result = bytes(val);
        return result !== undefined && result !== null;
    } catch {
        return false;
    }
}, {
    message: "Invalid bytes format (e.g., '50MB', '1GB', '2TB')"
});

// Validador de puerto
const portSchema = z.preprocess((val) => {
    const v = emptyToUndefined(val);
    return v === undefined ? undefined : Number(v);
}, z.number().int().min(1).max(65535));

const serverConfigSchema = z.object({
    NODE_ENV: z.preprocess(emptyToUndefined, z.enum(["development", "production", "test"]).default("development")),
    PORT: portSchema.default(3000),
    MONGODB_URI: z.preprocess(emptyToUndefined, z.url()),
    JWT_SECRET: z.preprocess(emptyToUndefined, z.string()),
    JWT_EXPIRATION: z.preprocess(emptyToUndefined, msSchema.default("7d")).transform(v => v as StringValue),
    FRONTEND_URL: z.preprocess(emptyToUndefined, z.url().transform(s => s.replace(/\/$/, ""))),
    ALLOWED_ORIGINS: z.preprocess(emptyToUndefined, z.string().optional().transform((val) =>
        val ? val.split(",").map((o) => o.trim().replace(/\/$/, "")) : []
    )),
    SMTP_HOST: z.preprocess(emptyToUndefined, z.string()),
    SMTP_PORT: portSchema,
    SMTP_USER: z.preprocess(emptyToUndefined, z.string()),
    SMTP_PASS: z.preprocess(emptyToUndefined, z.string()),
    SMTP_FROM: z.preprocess(emptyToUndefined, z.string().regex(/^.+\s<.+@.+\..+>$/, {
        message: "SMTP_FROM must be in the format 'Name <email@example.com>'"
    })),
    FLIGHT_CACHE_TTL: z.preprocess(emptyToUndefined, msSchema.default("24h")).transform(v => v as StringValue),
    S3_HOST: z.preprocess(emptyToUndefined, z.string()),
    S3_PUBLIC_HOST: z.preprocess(emptyToUndefined, z.string()),
    S3_USE_SSL: z.preprocess((val) => {
        const v = emptyToUndefined(val);
        return v === undefined ? undefined : v === "true";
    }, z.boolean().default(false)),
    S3_FORCE_PATH_STYLE: z.preprocess((val) => {
        const v = emptyToUndefined(val);
        return v === undefined ? undefined : v === "true";
    }, z.boolean().default(true)),
    S3_BUCKET_NAME: z.preprocess(emptyToUndefined, z.string()),
    S3_REGION: z.preprocess(emptyToUndefined, z.string()),
    S3_ACCESS_KEY_ID: z.preprocess(emptyToUndefined, z.string()),
    S3_SECRET_ACCESS_KEY: z.preprocess(emptyToUndefined, z.string()),
    S3_BASE_MEDIA_PATH: z.preprocess(emptyToUndefined, z.string().default("media")),
    S3_MAX_FILE_SIZE: z.preprocess(emptyToUndefined, bytesSchema.default("50MB")),
    S3_AUTO_CREATE_BUCKET: z.preprocess((val) => {
        const v = emptyToUndefined(val);
        return v === undefined ? undefined : v === "true";
    }, z.boolean().default(true)),
    S3_PUBLIC_HOST_IS_ROOT_MAPPED: z.preprocess((val) => {
        const v = emptyToUndefined(val);
        return v === undefined ? undefined : v === "true";
    }, z.boolean().default(false)),
    SERPAPI_API_KEY: z.preprocess(emptyToUndefined, z.string()),
    OPENAI_API_KEY: z.preprocess(emptyToUndefined, z.string()),
    OPENAI_BASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
    AVAILABLE_MODELS: z.preprocess(emptyToUndefined, z.string().optional().transform((val) =>
        val ? val.split(",").map((o) => o.trim()) : []
    )),
    GEOCODING_PROVIDER: z.preprocess(emptyToUndefined, z.enum(["nominatim", "google"]).default("nominatim")),
    GEOCODING_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
    GEOCODE_CACHE_TTL: z.preprocess(emptyToUndefined, msSchema.default("7d")).transform(v => v as StringValue),
    GOOGLE_CLIENT_ID: z.preprocess(emptyToUndefined, z.string()),
    SECURITY_CODE_EXPIRATION: z.preprocess(emptyToUndefined, msSchema.default("1h")).transform(v => v as StringValue),
    TURNSTILE_SECRET_KEY: z.preprocess(emptyToUndefined, z.string()),
}).superRefine((data, ctx) => {
    if (data.GEOCODING_PROVIDER === "google" && !data.GEOCODING_API_KEY) {
        ctx.addIssue({
            code: "custom",
            message: "GEOCODING_API_KEY is required when GEOCODING_PROVIDER is 'google'",
            path: ["GEOCODING_API_KEY"],
        });
    }

    const TURNSTILE_TEST_KEYS = [
        "1x0000000000000000000000000000000AA", // Always pass
        "2x0000000000000000000000000000000AA", // Always fail
        "3x0000000000000000000000000000000AA"  // Always token already spent
    ];

    if (data.NODE_ENV === "production" && TURNSTILE_TEST_KEYS.includes(data.TURNSTILE_SECRET_KEY)) {
        ctx.addIssue({
            code: "custom",
            message: "Turnstile test keys are only allowed in non-production environments",
            path: ["TURNSTILE_SECRET_KEY"],
        });
    }
});

function sanitize<K extends keyof ServerConfigType>(val: ServerConfigType[K], field: K): ServerConfigType[K] | string {
    switch (field) {
        // Secret keys and sensitive values
        case "JWT_SECRET":
        case "S3_SECRET_ACCESS_KEY":
        case "S3_ACCESS_KEY_ID":
        case "SMTP_PASS":
        case "SMTP_USER":
        case "SERPAPI_API_KEY":
        case "MONGODB_URI":
        case "OPENAI_API_KEY":
        case "GEOCODING_API_KEY":
        case "GOOGLE_CLIENT_ID":
        case "TURNSTILE_SECRET_KEY":
            return "[REDACTED] (please check .env file)";
        // Other non-sensitive values
        default:
            return val;
    }
}

type SanitizedConfig = {
    [K in keyof ServerConfigType]: ServerConfigType[K] | string;
}

function sanitizeConfig(config: ServerConfigType): SanitizedConfig {
    const obj = { ...config } as any;
    for (const field of Object.keys(config) as (keyof ServerConfigType)[]) {
        obj[field] = sanitize(config[field], field);
    }
    return obj as SanitizedConfig;
}

export type ServerConfigType = z.output<typeof serverConfigSchema>;

@singleton()
export class ServerConfig {
    constructor() {
        const result = serverConfigSchema.safeParse(process.env);

        if (!result.success) {
            logger.error({ errors: result.error.format() }, "❌ Invalid environment variables");
            throw new Error("Invalid environment variables");
        }

        Object.assign(this, result.data);

        logger.info(sanitizeConfig(this), "Server configuration loaded");
    }
}

export interface ServerConfig extends ServerConfigType { }