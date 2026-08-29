import type { TimelineData } from "@/shared/types";
import timelineData from "@/shared/content/timeline.json";
import { TimelineSectionClient } from "./TimelineSectionClient";

// Data is a static JSON import today, so this resolves instantly — but
// this is deliberately an async Server Component. Swap the body for a
// real `fetch()` or database call (e.g. a CMS-backed changelog) and the
// <Suspense> boundary around it in page.tsx starts streaming for real,
// with no changes needed anywhere else. See README > Streaming sections.
export async function TimelineSection() {
    const data = timelineData as TimelineData;
    return <TimelineSectionClient initialData={data} />;
}
