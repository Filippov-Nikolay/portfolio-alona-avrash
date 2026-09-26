ALTER TABLE analytics_events ADD COLUMN visitor_id TEXT;
ALTER TABLE analytics_events ADD COLUMN device TEXT;
ALTER TABLE analytics_events ADD COLUMN os TEXT;
ALTER TABLE analytics_events ADD COLUMN browser TEXT;

CREATE INDEX idx_events_name_created ON analytics_events(event_name, created_at);
