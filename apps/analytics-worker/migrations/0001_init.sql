CREATE TABLE analytics_events (
    id TEXT PRIMARY KEY,
    event_name TEXT NOT NULL,
    entity_id TEXT,

    path TEXT NOT NULL,
    locale TEXT NOT NULL,

    session_id TEXT NOT NULL,

    country TEXT,
    referrer TEXT,

    created_at INTEGER NOT NULL
);

CREATE INDEX idx_events_name ON analytics_events(event_name);
CREATE INDEX idx_events_entity ON analytics_events(entity_id);
CREATE INDEX idx_events_created ON analytics_events(created_at);

-- Backs the 30-minute "don't recount a re-open" dedupe check and the
-- per-session spam guard, both of which filter by (session_id, created_at).
CREATE INDEX idx_events_session_created ON analytics_events(session_id, created_at);
