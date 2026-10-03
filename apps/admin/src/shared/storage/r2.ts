import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const IMMUTABLE_IMAGE_CACHE_CONTROL = "public, max-age=31536000, immutable";

// Cloudflare R2 exposes an S3-compatible API, so the regular AWS SDK works
// against it - only the endpoint/credentials differ. See
// apps/admin/.env.example for what each env var below needs to be set to.
function requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required env var "${name}" for the R2 storage driver.`);
    }
    return value;
}

let client: S3Client | undefined;

function getClient(): S3Client {
    if (!client) {
        client = new S3Client({
            region: "auto",
            endpoint: `https://${requiredEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
                secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
            },
        });
    }
    return client;
}

export function r2PublicUrl(key: string): string {
    return `${requiredEnv("R2_PUBLIC_URL_BASE").replace(/\/$/, "")}/${key}`;
}

export async function readJsonObject<T>(key: string): Promise<T> {
    const response = await getClient().send(
        new GetObjectCommand({ Bucket: requiredEnv("R2_BUCKET_NAME"), Key: key })
    );
    const raw = await response.Body!.transformToString("utf-8");
    return JSON.parse(raw) as T;
}

export async function writeJsonObject(
    key: string,
    data: unknown,
    cacheControl?: string
): Promise<void> {
    await getClient().send(
        new PutObjectCommand({
            Bucket: requiredEnv("R2_BUCKET_NAME"),
            Key: key,
            Body: `${JSON.stringify(data, null, 4)}\n`,
            ContentType: "application/json",
            ...(cacheControl ? { CacheControl: cacheControl } : {}),
        })
    );
}

export async function readObject(key: string): Promise<Uint8Array> {
    const response = await getClient().send(
        new GetObjectCommand({ Bucket: requiredEnv("R2_BUCKET_NAME"), Key: key })
    );
    if (!response.Body) throw new Error("Stored file is empty.");
    return response.Body.transformToByteArray();
}

export async function writeObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await getClient().send(
        new PutObjectCommand({
            Bucket: requiredEnv("R2_BUCKET_NAME"),
            Key: key,
            Body: body,
            ContentType: contentType,
            CacheControl: IMMUTABLE_IMAGE_CACHE_CONTROL,
        })
    );
}

export async function deleteObject(key: string): Promise<void> {
    await getClient().send(
        new DeleteObjectCommand({ Bucket: requiredEnv("R2_BUCKET_NAME"), Key: key })
    );
}

export async function presignUpload(
    key: string,
    contentType: string,
    expiresInSeconds: number
): Promise<string> {
    return getSignedUrl(
        getClient(),
        new PutObjectCommand({
            Bucket: requiredEnv("R2_BUCKET_NAME"),
            Key: key,
            ContentType: contentType,
        }),
        { expiresIn: expiresInSeconds }
    );
}

export async function objectSize(key: string): Promise<number> {
    const response = await getClient().send(
        new HeadObjectCommand({ Bucket: requiredEnv("R2_BUCKET_NAME"), Key: key })
    );
    return response.ContentLength ?? 0;
}
