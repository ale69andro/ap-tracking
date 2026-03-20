type SparkLineProps = {
  data: number[];
  height?: number;
  color: string;
};

export default function SparkLine({ data, height = 40, color }: SparkLineProps) {
  if (data.length < 2) return null;

  const W = 100;
  const H = height;
  const padX = 4;
  const padYTop = 6;
  const padYBot = 4;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // y=0 is top in SVG coordinate space
  const points = data.map((v, i) => ({
    x: padX + (i / (data.length - 1)) * (W - padX * 2),
    y: padYTop + ((max - v) / range) * (H - padYTop - padYBot),
  }));

  // Straight line segments
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${H} L ${points[0].x.toFixed(2)} ${H} Z`;

  // Stable gradient ID derived from color (safe since identical colors produce identical gradients)
  const gradId = `spkg-${color.replace(/[^a-z0-9]/gi, "")}`;

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
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* CSS circles: always perfectly round, positioned via percentage/px */}
      {points.map((p, i) => {
        const isLast = i === points.length - 1;
        const size = isLast ? 7 : 5;
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
              background: isLast ? color : "#09090b",  // zinc-950 bg for hollow look
              border: `1.5px solid ${color}`,
              boxShadow: isLast ? `0 0 7px ${color}` : undefined,
              pointerEvents: "none",
            }}
          />
        );
      })}
    </div>
  );
}
