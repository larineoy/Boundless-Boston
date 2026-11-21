import { useEffect, useRef, useState } from "react";
import { Plasma } from "@cruxgarden/plasma-ui";
import { Link2, Bookmark, Check, ExternalLink, Plus } from "lucide-react";
import {
  sourcePlatform,
  type SavedPlace,
  type SavedDraft,
} from "./savedPlaceStore";
type Match = {
  place_id: string;
  name: string;
  address: string | null;
  maps_uri: string | null;
  match_confidence: number | null;
  attribution: {
    text: string;
    providers?: { provider: string; providerUri?: string }[];
  };
};
type Resolution = {
  source_url: string;
  source_platform: "youtube" | "tiktok";
  metadata: {
    title: string;
    creator: string | null;
    published_at: string | null;
  } | null;
  candidates: Match[];
  confirmation_token: string | null;
  source_status: string;
  message: string;
  notice: string;
  sources_used: { source: string; status: string }[];
};
type Plan = {
  venue: { name: string; attributions: { text: string; url?: string }[] };
  source_status: string;
  eligible: boolean;
  message: string;
  checks: {
    hours: string;
    within_budget: boolean | null;
    within_walk: boolean;
  };
  weather: { temperature_f: number | null };
  reachability: { label?: string; method: string };
  route: { minutes: number; label: string; maps_uri: string | null };
  generated_at: string;
};
async function post<T>(
  path: string,
  body: unknown,
  signal: AbortSignal,
): Promise<T> {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const d = await r.json();
  if (!r.ok)
    throw new Error(
      typeof d.detail === "string"
        ? d.detail
        : "Check the video URL and outing settings, then try again.",
    );
  return d;
}
function Attribution({ match }: { match: Match }) {
  return (
    <div className="attribution" translate="no">
      {match.attribution.text}
      {(match.attribution.providers || []).map((a, i) => (
        <span key={i}>
          {" "}
          ·{" "}
          {a.providerUri ? (
            <a href={a.providerUri} target="_blank" rel="noreferrer">
              {a.provider}
            </a>
          ) : (
            a.provider
          )}
        </span>
      ))}
    </div>
  );
}
export function CoolFinds({
  query,
  queryKey,
  onSave,
  storageError,
  initialSaved,
}: {
  query: () => unknown;
  queryKey: string;
  onSave: (d: SavedDraft) => boolean;
  storageError: string;
  initialSaved: SavedPlace | null;
}) {
  const [url, setUrl] = useState(initialSaved?.sourceUrl || "");
  const [hint, setHint] = useState(initialSaved?.label || "");
  const [result, setResult] = useState<Resolution | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [target, setTarget] = useState<Match | null | undefined>(undefined);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const request = useRef<AbortController | null>(null);
  const output = useRef<HTMLDivElement>(null);
  function begin(name: string) {
    request.current?.abort();
    const c = new AbortController();
    request.current = c;
    setBusy(name);
    setError("");
    return c;
  }
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    request.current?.abort();
    setBusy("");
    setPlan(null);
  }, [queryKey]);
  useEffect(() => {
    if (initialSaved?.placeId) {
      const c = begin("refresh");
      post<Resolution>(
        "/api/cool-finds/refresh",
        { source_url: initialSaved.sourceUrl, place_id: initialSaved.placeId },
        c.signal,
      )
        .then(setResult)
        .catch((e) => {
          if (!c.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!c.signal.aborted) setBusy("");
        });
    }
    return () => request.current?.abort();
  }, [initialSaved?.id]);
  function resetResult() {
    request.current?.abort();
    setBusy("");
    setResult(null);
    setPlan(null);
    setTarget(undefined);
    setSaved(false);
    setError("");
  }
  async function find() {
    if (!sourcePlatform(url)) {
      setError("Paste a TikTok or YouTube video URL.");
      return;
    }
    const c = begin("find");
    setResult(null);
    setPlan(null);
    setTarget(undefined);
    setSaved(false);
    try {
      setResult(
        await post<Resolution>(
          "/api/cool-finds/intake",
          { source_url: url, venue_hint: hint },
          c.signal,
        ),
      );
      requestAnimationFrame(() => output.current?.focus());
    } catch (e) {
      if (!c.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : "Could not reach place lookup. You can still save the video as an idea.",
        );
    } finally {
      if (!c.signal.aborted) setBusy("");
    }
  }
  function startSave(match: Match | null) {
    if (!sourcePlatform(url)) {
      setError("Add a TikTok or YouTube link first.");
      return;
    }
    setTarget(match);
    setLabel(hint.trim().slice(0, 120));
    setNotes("");
    setSaved(false);
  }
  async function save() {
    if (target === undefined) return;
    const sourceUrl = result?.source_url || url.trim();
    const platform = sourcePlatform(sourceUrl);
    if (!platform) return;
    const c = begin("save");
    try {
      let mode: SavedDraft["mode"] = "unresolved";
      if (target) {
        if (!result?.confirmation_token)
          throw new Error("Find this place again before saving.");
        const selection = await post<{ mode: "demo" | "live" }>(
          "/api/cool-finds/select",
          {
            source_url: sourceUrl,
            place_id: target.place_id,
            confirmation_token: result.confirmation_token,
            confirmed: true,
          },
          c.signal,
        );
        mode = selection.mode;
      }
      if (
        onSave({
          sourceUrl,
          platform,
          placeId: target?.place_id || null,
          label,
          notes,
          mode,
        })
      ) {
        setSaved(true);
        setTarget(undefined);
      }
    } catch (e) {
      if (!c.signal.aborted)
        setError(e instanceof Error ? e.message : "Could not save this place.");
    } finally {
      if (!c.signal.aborted) setBusy("");
    }
  }
  async function check(match: Match) {
    if (!result?.confirmation_token) return;
    const c = begin(match.place_id);
    setPlan(null);
    try {
      setPlan(
        await post<Plan>(
          "/api/cool-finds/plan",
          {
            source_url: result.source_url,
            place_id: match.place_id,
            confirmation_token: result.confirmation_token,
            confirmed: true,
            query: query(),
          },
          c.signal,
        ),
      );
    } catch (e) {
      if (!c.signal.aborted)
        setError(
          e instanceof Error ? e.message : "Could not check this outing.",
        );
    } finally {
      if (!c.signal.aborted) setBusy("");
    }
  }
  return (
    <Plasma
      as="section"
      className="cool-finds panel"
      lean={false}
      fuse={false}
      radius={26}
      aria-labelledby="finds-heading"
    >
      <div className="panel-heading">
        <div>
          <span className="section-kicker">FROM YOUR FEED TO YOUR CITY</span>
          <h2 id="finds-heading">A video worth going out for.</h2>
        </div>
        <Link2 size={26} />
      </div>
      <p className="finds-intro">
        Paste a TikTok or YouTube Short. Find the Boston destination, save it
        for later, or see if it fits your next outing.
      </p>
      <div className="finds-steps">
        <span>
          <Link2 size={16} /> Paste a video
        </span>
        <span>
          <Check size={16} /> Choose the place
        </span>
        <span>
          <Bookmark size={16} /> Keep it for later
        </span>
      </div>
      <form
        className="finds-form"
        onSubmit={(e) => {
          e.preventDefault();
          find();
        }}
      >
        <label className="field">
          <span>VIDEO LINK</span>
          <div className="input-wrap">
            <Link2 size={18} />
            <input
              required
              type="url"
              maxLength={2048}
              value={url}
              onChange={(e) => {
                resetResult();
                setUrl(e.target.value);
              }}
              placeholder="Paste a TikTok or YouTube Shorts link"
            />
          </div>
        </label>
        <label className="field">
          <span>
            PLACE NAME OR ADDRESS <small>IF YOU KNOW IT</small>
          </span>
          <div className="input-wrap">
            <input
              maxLength={200}
              value={hint}
              onChange={(e) => {
                resetResult();
                setHint(e.target.value);
              }}
              placeholder="e.g. Pho Pasteur, Chinatown"
            />
          </div>
        </label>
        <div className="finds-actions">
          <button
            type="button"
            className="text-button"
            onClick={() => startSave(null)}
          >
            <Plus size={16} /> Save video as an idea
          </button>
          <button className="submit-button" disabled={!!busy}>
            {busy === "find" ? "Finding matches…" : "Find the place"}
          </button>
        </div>
      </form>
      {(error || storageError) && (
        <p className="notice error" role="alert">
          {error || storageError}
        </p>
      )}
      <div
        className="finds-output"
        ref={output}
        tabIndex={-1}
        aria-live="polite"
        aria-busy={!!busy}
      >
        {busy === "refresh" && <p>Refreshing your saved destination…</p>}
        {result && (
          <>
            <div className="finds-status">
              <span className="status-badge">{result.source_status}</span>
              <a href={result.source_url} target="_blank" rel="noreferrer">
                Original video <ExternalLink size={14} />
              </a>
            </div>
            <p>{result.message}</p>
            {result.metadata?.title && (
              <blockquote>
                <span>CREATOR-REPORTED</span>
                <p>{result.metadata.title}</p>
                <small>
                  {result.metadata.creator}
                  {result.metadata.published_at
                    ? ` · ${new Date(result.metadata.published_at).toLocaleDateString()}`
                    : " · Post date unavailable"}
                </small>
              </blockquote>
            )}
            <p className="finds-note">{result.notice}</p>
            {result.candidates.length > 0 && (
              <>
                <h3>Which place did you mean?</h3>
                <div className="candidate-grid">
                  {result.candidates.map((p) => (
                    <article className="candidate-card" key={p.place_id}>
                      <span className="section-kicker">BOSTON MATCH</span>
                      <h4>{p.name}</h4>
                      <p>{p.address}</p>
                      {p.match_confidence !== null && (
                        <small>
                          {Math.round(p.match_confidence * 100)}% name
                          similarity · check the address
                        </small>
                      )}
                      <Attribution match={p} />
                      <div className="candidate-actions">
                        <button
                          className="submit-button"
                          disabled={!!busy}
                          onClick={() => startSave(p)}
                        >
                          <Bookmark size={16} /> Save this place
                        </button>
                        <button
                          className="text-button"
                          disabled={!!busy}
                          onClick={() => check(p)}
                        >
                          {busy === p.place_id
                            ? "Checking…"
                            : "Check an outing"}
                        </button>
                        {p.maps_uri && (
                          <a href={p.maps_uri} target="_blank" rel="noreferrer">
                            View on Google Maps <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
            <p className="finds-note">
              {result.sources_used
                .map((s) => `${s.source.replaceAll("_", " ")}: ${s.status}`)
                .join(" · ")}
            </p>
          </>
        )}
        {target !== undefined && (
          <form
            className="save-place-form"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <span className="section-kicker">
              {target ? "CONFIRM & SAVE" : "SAVE AN IDEA"}
            </span>
            <h3>
              {target
                ? `Keep ${target.name} for later.`
                : "Keep the video. Find the place later."}
            </h3>
            {target && (
              <p>Confirm this is the destination you meant: {target.address}</p>
            )}
            <label>
              Your label
              <input
                required
                autoFocus
                maxLength={120}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={target?.name || "A name to remember this idea"}
              />
            </label>
            <label>
              Note to yourself <small>OPTIONAL</small>
              <textarea
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What caught your eye? Who would you go with?"
              />
            </label>
            <p className="finds-note">
              Your label, note, video link, and destination ID stay in this
              browser. Current hours and routes are checked again when you plan.
            </p>
            <div className="saved-actions">
              <button className="submit-button" disabled={!!busy}>
                <Bookmark size={16} />
                {busy === "save" ? "Saving…" : "Confirm and save"}
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setTarget(undefined)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {saved && (
          <p className="saved-success" role="status">
            <Check size={18} /> Added to your collection.{" "}
            <a href="#/saved">View Saved Places</a>
          </p>
        )}
        {plan && (
          <div className="outing-plan">
            <span className="status-badge">
              {plan.source_status} · fresh outing check
            </span>
            <h3>{plan.venue.name}</h3>
            <p>{plan.message}</p>
            <dl className="plan-checks">
              <div>
                <dt>Hours at your time</dt>
                <dd>{plan.checks.hours}</dd>
              </div>
              <div>
                <dt>Budget</dt>
                <dd>
                  {plan.checks.within_budget === null
                    ? "Unknown"
                    : plan.checks.within_budget
                      ? "Within budget"
                      : "Over budget"}
                </dd>
              </div>
              <div>
                <dt>Walking limit</dt>
                <dd>
                  {plan.checks.within_walk ? "Within limit" : "Beyond limit"}
                </dd>
              </div>
              <div>
                <dt>Weather</dt>
                <dd>
                  {plan.weather.temperature_f === null
                    ? "Unavailable"
                    : `${Math.round(plan.weather.temperature_f)}°F`}
                </dd>
              </div>
            </dl>
            <p>
              {plan.reachability.label ||
                plan.reachability.method.replaceAll("_", " ")}
            </p>
            <p>
              About {plan.route.minutes} minutes on foot. {plan.route.label}
            </p>
            {plan.route.maps_uri && (
              <a href={plan.route.maps_uri} target="_blank" rel="noreferrer">
                Walking directions on Google Maps <ExternalLink size={14} />
              </a>
            )}
            <div className="attribution" translate="no">
              {plan.venue.attributions.map((a, i) => (
                <span key={i}>{a.text} · </span>
              ))}
            </div>
            <p className="finds-note">
              Checked {new Date(plan.generated_at).toLocaleString()}. Outing
              settings changes clear these checks.
            </p>
          </div>
        )}
      </div>
    </Plasma>
  );
}
