export function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n);
}

export function formatCompact(n: number): string {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatRelative(iso?: string): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then) || then <= 0) return "never";
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(day / 365);
  return `${yr}y ago`;
}

export function truncate(s: string, max = 60): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

export function originForRedirect(slug: string, baseURL?: string): string {
  const o = baseURL && baseURL.length > 0 ? baseURL.replace(/\/$/, "") : window.location.origin;
  return `${o}/${slug}`;
}

export function hasTimestamp(iso?: string): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return !Number.isNaN(t) && t > 0;
}
