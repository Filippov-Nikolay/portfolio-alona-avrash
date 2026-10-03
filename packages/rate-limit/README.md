# @avrash/rate-limit

Rate limiting shared by [`apps/web`](../../apps/web/README.md) (contact form) and
[`apps/admin`](../../apps/admin/README.md) (login).

```ts
import { createRateLimiter, getClientIp } from "@avrash/rate-limit";

const contactLimiter = createRateLimiter({ name: "contact", max: 5, windowMs: 10 * 60 * 1000 });

if (await contactLimiter.isLimited(getClientIp(request.headers))) {
    return new Response("Too many requests", { status: 429 });
}
```

## Where the counters live

| Setup                                                                 | Counter                                                           |
| --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL` + `_TOKEN` (or `KV_REST_API_URL` + `_TOKEN`) | Upstash Redis sliding window, shared by every serverless instance |
| Neither set (local development, E2E, Docker)                          | Sliding window in process memory                                  |
| Redis times out (1 s) or fails                                        | Falls back to process memory and logs the error                   |

A serverless platform runs several instances, and each one has its own memory. Only the Redis
counter is reliable there. The in-memory window still limits a single process, and it is also used
when Redis is unavailable, so a Redis outage never turns the limit off.

## Client IP

`getClientIp()` reads only headers that the platform guarantees:

- **On Vercel** (`VERCEL=1`): `x-real-ip`, which Vercel sets itself.
- **Behind your own reverse proxy** (`TRUST_PROXY=1`): the last `x-forwarded-for` hop, which is the
  one your proxy appended.
- **Otherwise:** `"unknown"`. A client can write any value into forwarding headers, so they are
  ignored and all such requests share one counter.

## Scripts

| Command           | What it does                                             |
| ----------------- | -------------------------------------------------------- |
| `pnpm test`       | Vitest: sliding window, IP rules, Redis use and fallback |
| `pnpm type-check` | TypeScript                                               |
