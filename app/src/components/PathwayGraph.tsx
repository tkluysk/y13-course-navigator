import { useMemo } from "react";
import type { Course } from "../types";
import type { PathwayGraph as PathwayGraphData } from "../pathways";

interface Props {
  graph: PathwayGraphData;
  centerCode: string;
  onSelectCode: (code: string) => void;
}

const NODE_W = 168;
const NODE_H = 56;
const COL_GAP = 220;
const ROW_GAP = 20;
const PAD = 24;

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export default function PathwayGraph({ graph, centerCode, onSelectCode }: Props) {
  const { upstream, center, downstream } = useMemo(() => {
    const upstream = graph.nodes.filter((n) => n.role === "upstream");
    const downstream = graph.nodes.filter((n) => n.role === "downstream");
    const center = graph.nodes.find((n) => n.role === "center") ?? null;
    return { upstream, center, downstream };
  }, [graph]);

  if (!center) return null;

  const rows = Math.max(upstream.length, downstream.length, 1);
  const height = PAD * 2 + rows * NODE_H + (rows - 1) * ROW_GAP;
  const width = PAD * 2 + NODE_W * 3 + COL_GAP * 2;

  const colX = { upstream: PAD, center: PAD + NODE_W + COL_GAP, downstream: PAD + (NODE_W + COL_GAP) * 2 };

  const yFor = (idx: number, count: number) => {
    const totalH = count * NODE_H + (count - 1) * ROW_GAP;
    const start = (height - totalH) / 2;
    return start + idx * (NODE_H + ROW_GAP);
  };

  const centerY = height / 2 - NODE_H / 2;

  const positions = new Map<string, { x: number; y: number }>();
  positions.set(center.course.code, { x: colX.center, y: centerY });
  upstream.forEach((n, i) => positions.set(n.course.code, { x: colX.upstream, y: yFor(i, upstream.length) }));
  downstream.forEach((n, i) => positions.set(n.course.code, { x: colX.downstream, y: yFor(i, downstream.length) }));

  const edgeColor = (kind: string) =>
    kind === "gap" ? "var(--gap-edge, #d9a441)" : kind === "prerequisite" ? "var(--accent)" : "var(--text)";

  return (
    <div className="pathway-graph-wrap">
      <svg
        className="pathway-graph"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label={`Pathway graph for ${centerCode}`}
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="var(--text)" />
          </marker>
          <marker
            id="arrow-gap"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="#d9a441" />
          </marker>
          <marker
            id="arrow-prereq"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" />
          </marker>
        </defs>

        {graph.edges.map((e, i) => {
          const from = positions.get(e.from.code);
          const to = positions.get(e.to.code);
          if (!from || !to) return null;
          const x1 = from.x + NODE_W;
          const y1 = from.y + NODE_H / 2;
          const x2 = to.x;
          const y2 = to.y + NODE_H / 2;
          const midX = (x1 + x2) / 2;
          const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
          const marker =
            e.kind === "gap" ? "url(#arrow-gap)" : e.kind === "prerequisite" ? "url(#arrow-prereq)" : "url(#arrow)";
          const labelX = (x1 + x2) / 2;
          const labelY = (y1 + y2) / 2;
          const dashed = e.kind === "gap";
          return (
            <g key={i}>
              <path
                d={path}
                fill="none"
                stroke={edgeColor(e.kind)}
                strokeWidth={1.6}
                strokeDasharray={dashed ? "4 3" : undefined}
                markerEnd={marker}
                opacity={0.85}
              />
              <g transform={`translate(${labelX}, ${labelY})`}>
                <rect
                  x={-(e.label.length * 3.4 + 8)}
                  y={-9}
                  width={e.label.length * 6.8 + 16}
                  height={18}
                  rx={9}
                  fill="var(--bg-alt)"
                  stroke="var(--border)"
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10.5}
                  fill={e.kind === "gap" ? "#b8811f" : "var(--text)"}
                  fontFamily="var(--mono)"
                  fontWeight={600}
                >
                  {e.label}
                </text>
              </g>
            </g>
          );
        })}

        {graph.nodes.map((n) => {
          const pos = positions.get(n.course.code);
          if (!pos) return null;
          const isCenter = n.role === "center";
          return (
            <g
              key={n.course.code}
              transform={`translate(${pos.x}, ${pos.y})`}
              className={"graph-node" + (isCenter ? " graph-node-center" : "")}
              onClick={() => !isCenter && onSelectCode(n.course.code)}
              style={{ cursor: isCenter ? "default" : "pointer" }}
            >
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill={isCenter ? "var(--accent-bg)" : "var(--bg)"}
                stroke={isCenter ? "var(--accent)" : "var(--border)"}
                strokeWidth={isCenter ? 2 : 1}
              />
              <text x={12} y={22} fontSize={11} fontFamily="var(--mono)" fontWeight={700} fill="var(--accent)">
                {n.course.code}
              </text>
              <text x={12} y={38} fontSize={10.5} fill="var(--text-h)">
                {truncate(n.course.title, 24)}
              </text>
              <text x={12} y={50} fontSize={9} fill="var(--text)" fontFamily="var(--mono)">
                {n.course.level}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="graph-legend">
        <li>
          <span className="legend-swatch pathway" /> pathway text
        </li>
        <li>
          <span className="legend-swatch prereq" /> stated entry requirement
        </li>
        <li>
          <span className="legend-swatch gap" /> same subject, not stated as required
        </li>
      </ul>
    </div>
  );
}

export type { Course };
