"use client";

import { useState, type ReactNode } from "react";

import { formatMoney, formatMoneyCompact } from "@/lib/currency";
import { useSize } from "./useSize";

/*
 * Hand-rolled SVG charts.
 *
 * Shared rules, applied everywhere below:
 *  - the data end of a mark is rounded 4px, the baseline end stays square
 *  - stacked segments are separated by a 2px gap in the surface colour
 *  - grid and axes are recessive; values and labels wear ink tokens, never a
 *    series colour, so identity always comes from the mark beside them
 *  - every chart has a hover layer with a hit target larger than the mark
 */

const SURFACE_GAP = 2;
const RADIUS = 4;

/** Rounded on the top edge only — for vertical bars growing off the baseline. */
function topRoundedPath(x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, h, w / 2));
  return [
    `M${x},${y + h}`,
    `L${x},${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `L${x + w - radius},${y}`,
    `Q${x + w},${y} ${x + w},${y + radius}`,
    `L${x + w},${y + h}`,
    "Z",
  ].join(" ");
}

/** Rounded on the right edge only — for horizontal bars. */
function rightRoundedPath(x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w, h / 2));
  return [
    `M${x},${y}`,
    `L${x + w - radius},${y}`,
    `Q${x + w},${y} ${x + w},${y + radius}`,
    `L${x + w},${y + h - radius}`,
    `Q${x + w},${y + h} ${x + w - radius},${y + h}`,
    `L${x},${y + h}`,
    "Z",
  ].join(" ");
}

/** Rounded on both horizontal ends — for a standalone split bar. */
function pillPath(x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  return [
    `M${x + radius},${y}`,
    `L${x + w - radius},${y}`,
    `Q${x + w},${y} ${x + w},${y + radius}`,
    `L${x + w},${y + h - radius}`,
    `Q${x + w},${y + h} ${x + w - radius},${y + h}`,
    `L${x + radius},${y + h}`,
    `Q${x},${y + h} ${x},${y + h - radius}`,
    `L${x},${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    "Z",
  ].join(" ");
}

/**
 * Rough width of a 10px label, used to decide how many tick labels fit.
 * Measuring text properly would need a canvas; this is close enough and
 * errs toward showing fewer labels rather than overlapping ones.
 */
function labelSlot(labels: string[]): number {
  const longest = labels.reduce((n, l) => Math.max(n, l.length), 0);
  return longest * 6 + 12;
}

/** "Nice" axis maximum so gridlines land on readable numbers. */
function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  return step * magnitude;
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface TipState {
  x: number;
  y: number;
  title: string;
  rows: { label: string; value: string; color?: string }[];
}

function Tooltip({ tip, width }: { tip: TipState; width: number }) {
  const TIP_WIDTH = 168;
  const left = Math.max(4, Math.min(tip.x - TIP_WIDTH / 2, width - TIP_WIDTH - 4));

  return (
    <div
      className="pointer-events-none absolute z-20 rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{
        left,
        top: Math.max(0, tip.y - 8),
        width: TIP_WIDTH,
        transform: "translateY(-100%)",
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
      }}
      role="status"
    >
      <div className="mb-1 font-medium" style={{ color: "var(--text-primary)" }}>
        {tip.title}
      </div>
      {tip.rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-2 leading-5">
          <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
            {row.color && (
              <span
                aria-hidden
                className="inline-block size-2 shrink-0 rounded-full"
                style={{ background: row.color }}
              />
            )}
            {row.label}
          </span>
          <span className="tabular" style={{ color: "var(--text-primary)" }}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legend — always present for two or more series
// ---------------------------------------------------------------------------

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block size-2.5 rounded-[3px]"
            style={{ background: item.color }}
          />
          <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

function EmptyChart({ height, message }: { height: number; message: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg text-sm"
      style={{ height, color: "var(--text-muted)", border: "1px dashed var(--grid)" }}
    >
      {message}
    </div>
  );
}

export function ChartFrame({
  title,
  subtitle,
  legend,
  children,
}: {
  title: string;
  subtitle?: string;
  legend?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-2xl p-4"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
      }}
    >
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {subtitle}
            </p>
          )}
        </div>
        {legend}
      </header>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Stacked bars over time — needs / wants / unclassified per day
