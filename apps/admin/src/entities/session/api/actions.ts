"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyCredentials } from "@/shared/auth/credentials";
import { createRateLimiter, getClientIp } from "@avrash/rate-limit";
import {
    createSessionToken,
    SESSION_COOKIE_NAME,
    SESSION_MAX_AGE_SECONDS,
} from "@/shared/auth/session";

const loginByClient = createRateLimiter({
    name: "login-client",
    max: 5,
    windowMs: 10 * 60 * 1000,
});

const loginByAccount = createRateLimiter({
    name: "login-account",
    max: 10,
    windowMs: 15 * 60 * 1000,
});

async function isLoginLimited(login: string): Promise<boolean> {
    if (await loginByClient.isLimited(getClientIp(await headers()))) return true;
    return login !== "" && (await loginByAccount.isLimited(login.toLowerCase()));
}

export type LoginState =
    | { status: "idle" }
    | { status: "error"; error: string; attempt: number }
    | { status: "success" };

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
    const login = String(formData.get("login") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    // Distinguishes this attempt from the last even when the message text
    // is identical (e.g. two wrong-password submits in a row) - the client
    // keys its shake animation off this so it replays every time, not just
    // when the text happens to change.
    const attempt = Date.now();

    if (await isLoginLimited(login)) {
        return {
            status: "error",
            error: "Too many attempts - try again in a few minutes.",
            attempt,
        };
    }

    if (!login || !password) {
        return { status: "error", error: "Enter your login and password.", attempt };
    }

    const valid = await verifyCredentials(login, password);
    if (!valid) {
        return { status: "error", error: "Incorrect login or password.", attempt };
    }

    const token = await createSessionToken({ login });
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
    });

    // No redirect() here - the client shows a brief success animation
    // first, then navigates itself (see login/page.tsx). The cookie is
    // already set above, so that navigation lands past the proxy's gate.
    return { status: "success" };
}

export async function logoutAction(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    redirect("/login");
}
