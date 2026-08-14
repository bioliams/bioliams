/**
 * Small server-rendered SVG charts.
 *
 * A charting library is a quarter-megabyte of JavaScript for what is, at lab
 * scale, forty rectangles. These render on the server, ship as markup, and
 * inherit the theme through currentColor and CSS variables.
 */

export function BarChart({
  data,
  height = 140,
  formatValue = (v) => String(v),
}: {
  data: { label: string; value: number }[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 100 / data.length;

  return (
    <div>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="h-36 w-full"
        role="img"
      >
        {data.map((d, i) => {
          const h = Math.max((d.value / max) * (height - 24), d.value > 0 ? 3 : 0);
          return (
            <rect
              key={i}
              x={i * barWidth + barWidth * 0.15}
              y={height - h}
              width={barWidth * 0.7}
              height={h}
              rx={1}
              className="fill-primary"
            >
              <title>{`${d.label}: ${formatValue(d.value)}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0].label}</span>
        <span>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
}

export function DualBarChart({
  data,
  height = 140,
  seriesLabels,
}: {
  data: { label: string; a: number; b: number }[];
  height?: number;
  seriesLabels: [string, string];
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>;
  }
  const max = Math.max(...data.flatMap((d) => [d.a, d.b]), 1);
  const group = 100 / data.length;

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="h-36 w-full" role="img">
        {data.map((d, i) => {
          const ha = Math.max((d.a / max) * (height - 24), d.a > 0 ? 3 : 0);
          const hb = Math.max((d.b / max) * (height - 24), d.b > 0 ? 3 : 0);
          return (
            <g key={i}>
              <rect
                x={i * group + group * 0.12}
                y={height - ha}
                width={group * 0.32}
                height={ha}
                rx={1}
                className="fill-primary"
              >
                <title>{`${d.label} ${seriesLabels[0]}: ${d.a}`}</title>
              </rect>
              <rect
                x={i * group + group * 0.52}
                y={height - hb}
                width={group * 0.32}
                height={hb}
                rx={1}
                className="fill-chart-2"
              >
                <title>{`${d.label} ${seriesLabels[1]}: ${d.b}`}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm bg-primary" /> {seriesLabels[0]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm bg-chart-2" /> {seriesLabels[1]}
        </span>
      </div>
    </div>
  );
}

export function HBarList({
  data,
  formatValue = (v) => String(v),
}: {
  data: { label: string; value: number; hint?: string }[];
  formatValue?: (v: number) => string;
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-2">
      {data.map((d, i) => (
        <li key={i} className="text-sm">
          <div className="mb-0.5 flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate">{d.label}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {formatValue(d.value)}
              {d.hint ? ` · ${d.hint}` : ""}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