// ---------------------------------------------------------------------------

export interface DayDatum {
  date: string;
  label: string;
  needs: number;
  wants: number;
  unclear: number;
}

export function StackedDayBars({
  data,
  currency,
  height = 190,
}: {
  data: DayDatum[];
  currency: string;
  height?: number;
}) {
  const { ref, width } = useSize<HTMLDivElement>();
  const [tip, setTip] = useState<TipState | null>(null);

  if (!data.length) return <EmptyChart height={height} message="No spending in this period" />;

  // Left padding has to clear the widest tick label ("Rs 50.0k") at 10px.
  const padding = { top: 8, right: 6, bottom: 22, left: 56 };
  const plotW = Math.max(0, width - padding.left - padding.right);
  const plotH = height - padding.top - padding.bottom;

  const totals = data.map((d) => d.needs + d.wants + d.unclear);
  const max = niceMax(Math.max(...totals, 1));
  const band = plotW / data.length;
  const barW = Math.max(6, Math.min(30, band * 0.56));
  const scale = (v: number) => (v / max) * plotH;
  const ticks = [0, max / 2, max];

  // Only label as many bands as fit without the text overlapping.
  const slot = labelSlot(data.map((d) => d.label));
  const labelStep = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(plotW / slot))));

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Daily spending, ${data.length} days, stacked by needs and wants`}
        >
          {/* Recessive grid */}
          {ticks.map((t) => {
            const y = padding.top + plotH - scale(t);
            return (
              <g key={t}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke={t === 0 ? "var(--axis)" : "var(--grid)"}
                  strokeWidth={1}
                />
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="tabular"
                  fontSize={10}
                  fill="var(--text-muted)"
                >
                  {formatMoneyCompact(t, currency)}
                </text>
              </g>
            );
          })}

          {data.map((d, i) => {
            const bandX = padding.left + i * band;
            const x = bandX + (band - barW) / 2;
            const total = d.needs + d.wants + d.unclear;

            const segments = [
              { key: "needs", value: d.needs, color: "var(--series-needs)" },
              { key: "wants", value: d.wants, color: "var(--series-wants)" },
              { key: "unclear", value: d.unclear, color: "var(--series-unclear)" },
            ].filter((s) => s.value > 0);

            let cursor = padding.top + plotH; // stack upward from the baseline
            const marks = segments.map((segment, index) => {
              const rawH = scale(segment.value);
              const isTop = index === segments.length - 1;
              // Reserve the 2px surface gap from every segment above the first.
              const h = Math.max(1, rawH - (index > 0 ? SURFACE_GAP : 0));
              const y = cursor - h;
              cursor -= rawH;
              return (
                <path
                  key={segment.key}
                  d={
                    isTop
                      ? topRoundedPath(x, y, barW, h, RADIUS)
                      : `M${x},${y} h${barW} v${h} h${-barW} Z`
                  }
                  fill={segment.color}
                />
              );
            });

            const showLabel = i % labelStep === 0;

            return (
              <g key={d.date}>
                {marks}
                {showLabel &&
                  (() => {
                    // Pull the last label inside the frame instead of clipping it.
                    const center = bandX + band / 2;
                    const overflowsRight = center + slot / 2 > width - padding.right;
                    return (
                      <text
                        x={overflowsRight ? width - padding.right : center}
                        y={height - 6}
                        textAnchor={overflowsRight ? "end" : "middle"}
                        fontSize={10}
                        fill="var(--text-muted)"
                      >
                        {d.label}
                      </text>
                    );
                  })()}
                {/* Hit target spans the full band, taller than the mark. */}
                <rect
                  x={bandX}
                  y={padding.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  onPointerEnter={() =>
                    setTip({
                      x: bandX + band / 2,
                      y: padding.top + plotH - scale(total),
                      title: d.label,
                      rows: [
                        { label: "Total", value: formatMoney(total, currency) },
                        ...(d.needs > 0
                          ? [
                              {
                                label: "Needs",
                                value: formatMoney(d.needs, currency),
                                color: "var(--series-needs)",
                              },
                            ]
                          : []),
                        ...(d.wants > 0
                          ? [
                              {
                                label: "Wants",
                                value: formatMoney(d.wants, currency),
                                color: "var(--series-wants)",
                              },
                            ]
                          : []),
                        ...(d.unclear > 0
                          ? [
                              {
                                label: "Unsorted",
                                value: formatMoney(d.unclear, currency),
                                color: "var(--series-unclear)",
                              },
                            ]
                          : []),
                      ],
                    })
                  }
                  onPointerLeave={() => setTip(null)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {tip && <Tooltip tip={tip} width={width} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ranked horizontal bars — spend by category
// ---------------------------------------------------------------------------

export function RankedBars({
  data,
  currency,
  max: maxItems = 6,
}: {
  data: { category: string; total: number; count: number }[];
  currency: string;
  max?: number;
}) {
  const rows = data.slice(0, maxItems);
  if (!rows.length) return <EmptyChart height={140} message="Nothing categorised yet" />;

  const max = Math.max(...rows.map((r) => r.total), 1);

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => {
        const pct = (row.total / max) * 100;
        return (
          <li key={row.category}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
              <span className="truncate" style={{ color: "var(--text-secondary)" }}>
                {row.category}
              </span>
              {/* Direct label — every row, because there are at most six. */}
              <span className="tabular shrink-0" style={{ color: "var(--text-primary)" }}>
                {formatMoney(row.total, currency)}
              </span>
            </div>
            <div className="h-2 w-full rounded-full" style={{ background: "var(--surface-2)" }}>
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  background: "var(--series-needs)",
                }}
                title={`${row.category}: ${formatMoney(row.total, currency)} across ${row.count} purchases`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Split bar — the needs / wants ratio at a glance
// ---------------------------------------------------------------------------

export function SplitBar({
  needs,
  wants,
  unclear,
  currency,
}: {
  needs: number;
  wants: number;
  unclear: number;
  currency: string;
}) {
  const { ref, width } = useSize<HTMLDivElement>();
  const total = needs + wants + unclear;
  const height = 34;

  if (total <= 0) return <EmptyChart height={height} message="No spending yet" />;

  const segments = [
    { key: "Needs", value: needs, color: "var(--series-needs)" },
    { key: "Wants", value: wants, color: "var(--series-wants)" },
    { key: "Unsorted", value: unclear, color: "var(--series-unclear)" },
  ].filter((s) => s.value > 0);

  return (
    <div ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Needs ${Math.round((needs / total) * 100)} percent, wants ${Math.round((wants / total) * 100)} percent`}
        >
          {(() => {
            let cursor = 0;
            return segments.map((segment, index) => {
              const rawW = (segment.value / total) * width;
              const isFirst = index === 0;
              const isLast = index === segments.length - 1;
              const x = cursor + (isFirst ? 0 : SURFACE_GAP);
              const w = Math.max(2, rawW - (isFirst ? 0 : SURFACE_GAP));
              cursor += rawW;

              const d =
                segments.length === 1
                  ? pillPath(x, 0, w, height, RADIUS)
                  : isFirst
                    ? // rounded left end only
                      pillPath(x, 0, w + RADIUS, height, RADIUS)
                    : isLast
                      ? rightRoundedPath(x, 0, w, height, RADIUS)
                      : `M${x},0 h${w} v${height} h${-w} Z`;

              return (
                <g key={segment.key}>
                  <clipPath id={`clip-${segment.key}`}>
                    <rect x={x} y={0} width={w} height={height} />
                  </clipPath>
                  <path d={d} fill={segment.color} clipPath={`url(#clip-${segment.key})`} />
                  {w > 52 && (
                    <text
                      x={x + 8}
                      y={height / 2 + 4}
                      fontSize={11}
                      fontWeight={600}
                      fill="#ffffff"
                    >
                      {Math.round((segment.value / total) * 100)}%
                    </text>
                  )}
                </g>
              );
            });
          })()}
        </svg>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block size-2.5 rounded-[3px]"
              style={{ background: s.color }}
            />
            <span style={{ color: "var(--text-secondary)" }}>{s.key}</span>
            <span className="tabular" style={{ color: "var(--text-primary)" }}>
              {formatMoney(s.value, currency)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trend line — one series across the last N periods
// ---------------------------------------------------------------------------

export function TrendLine({
  data,
  currency,
  height = 150,
}: {
  data: { label: string; total: number }[];
  currency: string;
  height?: number;
}) {
  const { ref, width } = useSize<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  if (data.length < 2) return <EmptyChart height={height} message="Not enough history yet" />;

  const padding = { top: 10, right: 12, bottom: 22, left: 56 };
  const plotW = Math.max(0, width - padding.left - padding.right);
  const plotH = height - padding.top - padding.bottom;
  const max = niceMax(Math.max(...data.map((d) => d.total), 1));

  const x = (i: number) => padding.left + (i / (data.length - 1)) * plotW;
  const y = (v: number) => padding.top + plotH - (v / max) * plotH;

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.total)}`).join(" ");
  const ticks = [0, max / 2, max];

  // Thin the x labels to whatever fits — collided labels are worse than gaps.
  // The last point always keeps its label so the series is anchored in time.
  const slot = labelSlot(data.map((d) => d.label));
  const labelStep = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(plotW / slot))));
  const showLabel = (i: number) =>
    i === data.length - 1 || (i % labelStep === 0 && data.length - 1 - i >= labelStep);

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Spending trend across ${data.length} periods`}
          onPointerLeave={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? "var(--axis)" : "var(--grid)"}
                strokeWidth={1}
              />
              <text
                x={padding.left - 6}
                y={y(t) + 3}
                textAnchor="end"
                className="tabular"
                fontSize={10}
                fill="var(--text-muted)"
              >
                {formatMoneyCompact(t, currency)}
              </text>
            </g>
          ))}

          <path
            d={line}
            fill="none"
            stroke="var(--series-needs)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {active !== null && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={padding.top}
              y2={padding.top + plotH}
              stroke="var(--axis)"
              strokeWidth={1}
            />
          )}

          {data.map((d, i) => (
            <g key={d.label + i}>
              {(active === i || data.length <= 8) && (
                // 2px surface ring keeps the marker legible over the line.
                <circle
                  cx={x(i)}
                  cy={y(d.total)}
                  r={active === i ? 5 : 4}
                  fill="var(--series-needs)"
                  stroke="var(--surface-1)"
                  strokeWidth={2}
                />
              )}
              <rect
                x={x(i) - plotW / (data.length - 1) / 2}
                y={padding.top}
                width={plotW / (data.length - 1)}
                height={plotH}
                fill="transparent"
                onPointerEnter={() => setActive(i)}
              />
              {showLabel(i) && (
                <text
                  x={x(i)}
                  y={height - 6}
                  textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
                  fontSize={10}
                  fill="var(--text-muted)"
                >
                  {d.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      )}
      {active !== null && (
        <Tooltip
          tip={{
            x: x(active),
            y: y(data[active].total),
            title: data[active].label,
            rows: [{ label: "Spent", value: formatMoney(data[active].total, currency) }],
          }}
          width={width}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat tile / hero figure — when a single number is the whole answer
// ---------------------------------------------------------------------------

export function StatTile({
  label,
  value,
  delta,
  hero = false,
}: {
  label: string;
  value: string;
  /** Percentage change vs the comparable previous period. */
  delta?: number | null;
  hero?: boolean;
}) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  // Spending less than before is the good direction.
  const deltaColor = !hasDelta
    ? "var(--text-muted)"
    : delta! > 0
      ? "var(--critical)"
      : "var(--good)";

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div
        className={hero ? "mt-1 text-4xl font-semibold" : "mt-1 text-xl font-semibold"}
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </div>
      {hasDelta && (
        <div className="mt-1 flex items-center gap-1 text-xs" style={{ color: deltaColor }}>
          <span aria-hidden>{delta! > 0 ? "▲" : delta! < 0 ? "▼" : "—"}</span>
          <span className="tabular">
            {Math.abs(Math.round(delta!))}% vs previous
          </span>
        </div>
      )}
    </div>
  );
}
