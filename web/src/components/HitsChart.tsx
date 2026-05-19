import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Granularity = "hourly" | "daily";

type Props = {
  data: Record<string, number>;
  granularity: Granularity;
  windowHours?: number;
  windowDays?: number;
};

export function HitsChart({ data, granularity, windowHours = 24, windowDays = 30 }: Props) {
  const series = useMemo(() => buildSeries(data, granularity, windowHours, windowDays), [
    data,
    granularity,
    windowHours,
    windowDays,
  ]);

  const max = Math.max(0, ...series.map((s) => s.hits));
  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="hits-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c5cff" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#7c5cff" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#8a93a6" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#8a93a6" }}
            tickLine={false}
            axisLine={false}
            width={28}
            allowDecimals={false}
            domain={[0, Math.max(2, max)]}
          />
          <Tooltip
            cursor={{ stroke: "#7c5cff", strokeWidth: 1, strokeDasharray: "4 4" }}
            formatter={(v: number) => [`${v} hits`, "hits"]}
            labelFormatter={(l) => l}
          />
          <Area
            type="monotone"
            dataKey="hits"
            stroke="#7c5cff"
            strokeWidth={2}
            fill="url(#hits-gradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function buildSeries(
  data: Record<string, number>,
  granularity: Granularity,
  windowHours: number,
  windowDays: number,
) {
  const now = new Date();
  const out: { key: string; label: string; hits: number }[] = [];

  if (granularity === "hourly") {
    for (let i = windowHours - 1; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 3600_000);
      const key = `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(
        t.getUTCHours(),
      )}`;
      const labelLocal = new Date(t);
      const label = `${pad(labelLocal.getHours())}:00`;
      out.push({ key, label, hits: data[key] ?? 0 });
    }
  } else {
    for (let i = windowDays - 1; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 86_400_000);
      const key = `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
      const label = `${pad(t.getMonth() + 1)}/${pad(t.getDate())}`;
      out.push({ key, label, hits: data[key] ?? 0 });
    }
  }
  return out;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
