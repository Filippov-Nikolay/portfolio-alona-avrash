import { AnalyticsEventBodySchema } from "./schema";
import {
    buildEventRow,
    insertEvent,
    isSessionRateLimited,
    wasRecentlyTracked,
    type D1Like,
    type EventClientContext,
} from "./db";

export interface HandleEventInput extends EventClientContext {
    body: unknown;
    db: D1Like;
}

export type HandleEventResult = { status: 204 } | { status: 400 };

// validate -> rate limit -> dedupe -> insert. Kept free of any Workers-only
// globals (Request/Env/D1Database) so it can run under plain Node/vitest -
// src/index.ts is the thin Workers-runtime adapter around this.
export async function handleEvent({
    body,
    db,
    ...context
}: HandleEventInput): Promise<HandleEventResult> {
    const parsed = AnalyticsEventBodySchema.safeParse(body);
    if (!parsed.success) return { status: 400 };

    if (await isSessionRateLimited(db, parsed.data.sessionId)) return { status: 204 };

    const row = buildEventRow(parsed.data, context);
    if (await wasRecentlyTracked(db, row)) return { status: 204 };

    await insertEvent(db, row);
    return { status: 204 };
}
