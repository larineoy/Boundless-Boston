import { useEffect, useRef, useState } from "react";
import {
  parseSaved,
  STORAGE_KEY,
  upsertSaved,
  type SavedPlace,
  type SavedDraft,
} from "./savedPlaceStore";
export function useSavedPlaces() {
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [error, setError] = useState("");
  const ready = useRef(false);
  useEffect(() => {
    const read = () => {
      try {
        setPlaces(parseSaved(localStorage.getItem(STORAGE_KEY)));
        ready.current = true;
        setError("");
      } catch {
        ready.current = false;
        setError(
          "Saved Places could not be read. Existing data has not been replaced.",
        );
      }
    };
    read();
    const sync = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) read();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function commit(change: (current: SavedPlace[]) => SavedPlace[]) {
    if (!ready.current) {
      setError("Browser storage is unavailable. Enable it before saving.");
      return false;
    }
    try {
      const next = change(parseSaved(localStorage.getItem(STORAGE_KEY)));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setPlaces(next);
      setError("");
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save in this browser.",
      );
      return false;
    }
  }
  return {
    places,
    error,
    save: (draft: SavedDraft) =>
      commit((current) =>
        upsertSaved(
          current,
          draft,
          crypto.randomUUID(),
          new Date().toISOString(),
        ),
      ),
    update: (
      id: string,
      changes: Pick<SavedPlace, "label" | "notes" | "visited">,
    ) =>
      commit((current) =>
        current.map((p) =>
          p.id === id
            ? {
                ...p,
                label: changes.label.trim().slice(0, 120) || p.label,
                notes: changes.notes.slice(0, 1000),
                visited: changes.visited,
              }
            : p,
        ),
      ),
    remove: (id: string) =>
      commit((current) => current.filter((p) => p.id !== id)),
  };
}
