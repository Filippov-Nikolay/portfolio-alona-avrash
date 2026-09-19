import { beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

beforeEach(() => {
    process.env.SESSION_SECRET = "test-session-secret-not-for-real-use";
});

describe("createSessionToken / verifySessionToken", () => {
    it("round-trips the login through a signed token", async () => {
        const token = await createSessionToken({ login: "nick" });
        const session = await verifySessionToken(token);
        expect(session).toEqual({ login: "nick" });
    });

    it("rejects a token signed with a different secret", async () => {
        const token = await createSessionToken({ login: "nick" });

        process.env.SESSION_SECRET = "a-completely-different-secret";
        const session = await verifySessionToken(token);

        expect(session).toBeNull();
    });

    it("rejects garbage that isn't a valid JWT", async () => {
        const session = await verifySessionToken("not-a-real-token");
        expect(session).toBeNull();
    });

    it("throws when SESSION_SECRET is not set", async () => {
        delete process.env.SESSION_SECRET;
        await expect(createSessionToken({ login: "nick" })).rejects.toThrow(
            "SESSION_SECRET is not set"
        );
    });
});
