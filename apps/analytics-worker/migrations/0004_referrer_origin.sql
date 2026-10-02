UPDATE analytics_events
SET referrer = CASE
    WHEN lower(referrer) LIKE 'http://%' OR lower(referrer) LIKE 'https://%' THEN
        lower(
            substr(referrer, 1, instr(referrer, '://') + 2)
            || substr(
                substr(referrer, instr(referrer, '://') + 3),
                1,
                instr(
                    replace(replace(substr(referrer, instr(referrer, '://') + 3), '?', '/'), '#', '/') || '/',
                    '/'
                ) - 1
            )
        )
    ELSE NULL
END
WHERE referrer IS NOT NULL;
