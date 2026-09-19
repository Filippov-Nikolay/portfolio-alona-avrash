import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

export async function writeJsonObject(key: string, data: unknown): Promise<void> {
    await getClient().send(
        new PutObjectCommand({
            Bucket: requiredEnv("R2_BUCKET_NAME"),
            Key: key,
            Body: `${JSON.stringify(data, null, 4)}\n`,
            ContentType: "application/json",
        })
    );
}

export async function writeObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await getClient().send(
        new PutObjectCommand({
            Bucket: requiredEnv("R2_BUCKET_NAME"),
            Key: key,
            Body: body,
            ContentType: contentType,
        })
    );
}
