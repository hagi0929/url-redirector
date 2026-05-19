import { useMemo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { numericToAlpha2 } from "../lib/countries";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const EMPTY_FILL = "#252938";
const EMPTY_STROKE = "#0f1117";
const SELECTED_STROKE = "#a78bfa";

const RAMP = [
  "#1e3a5f",
  "#2d5a8a",
  "#4a8ab5",
  "#7cb0d9",
  "#b4d8f0",
];

type Props = {
  counts: Record<string, number>;
  onSelect?: (code: string) => void;
  selected?: string;
};

export function WorldMap({ counts, onSelect, selected }: Props) {
  const { max, bucketBoundaries } = useMemo(() => {
    let m = 0;
    for (const k in counts) {
      if (k === "??") continue;
      if (counts[k] > m) m = counts[k];
    }
    const n = RAMP.length;
    const boundaries: number[] = [];
    if (m > 0) {
      for (let i = 1; i <= n; i++) {
        boundaries.push(Math.max(1, Math.ceil((m * i) / n)));
      }
    }
    return { max: m, bucketBoundaries: boundaries };
  }, [counts]);

  function fill(code: string | undefined): string {
    if (!code) return EMPTY_FILL;
    const c = counts[code] ?? 0;
    if (c === 0 || max === 0) return EMPTY_FILL;
    for (let i = 0; i < bucketBoundaries.length; i++) {
      if (c <= bucketBoundaries[i]) return RAMP[i];
    }
    return RAMP[RAMP.length - 1];
  }

  return (
    <div className="w-full">
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 145 }}
        width={800}
        height={380}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((g) => {
              const numeric = String(g.id).padStart(3, "0");
              const code = numericToAlpha2[numeric];
              const c = code ? counts[code] ?? 0 : 0;
              const isSelected = !!selected && code === selected;
              const hasData = c > 0;
              const baseFill = fill(code);
              return (
                <Geography
                  key={g.rsmKey}
                  geography={g}
                  onClick={() => code && hasData && onSelect?.(code)}
                  style={{
                    default: {
                      fill: baseFill,
                      stroke: isSelected ? SELECTED_STROKE : EMPTY_STROKE,
                      strokeWidth: isSelected ? 1.5 : 0.4,
                      outline: "none",
                    },
                    hover: {
                      fill: hasData ? "#c4e1f5" : baseFill,
                      stroke: hasData ? SELECTED_STROKE : EMPTY_STROKE,
                      strokeWidth: hasData ? 1 : 0.4,
                      outline: "none",
                      cursor: hasData ? "pointer" : "default",
                    },
                    pressed: { outline: "none" },
                  }}
                >
                  <title>
                    {code
                      ? hasData
                        ? `${g.properties.name}: ${c}`
                        : g.properties.name
                      : g.properties.name}
                  </title>
                </Geography>
              );
            })
          }
        </Geographies>
      </ComposableMap>
      {max > 0 && (
        <div className="mt-2 flex items-center gap-2 px-2 pb-1">
          <span className="text-[10px] uppercase tracking-wider text-muted">Hits</span>
          <div className="flex items-center flex-1 max-w-xs">
            <span className="text-[10px] text-muted mr-1.5 tabular-nums">0</span>
            <div className="flex-1 flex h-2 rounded-full overflow-hidden border border-border">
              {RAMP.map((c) => (
                <div key={c} className="flex-1" style={{ background: c }} />
              ))}
            </div>
            <span className="text-[10px] text-muted ml-1.5 tabular-nums">{max}</span>
          </div>
        </div>
      )}
    </div>
  );
}
