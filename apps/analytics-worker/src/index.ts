import { handleEvent } from "./handleEvent";
import {
    getEngagement,
    getOverview,
    getProjectDetail,
    getTopCategories,
    getTopProjects,
    getTraffic,
    parseDays,
} from "./analyticsQueries";
import { deleteEventsBefore } from "./db";
import { isAllowedOrigin, isAuthorizedRead } from "./security";
import { computeVisitorId, isBotUserAgent, parseUserAgent } from "./userAgent";

export interface Env {
    DB: D1Database;
    ALLOWED_ORIGIN: string;
    ANALYTICS_READ_SECRET: string;
    VISITOR_SALT?: string;
    RETENTION_DAYS?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RETENTION_DAYS = 730;

function retentionDays(env: Env): number {
    const value = Number(env.RETENTION_DAYS);
    return Number.isInteger(value) && value > 0 ? value : DEFAULT_RETENTION_DAYS;
}

function ownHosts(env: Env): string[] {
    try {
        return [new URL(env.ALLOWED_ORIGIN).hostname.replace(/^www\./, "")];
    } catch {
        return [];
    }
}

function corsHeaders(origin: string): HeadersInit {
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
}

async function handleEventRequest(
    request: Request,
    env: Env,
    headers: HeadersInit
): Promise<Response> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return new Response("Invalid request body.", { status: 400, headers });
    }

    const userAgent = request.headers.get("User-Agent");
    if (isBotUserAgent(userAgent)) return new Response(null, { status: 204, headers });

    const country = (request.cf?.country as string | undefined) ?? null;
    const visitorId = await computeVisitorId({
        ip: request.headers.get("CF-Connecting-IP"),
        userAgent,
        salt: env.VISITOR_SALT || env.ANALYTICS_READ_SECRET,
    });
    const result = await handleEvent({
        body,
        country,
        visitorId,
        client: parseUserAgent(userAgent),
        db: env.DB,
    });

    return new Response(null, { status: result.status, headers });
}

async function handleAnalyticsRead(
    request: Request,
    env: Env,
    url: URL,
    headers: HeadersInit
): Promise<Response> {
    if (!isAuthorizedRead(request, env.ANALYTICS_READ_SECRET)) {
        return new Response("Unauthorized", { status: 401, headers });
    }

    const days = parseDays(url.searchParams.get("days"));
    const jsonHeaders = { ...headers, "Content-Type": "application/json" };

    if (url.pathname === "/analytics/overview") {
        return Response.json(await getOverview(env.DB, days), { headers: jsonHeaders });
    }

    if (url.pathname === "/analytics/projects") {
        return Response.json(await getTopProjects(env.DB, days), { headers: jsonHeaders });
    }

    if (url.pathname === "/analytics/traffic") {
        return Response.json(await getTraffic(env.DB, days, ownHosts(env)), {
            headers: jsonHeaders,
        });
    }

    if (url.pathname === "/analytics/engagement") {
        return Response.json(await getEngagement(env.DB, days), { headers: jsonHeaders });
    }

    if (url.pathname === "/analytics/categories") {
        return Response.json(await getTopCategories(env.DB, days), { headers: jsonHeaders });
    }

    const projectMatch = /^\/analytics\/projects\/([^/]+)$/.exec(url.pathname);
    if (projectMatch) {
        const entityId = decodeURIComponent(projectMatch[1]!);
        return Response.json(await getProjectDetail(env.DB, entityId, days), {
            headers: jsonHeaders,
        });
    }

    return new Response("Not found", { status: 404, headers });
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const headers = corsHeaders(env.ALLOWED_ORIGIN);

        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers });
        }

        const url = new URL(request.url);

        if (request.method === "POST" && url.pathname === "/event") {
            if (!isAllowedOrigin(request, env.ALLOWED_ORIGIN)) {
                return new Response("Forbidden", { status: 403, headers });
            }
            return handleEventRequest(request, env, headers);
        }

        if (request.method === "GET" && url.pathname.startsWith("/analytics/")) {
            return handleAnalyticsRead(request, env, url, headers);
        }

        return new Response("Not found", { status: 404, headers });
    },

    async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
        await deleteEventsBefore(env.DB, Date.now() - retentionDays(env) * DAY_MS);
    },
};
