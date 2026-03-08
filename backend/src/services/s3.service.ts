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

import { ServerConfig } from '@/config/server.config.js'

@injectable()
@singleton()
export class S3Service {
    private readonly s3Client: S3Client
    private readonly signerClient: S3Client
    private readonly initializationPromise: Promise<void>

    constructor(private readonly config: ServerConfig) {
        const host = config.S3_HOST
        const useSsl = config.S3_USE_SSL
        const forcePathStyle = config.S3_FORCE_PATH_STYLE

        const endpoint = host ? `${useSsl ? 'https' : 'http'}://${host}` : undefined

        this.s3Client = new S3Client({
            endpoint,
            region: config.S3_REGION,
            forcePathStyle,
            credentials: {
                accessKeyId: config.S3_ACCESS_KEY_ID,
                secretAccessKey: config.S3_SECRET_ACCESS_KEY
            }
        })

        // El signerClient usa el host público para que el navegador pueda acceder
        const publicHost = config.S3_PUBLIC_HOST || host
        const publicEndpoint = publicHost ? `${useSsl ? 'https' : 'http'}://${publicHost}` : undefined

        this.signerClient = new S3Client({
            endpoint: publicEndpoint,
            region: config.S3_REGION,
            forcePathStyle,
            credentials: {
                accessKeyId: config.S3_ACCESS_KEY_ID,
                secretAccessKey: config.S3_SECRET_ACCESS_KEY
            }
        })

        this.initializationPromise = this.initializeBucket().catch(error => {
            console.warn('[S3Service] Failed to initialize bucket')
            console.error(error)
        })
    }

    private async initializeBucket(): Promise<void> {
        try {
            await this.s3Client.send(new HeadBucketCommand({ Bucket: this.config.S3_BUCKET_NAME }))
        } catch (error: any) {
            const isNotFoundError =
                error?.name === 'NoSuchBucket' ||
                error?.$metadata?.httpStatusCode === 404

            if (isNotFoundError && this.config.S3_AUTO_CREATE_BUCKET) {
                try {
                    await this.s3Client.send(new CreateBucketCommand({ Bucket: this.config.S3_BUCKET_NAME }))
                    console.log(`[S3Service] Bucket "${this.config.S3_BUCKET_NAME}" created successfully`)
                } catch (createError) {
                    console.error(`[S3Service] Failed to auto-create bucket: ${createError instanceof Error ? createError.message : String(createError)}`)
                }
            } else {
                console.warn(`[S3Service] Bucket "${this.config.S3_BUCKET_NAME}" could not be verified or accessed.`)
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

        const basePath = this.config.S3_BASE_MEDIA_PATH.replace(/^\/+/, '').replace(/\/+$/, '')
        const key = `${basePath}/${path.replace(/^\/+/, '')}`

        const command = new PutObjectCommand({
            Bucket: this.config.S3_BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: usedMime,
            CacheControl: 'public, max-age=31536000, immutable'
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
        const maxFileSize = this.config.S3_MAX_FILE_SIZE
        if (maxFileSize > 0 && buffer.length > maxFileSize) {
            throw new S3FileTooLargeError(buffer.length, maxFileSize);
        }
    }

    async getDownloadUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
        await this.initializationPromise;
        const command = new GetObjectCommand({
            Bucket: this.config.S3_BUCKET_NAME,
            Key: key
        })

        let signedUrl = await getSignedUrl(this.signerClient, command, { expiresIn: expiresInSeconds })

        // Si el host público ya apunta a la raíz del bucket, el nombre del bucket sobra en la URL
        if (this.config.S3_PUBLIC_HOST_IS_ROOT_MAPPED) {
            const url = new URL(signedUrl);

            // Explicación: El SDK añade /${this.bucket}/ al principio del pathname.
            // Lo eliminamos para que coincida con el mapeo directo de Cloudflare.
            if (url.pathname.startsWith(`/${this.config.S3_BUCKET_NAME}`)) {
                url.pathname = url.pathname.replace(`/${this.config.S3_BUCKET_NAME}`, '');
                signedUrl = url.toString();
            }
        }

        return signedUrl
    }

    async delete(key: string): Promise<boolean> {
        await this.initializationPromise;
        try {
            await this.s3Client.send(new DeleteObjectCommand({
                Bucket: this.config.S3_BUCKET_NAME,
                Key: key
            }))
            return true
        } catch {
            return false
        }
    }
}