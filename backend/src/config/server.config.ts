import "dotenv/config";
import "reflect-metadata";
import { singleton } from "tsyringe";
import { z } from "zod";
import ms from "ms";
import type { StringValue } from "ms";

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
    JWT_EXPIRATION: z.preprocess(emptyToUndefined, msSchema.default("30d")).transform(v => v as StringValue),
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
    S3_MAX_FILE_SIZE: z.preprocess((val) => {
        const v = emptyToUndefined(val);
        return v === undefined ? undefined : Number(v);
    }, z.number().positive().default(50 * 1024 * 1024)),
    S3_AUTO_CREATE_BUCKET: z.preprocess((val) => {
        const v = emptyToUndefined(val);
        return v === undefined ? undefined : v === "true";
    }, z.boolean().default(true)),
    S3_PUBLIC_HOST_IS_ROOT_MAPPED: z.preprocess((val) => {
        const v = emptyToUndefined(val);
        return v === undefined ? undefined : v === "true";
    }, z.boolean().default(false)),
    SERPAPI_API_KEY: z.preprocess(emptyToUndefined, z.string()),
});

export type ServerConfigType = z.output<typeof serverConfigSchema>;

@singleton()
export class ServerConfig {
    constructor() {
        const result = serverConfigSchema.safeParse(process.env);

        if (!result.success) {
            console.error("❌ Invalid environment variables:", result.error.format());
            throw new Error("Invalid environment variables");
        }

        Object.assign(this, result.data);
    }
}

export interface ServerConfig extends ServerConfigType { }
