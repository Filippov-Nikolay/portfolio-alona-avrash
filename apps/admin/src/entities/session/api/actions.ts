"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyCredentials } from "@/shared/auth/credentials";
import {
    createSessionToken,
    SESSION_COOKIE_NAME,
    SESSION_MAX_AGE_SECONDS,
} from "@/shared/auth/session";

export interface LoginState {
    error?: string;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
    const login = String(formData.get("login") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!login || !password) {
        return { error: "Enter your login and password." };
    }

    const valid = await verifyCredentials(login, password);
    if (!valid) {
        return { error: "Incorrect login or password." };
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

    redirect("/");
}

export async function logoutAction(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    redirect("/login");
}
