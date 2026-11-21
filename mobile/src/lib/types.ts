export type Coordinate = { latitude: number; longitude: number };
export type Source = {
  source: string;
  status: string;
  checked_at?: string | null;
  observed_at?: string | null;
  detail?: string;
};
export type Recommendation = {
  venue: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    address: string | null;
    categories: string[];
    price_level: number | null;
    rating: number | null;
    review_count: number | null;
    walk_min: number;
    walk_estimate?: { label?: string | null };
    attributions: { source: string; text: string; url?: string }[];
  };
  reachability: { method: string; label?: string };
  score: {
    value: number;
    components: Record<
      string,
      { value: number; weight: number; label?: string }
    >;
  };
  explanation: string;
  reach_explanation?: string;
};
export type QueryResult = {
  recommendations: Recommendation[];
  sources_used: Source[];
  generated_at: string;
  empty_message: string | null;
  weather: { temperature_f: number | null; precipitation_mm: number | null };
};
export type Neighborhood = {
  sources_used: Source[];
  generated_at: string;
  "311": {
    top_categories: { category: string; count: number }[];
    period_start: string;
    period_end: string;
  } | null;
  business_licenses:
    { name: string; issued_at: string; address?: string }[] | null;
  business_licenses_source?: string;
  city_contacts:
    { name: string; service: string; phone: string; url: string }[] | null;
};
