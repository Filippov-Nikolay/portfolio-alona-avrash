import bcrypt from "bcryptjs";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { verifyCredentials } from "./credentials";

let passwordHash: string;

function encodeAdminUsers(users: Array<{ login: string; passwordHash: string }>): string {
    return Buffer.from(JSON.stringify(users)).toString("base64");
}

beforeAll(() => {
    // bcrypt is deliberately slow - hash once and reuse across tests rather
    // than re-hashing in every case.
    passwordHash = bcrypt.hashSync("correct-horse", 10);
});

beforeEach(() => {
    delete process.env.ADMIN_USERS;
});

describe("verifyCredentials", () => {
    it("accepts the right password for a known login", async () => {
        process.env.ADMIN_USERS = encodeAdminUsers([{ login: "nick", passwordHash }]);
        await expect(verifyCredentials("nick", "correct-horse")).resolves.toBe(true);
    });

    it("rejects the wrong password for a known login", async () => {
        process.env.ADMIN_USERS = encodeAdminUsers([{ login: "nick", passwordHash }]);
        await expect(verifyCredentials("nick", "wrong-password")).resolves.toBe(false);
    });

    it("rejects a login that isn't in ADMIN_USERS", async () => {
        process.env.ADMIN_USERS = encodeAdminUsers([{ login: "nick", passwordHash }]);
        await expect(verifyCredentials("alona", "correct-horse")).resolves.toBe(false);
    });

    it("supports more than one admin", async () => {
        const alonaHash = bcrypt.hashSync("alonas-password", 10);
        process.env.ADMIN_USERS = encodeAdminUsers([
            { login: "nick", passwordHash },
            { login: "alona", passwordHash: alonaHash },
        ]);

        await expect(verifyCredentials("alona", "alonas-password")).resolves.toBe(true);
        await expect(verifyCredentials("nick", "alonas-password")).resolves.toBe(false);
    });

    it("throws when ADMIN_USERS is not set", async () => {
        await expect(verifyCredentials("nick", "correct-horse")).rejects.toThrow(
            "ADMIN_USERS is not set"
        );
    });

    it("throws when ADMIN_USERS does not decode to valid JSON", async () => {
        process.env.ADMIN_USERS = Buffer.from("not json at all").toString("base64");
        await expect(verifyCredentials("nick", "correct-horse")).rejects.toThrow(
            "ADMIN_USERS did not decode to valid JSON"
        );
    });

    it("throws when ADMIN_USERS is a JSON value that isn't an array", async () => {
        process.env.ADMIN_USERS = Buffer.from(JSON.stringify({ login: "nick" })).toString("base64");
        await expect(verifyCredentials("nick", "correct-horse")).rejects.toThrow(
            "ADMIN_USERS must be a JSON array"
        );
    });

    it("throws when an entry is missing login or passwordHash", async () => {
        process.env.ADMIN_USERS = Buffer.from(JSON.stringify([{ login: "nick" }])).toString(
            "base64"
        );
        await expect(verifyCredentials("nick", "correct-horse")).rejects.toThrow(
            'ADMIN_USERS[0] must be {"login": string, "passwordHash": string}'
        );
    });
});
