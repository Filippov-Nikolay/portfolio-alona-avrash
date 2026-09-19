import bcrypt from "bcryptjs";

interface AdminUser {
    login: string;
    passwordHash: string;
}

const TIMING_GUARD_HASH = bcrypt.hashSync("not-a-real-password", 10);

function loadAdminUsers(): AdminUser[] {
    const raw = process.env.ADMIN_USERS;
    if (!raw) {
        throw new Error("ADMIN_USERS is not set - see apps/admin/.env.example.");
    }

    let json: string;
    try {
        json = Buffer.from(raw, "base64").toString("utf-8");
    } catch (err) {
        throw new Error(
            `ADMIN_USERS is not valid base64: ${err instanceof Error ? err.message : String(err)}`
        );
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(json);
    } catch (err) {
        throw new Error(
            `ADMIN_USERS did not decode to valid JSON: ${err instanceof Error ? err.message : String(err)}`
        );
    }

    if (!Array.isArray(parsed)) {
        throw new Error("ADMIN_USERS must be a JSON array.");
    }

    return parsed.map((entry, index) => {
        if (
            typeof entry !== "object" ||
            entry === null ||
            typeof (entry as Partial<AdminUser>).login !== "string" ||
            typeof (entry as Partial<AdminUser>).passwordHash !== "string"
        ) {
            throw new Error(
                `ADMIN_USERS[${index}] must be {"login": string, "passwordHash": string}.`
            );
        }
        return entry as AdminUser;
    });
}

export async function verifyCredentials(login: string, password: string): Promise<boolean> {
    const users = loadAdminUsers();
    const user = users.find((candidate) => candidate.login === login);

    if (!user) {
        await bcrypt.compare(password, TIMING_GUARD_HASH);
        return false;
    }

    return bcrypt.compare(password, user.passwordHash);
}
