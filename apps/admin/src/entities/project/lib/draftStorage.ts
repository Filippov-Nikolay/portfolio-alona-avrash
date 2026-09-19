const PREFIX = "avrash-admin:project-draft:";

export type ProjectDraftId = number | "new";

export interface StoredDraft<T> {
    updatedAt: string;
    data: T;
}

function keyFor(id: ProjectDraftId): string {
    return `${PREFIX}${id}`;
}

export function readDraft<T>(id: ProjectDraftId): StoredDraft<T> | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(keyFor(id));
    if (!raw) return null;
    try {
        return JSON.parse(raw) as StoredDraft<T>;
    } catch {
        window.localStorage.removeItem(keyFor(id));
        return null;
    }
}

export function writeDraft<T>(id: ProjectDraftId, data: T): void {
    if (typeof window === "undefined") return;
    const stored: StoredDraft<T> = { updatedAt: new Date().toISOString(), data };
    window.localStorage.setItem(keyFor(id), JSON.stringify(stored));
}

export function clearDraft(id: ProjectDraftId): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(keyFor(id));
}

export function listDraftProjectIds(): number[] {
    if (typeof window === "undefined") return [];
    const ids: number[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key || !key.startsWith(PREFIX)) continue;
        const suffix = key.slice(PREFIX.length);
        if (suffix === "new") continue;
        const id = Number(suffix);
        if (Number.isInteger(id)) ids.push(id);
    }
    return ids;
}

export function hasNewProjectDraft(): boolean {
    return readDraft("new") !== null;
}
