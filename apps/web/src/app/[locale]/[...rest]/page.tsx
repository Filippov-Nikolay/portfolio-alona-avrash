import { notFound } from "next/navigation";

// Catches any URL that doesn't match a real route under [locale] (typos,
// dead links, bots probing random paths) and routes it through the shared
// not-found.tsx instead of Next's generic fallback page.
export default function CatchAllPage() {
    notFound();
}
