"use client";

interface RadarScoreChartProps {
  scores: {
    scoreLogical: number;
    scoreCompanyFit: number;
    scoreInitiative: number;
    scoreCommunication: number;
    scoreCultureFit: number;
  };
}

export function RadarScoreChart({ scores }: RadarScoreChartProps) {
  const axes = [
    { label: "論理的思考力", value: scores.scoreLogical },
    { label: "企業理解度・志望度", value: scores.scoreCompanyFit },
    { label: "主体性・再現性", value: scores.scoreInitiative },
    { label: "結論ファースト", value: scores.scoreCommunication },
    { label: "カルチャーフィット", value: scores.scoreCultureFit },
  ];

  const size = 320;
  const center = size / 2;
  const radius = 100;
  const totalAxes = axes.length;

  const getCoordinates = (value: number, index: number, max = 100) => {
    const angle = (Math.PI * 2 / totalAxes) * index - Math.PI / 2;
    const r = (value / max) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // 背景のグリッド（20, 40, 60, 80, 100%）
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // データポリゴンの頂点座標
  const polygonPoints = axes
    .map((axis, i) => {
      const { x, y } = getCoordinates(axis.value, i);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <svg width={size} height={size} className="overflow-visible">
        {/* 背景の同心多角形 */}
        {levels.map((lvl, lvlIdx) => {
          const gridPoints = axes
            .map((_, i) => {
              const { x, y } = getCoordinates(lvl * 100, i);
              return `${x},${y}`;
            })
            .join(" ");

          return (
            <polygon
              key={lvlIdx}
              points={gridPoints}
              fill="transparent"
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray={lvl === 1.0 ? "none" : "3 3"}
            />
          );
        })}

        {/* 軸線 */}
        {axes.map((_, i) => {
          const { x, y } = getCoordinates(100, i);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#334155"
              strokeWidth="1"
            />
          );
        })}

        {/* データ塗りつぶし領域 */}
        <polygon
          points={polygonPoints}
          fill="rgba(59, 130, 246, 0.35)"
          stroke="#3b82f6"
          strokeWidth="2.5"
        />

        {/* データ頂点マーカー */}
        {axes.map((axis, i) => {
          const { x, y } = getCoordinates(axis.value, i);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4.5"
              fill="#60a5fa"
              stroke="#1e3a8a"
              strokeWidth="2"
            />
          );
        })}

        {/* 各軸のラベル */}
        {axes.map((axis, i) => {
          const angle = (Math.PI * 2 / totalAxes) * indexOrAngle(i) - Math.PI / 2;
          const labelDist = radius + 25;
          const lx = center + labelDist * Math.cos(angle);
          const ly = center + labelDist * Math.sin(angle);

          return (
            <text
              key={i}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[11px] font-semibold fill-slate-300"
            >
              {axis.label} ({axis.value})
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function indexOrAngle(i: number) {
  return i;
}
