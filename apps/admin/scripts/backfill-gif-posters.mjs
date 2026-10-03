import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

const GIF_EXTENSION = /\.gif$/i;
const PROJECTS_KEY = "content/projects.json";
const IMMUTABLE_IMAGE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const POSTER_MAX_WIDTH = 2560;

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");
const driver = process.env.ADMIN_STORAGE_DRIVER === "r2" ? "r2" : "filesystem";

function requiredEnv(name) {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required env var "${name}" for the R2 storage driver.`);
    return value;
}

function posterSrcFor(src) {
    return src.replace(GIF_EXTENSION, "-poster.webp");
}

function createPoster(gif) {
    return sharp(gif, { pages: 1, limitInputPixels: 100_000_000 })
        .resize({ width: POSTER_MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
}

function serializeProjects(projects) {
    return `${JSON.stringify(projects, null, 4)}\n`;
}

function filesystemStore() {
    const contentDir =
        process.env.ADMIN_CONTENT_DIR ??
        path.join(process.cwd(), "..", "..", "packages", "content-data", "src");
    const publicDir = path.join(process.cwd(), "..", "web", "public");
    const projectsFile = path.join(contentDir, "projects.json");

    function fileFor(src) {
        if (!src.startsWith("/") || src.startsWith("//")) return null;
        if (process.env.ADMIN_CONTENT_DIR && src.startsWith("/projects/uploads/")) {
            return path.join(contentDir, "uploads", src.slice("/projects/uploads/".length));
        }
        return path.join(publicDir, src);
    }

    return {
        description: `filesystem (${projectsFile})`,
        readProjects: async () => JSON.parse(await readFile(projectsFile, "utf-8")),
        writeProjects: (projects) => writeFile(projectsFile, serializeProjects(projects), "utf-8"),
        locate: (src) => fileFor(src),
        readImage: (file) => readFile(file),
        writePoster: (file, poster) => writeFile(posterSrcFor(file), poster),
        notify: async () => {},
    };
}

function r2Store() {
    const bucket = requiredEnv("R2_BUCKET_NAME");
    const publicBase = requiredEnv("R2_PUBLIC_URL_BASE").replace(/\/$/, "");
    const client = new S3Client({
        region: "auto",
        endpoint: `https://${requiredEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
            secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
        },
    });

    async function getObject(key) {
        const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        return Buffer.from(await response.Body.transformToByteArray());
    }

    return {
        description: `r2 (bucket ${bucket})`,
        readProjects: async () => JSON.parse((await getObject(PROJECTS_KEY)).toString("utf-8")),
        writeProjects: (projects) =>
            client.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: PROJECTS_KEY,
                    Body: serializeProjects(projects),
                    ContentType: "application/json",
                })
            ),
        locate: (src) => {
            if (src.startsWith(`${publicBase}/`)) return src.slice(publicBase.length + 1);
            if (src.startsWith("/") && !src.startsWith("//")) return src.slice(1);
            return null;
        },
        readImage: (key) => getObject(key),
        writePoster: (key, poster) =>
            client.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: posterSrcFor(key),
                    Body: poster,
                    ContentType: "image/webp",
                    CacheControl: IMMUTABLE_IMAGE_CACHE_CONTROL,
                })
            ),
        notify: async () => {
            const url = process.env.WEB_REVALIDATE_URL;
            const secret = process.env.REVALIDATE_SECRET;
            if (!url || !secret) {
                console.warn(
                    "WEB_REVALIDATE_URL or REVALIDATE_SECRET is not set; web keeps its cached projects until they expire."
                );
                return;
            }
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
                body: JSON.stringify({ tag: "projects" }),
            });
            if (!response.ok) console.warn(`Web revalidation responded ${response.status}.`);
        },
    };
}

const store = driver === "r2" ? r2Store() : filesystemStore();
const projects = await store.readProjects();
if (!Array.isArray(projects)) throw new Error("projects.json does not contain a list of projects.");

let created = 0;
const skipped = [];

for (const project of projects) {
    for (const image of project.image ?? []) {
        if (!GIF_EXTENSION.test(image.src) || (image.posterSrc && !force)) continue;
        const location = store.locate(image.src);
        if (!location) {
            skipped.push(`${project.name}: ${image.src} (not in this storage)`);
            continue;
        }
        if (dryRun) {
            console.log(`would create ${posterSrcFor(image.src)}`);
            created++;
            continue;
        }
        try {
            const poster = await createPoster(await store.readImage(location));
            await store.writePoster(location, poster);
            image.posterSrc = posterSrcFor(image.src);
            created++;
            console.log(`created ${image.posterSrc} (${Math.round(poster.length / 1024)} KB)`);
        } catch (error) {
            skipped.push(`${project.name}: ${image.src} (${error.message})`);
        }
    }
}

if (!dryRun && created > 0) {
    await store.writeProjects(projects);
    await store.notify();
}

console.log(
    `${dryRun ? "Dry run on" : "Done on"} ${store.description}: ${created} poster(s) ${dryRun ? "to create" : "created"}, ${skipped.length} skipped.`
);
for (const reason of skipped) console.log(`  skipped ${reason}`);
