"use client";

import { useActionState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/shared/ui/Button";
import { loginAction, type LoginState } from "@/entities/session/api/actions";
import styles from "./login.module.css";

const initialState: LoginState = { status: "idle" };
// Long enough to actually register as "something happened", short enough
// not to feel like a stall before the redirect.
const SUCCESS_REDIRECT_DELAY_MS = 550;

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

function CheckIcon() {
    return (
        <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M20 6 9 17l-5-5" />
        </svg>
    );
}

export default function LoginPage() {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(loginAction, initialState);
    const loginId = useId();
    const passwordId = useId();

    useEffect(() => {
        if (state.status !== "success") return;
        const timer = window.setTimeout(() => {
            router.push("/");
            router.refresh();
        }, SUCCESS_REDIRECT_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, [state.status, router]);

    const isSuccess = state.status === "success";

    return (
        <div className={styles.wrap}>
            <motion.form
                className={styles.card}
                action={formAction}
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
            >
                <AnimatePresence mode="wait" initial={false}>
                    {isSuccess ? (
                        <motion.div
                            key="success"
                            className={styles.successState}
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, ease: EASE_OUT }}
                        >
                            <motion.span
                                className={styles.successIcon}
                                initial={{ scale: 0, rotate: -20 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.05 }}
                            >
                                <CheckIcon />
                            </motion.span>
                            <p className={styles.successText}>Signed in</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
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
                                    disabled={pending}
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
                                    disabled={pending}
                                />
                            </div>

                            <AnimatePresence>
                                {state.status === "error" && (
                                    <motion.p
                                        key={state.attempt}
                                        className={styles.error}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{
                                            opacity: 1,
                                            height: "auto",
                                            x: [0, -7, 7, -5, 5, -2, 2, 0],
                                        }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{
                                            height: { duration: 0.2, ease: EASE_OUT },
                                            opacity: { duration: 0.2 },
                                            x: { duration: 0.45, ease: "easeInOut" },
                                        }}
                                    >
                                        {state.error}
                                    </motion.p>
                                )}
                            </AnimatePresence>

                            <Button
                                type="submit"
                                variant="primary"
                                disabled={pending}
                                className={styles.submit}
                            >
                                {pending ? (
                                    <span className={styles.spinner} aria-hidden="true" />
                                ) : (
                                    "Sign in"
                                )}
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.form>
        </div>
    );
}
