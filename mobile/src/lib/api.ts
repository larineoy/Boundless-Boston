import type { Coordinate, Neighborhood, QueryResult, Source } from "./types";

// Expo inlines EXPO_PUBLIC_ variables. This URL contains no private credentials.
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  "https://boundless-boston-api-5ze8.onrender.com"
).replace(/\/+$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 75000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 422)
        throw new Error(
          "These plan settings are no longer valid. Choose a new time and try again.",
        );
      throw new Error(
        `Boston data is unavailable (HTTP ${response.status}). Please try again.`,
      );
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      throw new Error(
        "The server took too long to respond. It may be waking up; please try again.",
      );
    if (error instanceof TypeError)
      throw new Error(
        "Could not connect. Check your internet connection and API URL.",
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export type Filters = {
  text: string;
  budget: "$" | "$$" | "$$$";
  walk: number;
  hours: number;
  rain: boolean;
};
export const query = (filters: Filters, location: Coordinate) =>
  request<QueryResult>("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      time: new Date(Date.now() + filters.hours * 3600000).toISOString(),
      budget: filters.budget,
      max_walk_min: filters.walk,
      lat: location.latitude,
      lng: location.longitude,
      free_text: filters.text.trim() || undefined,
      weather_override: filters.rain ? "rain" : undefined,
    }),
  });
export const getHealth = () =>
  request<{ sources: Source[] }>("/api/sources/health");
export const getNeighborhood = (location: Coordinate) =>
  request<Neighborhood>(
    `/api/neighborhood?lat=${location.latitude}&lng=${location.longitude}&radius_m=1500`,
  );
