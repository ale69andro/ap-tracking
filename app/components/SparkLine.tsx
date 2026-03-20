type SparkLineProps = {
  data: number[];
  height?: number;
  color: string;
  /** Minimum visual range as a fraction of max value (0 = natural scaling).
   *  Use ~0.06 for progress-screen card sparklines.
   *  Leave at 0 for detail/history charts. */
  minRangePct?: number;
  /**
   * "dashboard" — compact, wide, glance-driven cards (home screen ProgressionCard).
   *   Forces minRangePct ≥ 0.08 and uses rangePad=0.12 for ~80% vertical travel.
   * "default"   — progress-screen cards and detail charts; respects passed minRangePct
   *   and uses rangePad=0.25 for ~67% vertical travel.
   */
  variant?: "default" | "dashboard";
};

export default function SparkLine({ data, height = 40, color, minRangePct = 0, variant = "default" }: SparkLineProps) {
  if (data.length < 2) return null;

  const isDashboard = variant === "dashboard";

  // Dashboard: tighter padding → more of drawH used for actual data travel.
  // Default: moderate padding preserves visual breathing room for taller charts.
  const rangePadFactor    = isDashboard ? 0.12 : 0.25;
  // Dashboard: floor minRangePct at 0.08 so even tiny E1RM deltas on compact
  // wide cards produce a clearly visible slope. Caller value wins if higher.
  const effectiveMinRange = isDashboard ? Math.max(minRangePct, 0.08) : minRangePct;

  const W = 100;
  const H = height;
  // Mild asymmetric horizontal padding: slight right-bias without cropping.
  const padXLeft  = 10;
  const padXRight = 8;
  const padYTop = 8;
  const padYBot = 6;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  const drawW = W - padXLeft - padXRight;
  const drawH = H - padYTop - padYBot;

  // When all values are equal, draw a centered flat line (stagnation)
  const midY = padYTop + drawH / 2;

  const minRange = max * effectiveMinRange;
  const ampRange = range > 0 ? Math.max(range, minRange) : minRange;
  const rangePad = ampRange * rangePadFactor;
  const effectiveMax = max + rangePad;
  const effectiveRange = range > 0 ? ampRange + 2 * rangePad : 1;

  const points = data.map((v, i) => ({
    x: padXLeft + (i / (data.length - 1)) * drawW,
    y: range === 0 ? midY : padYTop + ((effectiveMax - v) / effectiveRange) * drawH,
  }));

  // Straight line segments
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${H} L ${points[0].x.toFixed(2)} ${H} Z`;

  // Stable gradient / filter IDs derived from color + variant to avoid collisions
  const suffix = `${color.replace(/[^a-z0-9]/gi, "")}${isDashboard ? "d" : ""}`;
  const gradId  = `spkg-${suffix}`;
  const fadeId  = `spkf-${suffix}`;
  const glowId  = `spkgl-${suffix}`;

  // Dashboard area fill is slightly stronger to compensate for shallow card depth
  const areaOpacity = isDashboard ? 0.38 : 0.32;

  return (
    <div style={{ position: "relative", height }}>
      {/* SVG: area fill + line only — no circles (circles distort with preserveAspectRatio="none") */}
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={areaOpacity} />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          {/* Left-edge fade: de-emphasises oldest data without hard cropping */}
          <linearGradient id={fadeId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#09090b" stopOpacity="0.55" />
            <stop offset="35%"  stopColor="#09090b" stopOpacity="0" />
          </linearGradient>
          {/* Soft glow filter for the line */}
          <filter id={glowId} x="-20%" y="-60%" width="140%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
        />
        {/* Soft left fade overlay — old data recedes, current data reads clearly */}
        <rect x="0" y="0" width={W} height={H} fill={`url(#${fadeId})`} />
      </svg>

      {/* CSS circles: always perfectly round, positioned via percentage/px */}
      {points.map((p, i) => {
        const isLast = i === points.length - 1;
        const size = isLast ? 10 : 4;
        // Intermediate dots fade from left to right matching the SVG left-edge fade.
        // oldest → 18% opacity, rightmost non-last → 38% opacity.
        const intermediateOpacity = 0.18 + (i / Math.max(points.length - 2, 1)) * 0.20;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: p.y,
              width: size,
              height: size,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              background: color,
              opacity: isLast ? 1 : intermediateOpacity,
              // Last point: white micro-ring + tight inner glow + wide halo
              boxShadow: isLast
                ? `0 0 0 2px rgba(255,255,255,0.18), 0 0 8px 3px ${color}dd, 0 0 20px 6px ${color}55`
                : undefined,
              pointerEvents: "none",
            }}
          />
        );
      })}
    </div>
  );
}
