import { useState } from "react";
import {
  Bookmark,
  Plus,
  ExternalLink,
  Search,
  Check,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import { Plasma } from "@cruxgarden/plasma-ui";
import type { SavedPlace } from "./savedPlaceStore";
type Props = {
  places: SavedPlace[];
  error: string;
  add: () => void;
  plan: (p: SavedPlace) => void;
  update: (
    id: string,
    changes: Pick<SavedPlace, "label" | "notes" | "visited">,
  ) => boolean;
  remove: (id: string) => boolean;
};
export function SavedPlaces({
  places,
  error,
  add,
  plan,
  update,
  remove,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [removed, setRemoved] = useState<SavedPlace | null>(null);
  const visible = places.filter(
    (p) =>
      (filter === "all" ||
        (filter === "visited" && p.visited) ||
        (filter === "want" && !p.visited) ||
        filter === p.platform) &&
      `${p.label} ${p.notes}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="saved-page" aria-labelledby="saved-heading">
      <div className="collection-hero">
        <span className="eyebrow">YOUR NEXT GOOD IDEA</span>
        <h1 id="saved-heading">
          Saved for
          <br />
          <em>someday.</em>
        </h1>
        <p>A little less scrolling. A lot more going places.</p>
        <button className="submit-button" onClick={add}>
          <Plus size={18} /> Add from a video
        </button>
      </div>
      <Plasma
        className="collection-summary panel"
        lean={false}
        fuse={false}
        radius={28}
      >
        <span>
          <b>{places.filter((p) => !p.visited).length}</b> WANT TO GO
        </span>
        <span>
          <b>{places.filter((p) => p.visited).length}</b> BEEN THERE
        </span>
        <p>
          Kept in this browser. Available after refresh, without an account.
        </p>
      </Plasma>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {removed && (
        <p className="collection-notice" role="status">
          Removed “{removed.label}” from this browser.
          <button
            onClick={() => setRemoved(null)}
            aria-label="Dismiss removal message"
          >
            <X size={16} />
          </button>
        </p>
      )}
      <Plasma
        className="collection-toolbar panel"
        lean={false}
        fuse={false}
        radius={28}
      >
        <label className="collection-search">
          <Search size={18} />
          <input
            aria-label="Search saved places"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a place or note…"
          />
        </label>
        <div className="collection-filters" aria-label="Filter saved places">
          {[
            ["all", "All places"],
            ["want", "Want to go"],
            ["visited", "Visited"],
            ["youtube", "YouTube"],
            ["tiktok", "TikTok"],
          ].map(([id, text]) => (
            <button
              key={id}
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {text}
            </button>
          ))}
        </div>
      </Plasma>
      {places.length === 0 ? (
        <Plasma className="collection-empty panel" lean={false} fuse={false}>
          <Bookmark size={36} />
          <h2>Your next outing starts here.</h2>
          <p>
            Found a cafe on TikTok? A hidden spot in a Short? Paste the video,
            choose the place, and keep it for later.
          </p>
          <button className="submit-button" onClick={add}>
            <Plus size={18} /> Save your first place
          </button>
        </Plasma>
      ) : visible.length === 0 ? (
        <p className="collection-empty">
          No saved places match this search. Try another filter or name.
        </p>
      ) : (
        <Plasma
          className="saved-grid collection-surface panel"
          lean={false}
          fuse={false}
          radius={28}
        >
          {visible.map((p) => (
            <article className="saved-card panel" key={p.id}>
              <div className="saved-card-top">
                <span className={`platform-label ${p.platform}`}>
                  {p.platform === "youtube" ? "YouTube Shorts" : "TikTok"}
                </span>
                <span className="saved-status">
                  {p.visited
                    ? "Been there"
                    : p.placeId
                      ? "Want to go"
                      : "Video idea"}
                </span>
              </div>
              {editing === p.id ? (
                <form
                  className="saved-edit"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (update(p.id, { label, notes, visited: p.visited }))
                      setEditing(null);
                  }}
                >
                  <label>
                    Your place label
                    <input
                      required
                      maxLength={120}
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                    />
                  </label>
                  <label>
                    Your note
                    <textarea
                      maxLength={1000}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </label>
                  <div className="saved-actions">
                    <button className="submit-button">Save changes</button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <h2>{p.label}</h2>
                  <p className="saved-note">
                    {p.notes || "An idea worth stepping outside for."}
                  </p>
                  <p className="saved-date">
                    Saved {new Date(p.savedAt).toLocaleDateString()}
                    {p.mode === "demo" ? " · Demo place" : ""}
                  </p>
                  {!p.placeId && (
                    <p className="finds-note">
                      Destination not matched yet. Find the place before
                      planning.
                    </p>
                  )}
                  <a
                    className="source-video"
                    href={p.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Watch original video <ExternalLink size={15} />
                  </a>
                  <div className="saved-actions">
                    <button className="submit-button" onClick={() => plan(p)}>
                      {p.placeId ? "Check an outing" : "Find this place"}
                    </button>
                    <button
                      className="visit-button"
                      aria-pressed={p.visited}
                      onClick={() =>
                        update(p.id, {
                          label: p.label,
                          notes: p.notes,
                          visited: !p.visited,
                        })
                      }
                    >
                      <Check size={16} />
                      {p.visited ? "Visited" : "Mark visited"}
                    </button>
                  </div>
                  <div className="saved-card-footer">
                    <button
                      className="text-button"
                      onClick={() => {
                        setEditing(p.id);
                        setLabel(p.label);
                        setNotes(p.notes);
                      }}
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      className="text-button"
                      aria-label={`Remove ${p.label}`}
                      onClick={() => {
                        if (remove(p.id)) setRemoved(p);
                      }}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </Plasma>
      )}
    </section>
  );
}
