"use client";

type Props = {
    error: Error;
    reset: () => void;
};

export default function ErrorPage({ reset }: Props) {
    return <button onClick={reset}>Retry</button>;
}
