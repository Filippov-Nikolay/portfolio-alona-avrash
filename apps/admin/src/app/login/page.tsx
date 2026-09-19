"use client";

import { useActionState, useId } from "react";
import { Button } from "@/shared/ui/Button";
import { loginAction, type LoginState } from "@/entities/session/api/actions";
import styles from "./login.module.css";

const initialState: LoginState = {};

export default function LoginPage() {
    const [state, formAction, pending] = useActionState(loginAction, initialState);
    const loginId = useId();
    const passwordId = useId();

    return (
        <div className={styles.wrap}>
            <form className={styles.card} action={formAction}>
                <h1 className={styles.title}>Admin sign in</h1>

                <div className={styles.field}>
                    <label htmlFor={loginId}>Login</label>
                    <input
                        id={loginId}
                        name="login"
                        type="text"
                        autoComplete="username"
                        autoFocus
                        required
                    />
                </div>

                <div className={styles.field}>
                    <label htmlFor={passwordId}>Password</label>
                    <input
                        id={passwordId}
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                    />
                </div>

                {state.error && <p className={styles.error}>{state.error}</p>}

                <Button
                    type="submit"
                    variant="primary"
                    disabled={pending}
                    className={styles.submit}
                >
                    {pending ? "Signing in..." : "Sign in"}
                </Button>
            </form>
        </div>
    );
}
