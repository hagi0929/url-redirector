export type Redirect = {
  slug: string;
  target_url: string;
  status_code: number;
  hit_count: number;
  favorite: boolean;
  last_accessed?: string;
  created_at: string;
  updated_at: string;
};

export type ListResponse = {
  items: Redirect[];
  total: number;
};

export type Stats = {
  total_redirects: number;
  total_hits: number;
  favorite_count: number;
  hits_last_24h: number;
  active_slugs_24h: number;
  top_slugs: Redirect[];
  recent: Redirect[];
  favorites: Redirect[];
};

export type RedirectMetrics = {
  slug: string;
  last_accessed?: string;
  daily_hits: Record<string, number>;
  hourly_hits: Record<string, number>;
  browsers: Record<string, number>;
  oses: Record<string, number>;
  referrers: Record<string, number>;
};

export type HitEvent = {
  at: string;
  slug: string;
  target: string;
  browser: string;
  os: string;
  referrer: string;
};

export type RecentHitsResponse = {
  items: HitEvent[];
};

export type CreateInput = {
  slug: string;
  target_url: string;
  status_code?: number;
};

export type UpdateInput = {
  target_url?: string;
  status_code?: number;
};

class ApiError extends Error {
  status: number;
  detail?: string;
  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = await res.json();
      detail = body.detail || body.title || body.message;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, `HTTP ${res.status}`, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  list: () => request<ListResponse>("/api/redirects"),
  get: (slug: string) => request<Redirect>(`/api/redirects/${encodeURIComponent(slug)}`),
  stats: () => request<Stats>("/api/stats"),
  metrics: (slug: string) => request<RedirectMetrics>(`/api/redirects/${encodeURIComponent(slug)}/metrics`),
  recentHits: () => request<RecentHitsResponse>("/api/recent-hits"),
  create: (body: CreateInput) =>
    request<Redirect>("/api/redirects", { method: "POST", body: JSON.stringify(body) }),
  update: (slug: string, body: UpdateInput) =>
    request<Redirect>(`/api/redirects/${encodeURIComponent(slug)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  setFavorite: (slug: string, favorite: boolean) =>
    request<Redirect>(`/api/redirects/${encodeURIComponent(slug)}/favorite`, {
      method: "PUT",
      body: JSON.stringify({ favorite }),
    }),
  remove: (slug: string) =>
    request<void>(`/api/redirects/${encodeURIComponent(slug)}`, { method: "DELETE" }),
};

export { ApiError };
