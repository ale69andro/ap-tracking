type SparkLineProps = {
  data: number[];
  height?: number;
  color: string;
  /** Minimum visual range as a fraction of max value (0 = natural scaling).
   *  Use ~0.01 for card sparklines to ensure a perceptible slope even for
   *  small E1RM deltas. Leave at 0 for detail/history charts. */
  minRangePct?: number;
};

export default function SparkLine({ data, height = 40, color, minRangePct = 0 }: SparkLineProps) {
  if (data.length < 2) return null;

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

  // Amplify visible slope: 50% padding so even small E1RM differences render
  // as a clear incline/decline. Minimum effective range = 2% of max value so
  // a 1-kg improvement on a 100 kg lift is still perceptible.
  const minRange = max * minRangePct;
  const ampRange = range > 0 ? Math.max(range, minRange) : minRange;
  const rangePad = ampRange * 0.5;
  const effectiveMax = max + rangePad;
  const effectiveRange = range > 0 ? ampRange + 2 * rangePad : 1;

  const points = data.map((v, i) => ({
    x: padXLeft + (i / (data.length - 1)) * drawW,
    y: range === 0 ? midY : padYTop + ((effectiveMax - v) / effectiveRange) * drawH,
  }));

  // Straight line segments
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${H} L ${points[0].x.toFixed(2)} ${H} Z`;

  // Stable gradient / filter IDs derived from color
  const gradId   = `spkg-${color.replace(/[^a-z0-9]/gi, "")}`;
  const fadeId   = `spkf-${color.replace(/[^a-z0-9]/gi, "")}`;
  const glowId   = `spkgl-${color.replace(/[^a-z0-9]/gi, "")}`;

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
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
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
          strokeWidth="3"
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
        const size = isLast ? 8 : 4;
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
              background: isLast ? color : `${color}`,
              opacity: isLast ? 1 : intermediateOpacity,
              // Last point: inner tight glow + outer soft halo + white micro-ring
              boxShadow: isLast
                ? `0 0 0 1.5px rgba(255,255,255,0.15), 0 0 6px 2px ${color}cc, 0 0 14px 4px ${color}50`
                : undefined,
              pointerEvents: "none",
            }}
          />
        );
      })}
    </div>
  );
}
