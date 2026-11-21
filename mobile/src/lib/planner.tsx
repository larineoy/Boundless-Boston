import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getHealth, query, type Filters } from "./api";
import type { Coordinate, QueryResult, Recommendation, Source } from "./types";

export const BOSTON = { latitude: 42.355, longitude: -71.062 };
export const SOURCE_NAMES: Record<string, string> = {
  google_places: "Google Places",
  mbta: "MBTA",
  open_meteo: "Open-Meteo",
  boston_ckan: "Boston Open Data",
};
const defaultFilters: Filters = {
  text: "",
  budget: "$$",
  walk: 20,
  hours: 1,
  rain: false,
};
function usePlannerState() {
  const [filters, setFilters] = useState(defaultFilters);
  const [location, setLocation] = useState<Coordinate>(BOSTON);
  const [locationLabel, setLocationLabel] = useState("Downtown Boston");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [sessionPlaces, setSessionPlaces] = useState<
    Record<string, Recommendation>
  >({});
  const requestId = useRef(0);
  const mergeSources = useCallback(
    (incoming: Source[]) =>
      setSources((current) => {
        const merged = new Map(
          current.map((source) => [source.source, source]),
        );
        incoming.forEach((source) => merged.set(source.source, source));
        return [...merged.values()];
      }),
    [],
  );
  const search = useCallback(
    async (settings: Filters, origin: Coordinate) => {
      const id = ++requestId.current;
      setLoading(true);
      setError("");
      try {
        const data = await query(settings, origin);
        if (id !== requestId.current) return;
        setResult(data);
        mergeSources(data.sources_used);
        setSessionPlaces((previous) => ({
          ...previous,
          ...Object.fromEntries(
            data.recommendations.map((rec) => [rec.venue.id, rec]),
          ),
        }));
      } catch (e) {
        if (id === requestId.current)
          setError(e instanceof Error ? e.message : "Could not load places.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [mergeSources],
  );
  useEffect(() => {
    let active = true;
    const id = ++requestId.current;
    void query(defaultFilters, BOSTON)
      .then((data) => {
        if (!active || id !== requestId.current) return;
        setResult(data);
        mergeSources(data.sources_used);
        setSessionPlaces(
          Object.fromEntries(
            data.recommendations.map((rec) => [rec.venue.id, rec]),
          ),
        );
      })
      .catch((e) => {
        if (active && id === requestId.current)
          setError(e instanceof Error ? e.message : "Could not load places.");
      })
      .finally(() => {
        if (active && id === requestId.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mergeSources]);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void getHealth()
        .then((data) => {
          if (active) mergeSources(data.sources);
        })
        .catch(() => {});
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [mergeSources]);
  useEffect(() => {
    void AsyncStorage.getItem("boundless:saved-place-ids")
      .then((raw) => {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (
          Array.isArray(parsed) &&
          parsed.every((id) => typeof id === "string")
        )
          setSavedIds(parsed);
      })
      .catch(() => setStorageError("Saved places could not be restored."))
      .finally(() => setStorageReady(true));
  }, []);
  useEffect(() => {
    if (storageReady)
      void AsyncStorage.setItem(
        "boundless:saved-place-ids",
        JSON.stringify(savedIds),
      ).catch(() =>
        setStorageError(
          "Your saved places could not be stored on this device.",
        ),
      );
  }, [savedIds, storageReady]);
  const toggleSaved = (id: string) =>
    setSavedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  return {
    filters,
    setFilters,
    location,
    setLocation,
    locationLabel,
    setLocationLabel,
    result,
    sources,
    mergeSources,
    loading,
    error,
    search,
    savedIds,
    toggleSaved,
    sessionPlaces,
    storageReady,
    storageError,
  };
}
const PlannerContext = createContext<ReturnType<typeof usePlannerState> | null>(
  null,
);
export function PlannerProvider({ children }: { children: ReactNode }) {
  const value = usePlannerState();
  return (
    <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
  );
}
export function usePlanner() {
  const context = useContext(PlannerContext);
  if (!context) throw new Error("PlannerProvider is missing");
  return context;
}
