export type SavedPlace = {
  id: string;
  sourceUrl: string;
  platform: "youtube" | "tiktok";
  placeId: string | null;
  label: string;
  notes: string;
  visited: boolean;
  mode: "demo" | "live" | "unresolved";
  savedAt: string;
};
export type SavedDraft = Omit<SavedPlace, "id" | "savedAt" | "visited">;
export const STORAGE_KEY = "boundless.saved-places.v1";
export function sourcePlatform(value: string): SavedPlace["platform"] | null {
  try {
    const u = new URL(value);
    if (
      !["https:", "http:"].includes(u.protocol) ||
      u.username ||
      u.password ||
      u.port
    )
      return null;
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    return ["youtube.com", "m.youtube.com", "youtu.be"].includes(host)
      ? "youtube"
      : [
            "tiktok.com",
            "m.tiktok.com",
            "vm.tiktok.com",
            "vt.tiktok.com",
          ].includes(host)
        ? "tiktok"
        : null;
  } catch {
    return null;
  }
}
export function parseSaved(raw: string | null): SavedPlace[] {
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value))
    throw new Error(
      "Saved Places data is invalid. It has not been overwritten.",
    );
  const valid = value
    .filter(
      (p: any) =>
        p &&
        typeof p.id === "string" &&
        p.id.length <= 100 &&
        typeof p.sourceUrl === "string" &&
        p.sourceUrl.length <= 2048 &&
        sourcePlatform(p.sourceUrl) === p.platform &&
        (p.placeId === null ||
          (typeof p.placeId === "string" &&
            /^[A-Za-z0-9_-]{1,256}$/.test(p.placeId))) &&
        typeof p.label === "string" &&
        p.label.trim().length > 0 &&
        p.label.length <= 120 &&
        typeof p.notes === "string" &&
        p.notes.length <= 1000 &&
        typeof p.visited === "boolean" &&
        ["demo", "live", "unresolved"].includes(p.mode) &&
        typeof p.savedAt === "string" &&
        Number.isFinite(Date.parse(p.savedAt)),
    )
    .map((p) => ({
      id: p.id,
      sourceUrl: p.sourceUrl,
      platform: p.platform,
      placeId: p.placeId,
      label: p.label,
      notes: p.notes,
      visited: p.visited,
      mode: p.mode,
      savedAt: p.savedAt,
    }));
  if (valid.length !== value.length || valid.length > 200)
    throw new Error(
      "Saved Places data is invalid. It has not been overwritten.",
    );
  return valid;
}
export function upsertSaved(
  places: SavedPlace[],
  draft: SavedDraft,
  id: string,
  savedAt: string,
): SavedPlace[] {
  if (
    !sourcePlatform(draft.sourceUrl) ||
    sourcePlatform(draft.sourceUrl) !== draft.platform ||
    !draft.label.trim() ||
    draft.label.trim().length > 120 ||
    draft.notes.length > 1000
  )
    throw new Error("Add a label and a valid TikTok or YouTube link.");
  const existing = places.find(
    (p) => p.sourceUrl === draft.sourceUrl && p.placeId === draft.placeId,
  );
  if (!existing && places.length >= 200)
    throw new Error(
      "Your collection is full (200 places). Remove a place before adding another.",
    );
  // Explicit fields only: no provider names, addresses, ratings, hours, tokens, or coordinates persist.
  const next: SavedPlace = {
    id: existing?.id || id,
    sourceUrl: draft.sourceUrl,
    platform: draft.platform,
    placeId: draft.placeId,
    label: draft.label.trim(),
    notes: draft.notes.trim(),
    mode: draft.mode,
    visited: existing?.visited || false,
    savedAt: existing?.savedAt || savedAt,
  };
  return existing
    ? places.map((p) => (p.id === existing.id ? next : p))
    : [next, ...places];
}
