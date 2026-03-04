import {
    CreateBucketCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadBucketCommand,
    PutObjectCommand,
    S3Client
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { fileTypeFromBuffer } from 'file-type'
import { injectable, singleton } from 'tsyringe'

import { AppError } from '@/utils/errors.js'

export class S3UploadError extends Error {
    constructor(public key: string, public details: { reason: string; stack?: string }) {
        super(`S3 Upload Error for ${key}: ${details.reason}`)
        this.name = 'S3UploadError'
    }
}

export class S3ConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'S3ConfigError';
    }
}

export class S3FileTooLargeError extends AppError<'S3_FILE_TOO_LARGE', { size: number; maxSize: number }> {
    public readonly code = 'S3_FILE_TOO_LARGE';
    public readonly statusCode = 413;
    constructor(size: number, maxSize: number) {
        super(`File too big (${size} > ${maxSize})`);
        this.details = { size, maxSize };
        this.name = 'S3FileTooLargeError';
    }
}

@injectable()
@singleton()
export class S3Service {
    private readonly bucket: string
    private readonly region: string
    private readonly s3Client: S3Client
    private readonly signerClient: S3Client
    private readonly basePath: string
    private readonly maxFileSize: number
    private readonly minFileSize: number
    private readonly autoCreateBucket: boolean
    private readonly initializationPromise: Promise<void>

    constructor() {
        // Validation - Throw Error if critical config is missing
        if (!process.env.S3_BUCKET_NAME || !process.env.S3_REGION || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
            throw new S3ConfigError('Missing critical S3 environment variables (S3_BUCKET_NAME, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY)');
        }

        this.bucket = process.env.S3_BUCKET_NAME
        this.region = process.env.S3_REGION
        this.basePath = (process.env.S3_BASE_MEDIA_PATH ?? 'media').replace(/^\/+/, '').replace(/\/+$/, '')
        this.maxFileSize = Number(process.env.S3_MAX_FILE_SIZE ?? 50 * 1024 * 1024) // 50MB
        this.minFileSize = Number(process.env.S3_MIN_FILE_SIZE ?? 1)
        this.autoCreateBucket = process.env.S3_AUTO_CREATE_BUCKET !== 'false'

        const host = process.env.S3_HOST
        const useSsl = process.env.S3_USE_SSL === 'true'
        const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true'

        const endpoint = host ? `${useSsl ? 'https' : 'http'}://${host}` : undefined

        this.s3Client = new S3Client({
            endpoint,
            region: this.region,
            forcePathStyle,
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
            }
        })

        // El signerClient usa el host público para que el navegador pueda acceder
        const publicHost = process.env.S3_PUBLIC_HOST || host
        const publicEndpoint = publicHost ? `${useSsl ? 'https' : 'http'}://${publicHost}` : undefined

        this.signerClient = new S3Client({
            endpoint: publicEndpoint,
            region: this.region,
            forcePathStyle,
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
            }
        })

        this.initializationPromise = this.initializeBucket().catch(error => {
            console.warn('[S3Service] Failed to initialize bucket')
            console.error(error)
        })
    }

    private async initializeBucket(): Promise<void> {
        try {
            await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }))
        } catch (error: any) {
            const isNotFoundError =
                error?.name === 'NoSuchBucket' ||
                error?.$metadata?.httpStatusCode === 404

            if (isNotFoundError && this.autoCreateBucket) {
                try {
                    await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }))
                    console.log(`[S3Service] Bucket "${this.bucket}" created successfully`)
                } catch (createError) {
                    console.error(`[S3Service] Failed to auto-create bucket: ${createError instanceof Error ? createError.message : String(createError)}`)
                }
            } else {
                console.warn(`[S3Service] Bucket "${this.bucket}" could not be verified or accessed.`)
            }
        }
    }

    /**
     * Uploads a buffer directly with size validation and MIME detection
     */
    async upload(
        path: string,
        buffer: Buffer,
        mimeType?: string
    ): Promise<string> {
        await this.initializationPromise;
        this.validateBuffer(buffer)

        // Sniff MIME type from buffer for security (prevents spoofing)
        const sniffed = await fileTypeFromBuffer(buffer)
        const usedMime = sniffed?.mime ?? mimeType ?? 'application/octet-stream'

        const key = `${this.basePath}/${path.replace(/^\/+/, '')}`

        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: usedMime
        })

        try {
            await this.s3Client.send(command)
            return key
        } catch (error: any) {
            throw new S3UploadError(key, {
                reason: error?.message || String(error),
                stack: error?.stack
            })
        }
    }

    private validateBuffer(buffer: Buffer): void {
        if (this.maxFileSize > 0 && buffer.length > this.maxFileSize) {
            throw new S3FileTooLargeError(buffer.length, this.maxFileSize);
        }
    }

    async getDownloadUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
        await this.initializationPromise;
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key
        })
        return await getSignedUrl(this.signerClient, command, { expiresIn: expiresInSeconds })
    }

    async delete(key: string): Promise<boolean> {
        await this.initializationPromise;
        try {
            await this.s3Client.send(new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key
            }))
            return true
        } catch {
            return false
        }
    }
}