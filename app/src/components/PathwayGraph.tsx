import { useMemo, useState } from "react";
import type { EdgeKind, GraphEndpoint, PathwayGraph as PathwayGraphData } from "../pathways";
import { endpointKey } from "../pathways";

interface Props {
  graph: PathwayGraphData;
  centerCode: string;
  onSelectCode: (code: string) => void;
}

const NODE_W = 180;
const NODE_H = 56;
const TEXT_NODE_W = 240;
const TEXT_NODE_MIN_H = 72;
const COL_GAP = 220;
const ROW_GAP = 16;
const PAD = 24;
const CHARS_PER_LINE = 34;
const LINE_HEIGHT = 13;

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function wrapText(s: string, charsPerLine: number): string[] {
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > charsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function nodeHeight(endpoint: GraphEndpoint): number {
  if (endpoint.type !== "text") return NODE_H;
  const lines = wrapText(endpoint.text, CHARS_PER_LINE);
  return Math.max(TEXT_NODE_MIN_H, 20 + lines.length * LINE_HEIGHT + 12);
}

function nodeWidth(endpoint: GraphEndpoint): number {
  return endpoint.type === "text" ? TEXT_NODE_W : NODE_W;
}

const EDGE_COLOR: Record<EdgeKind, string> = {
  prerequisite: "var(--accent)",
  gap: "#d9a441",
  alternative: "#2aa8a8",
  pathway: "var(--text)",
};

const EDGE_LABEL_COLOR: Record<EdgeKind, string> = {
  prerequisite: "var(--accent)",
  gap: "#b8811f",
  alternative: "#1f8080",
  pathway: "var(--text)",
};

export default function PathwayGraph({ graph, centerCode, onSelectCode }: Props) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const { upstream, center, downstream } = useMemo(() => {
    const upstream = graph.nodes.filter((n) => n.role === "upstream");
    const downstream = graph.nodes.filter((n) => n.role === "downstream");
    const center = graph.nodes.find((n) => n.role === "center") ?? null;
    return { upstream, center, downstream };
  }, [graph]);

  if (!center) return null;

  const colWidth = {
    upstream: Math.max(NODE_W, ...upstream.map((n) => nodeWidth(n.endpoint)), NODE_W),
    center: NODE_W,
    downstream: Math.max(NODE_W, ...downstream.map((n) => nodeWidth(n.endpoint)), NODE_W),
  };

  const colTotalH = (nodes: typeof upstream) => {
    if (nodes.length === 0) return NODE_H;
    const heights = nodes.map((n) => nodeHeight(n.endpoint));
    return heights.reduce((a, b) => a + b, 0) + (nodes.length - 1) * ROW_GAP;
  };

  const height = PAD * 2 + Math.max(colTotalH(upstream), colTotalH(downstream), NODE_H);
  const colX = {
    upstream: PAD,
    center: PAD + colWidth.upstream + COL_GAP,
    downstream: PAD + colWidth.upstream + COL_GAP + colWidth.center + COL_GAP,
  };
  const width = colX.downstream + colWidth.downstream + PAD;

  const yPositions = (nodes: typeof upstream) => {
    const totalH = colTotalH(nodes);
    const start = (height - totalH) / 2;
    const map = new Map<string, number>();
    let y = start;
    for (const n of nodes) {
      map.set(endpointKey(n.endpoint), y);
      y += nodeHeight(n.endpoint) + ROW_GAP;
    }
    return map;
  };

  const centerY = height / 2 - NODE_H / 2;

  const positions = new Map<string, { x: number; y: number }>();
  positions.set(endpointKey(center.endpoint), { x: colX.center, y: centerY });
  for (const [key, y] of yPositions(upstream)) positions.set(key, { x: colX.upstream, y });
  for (const [key, y] of yPositions(downstream)) positions.set(key, { x: colX.downstream, y });

  const expandedNode = graph.nodes.find(
    (n) => n.endpoint.type === "group" && n.endpoint.id === expandedGroup
  );
  const expandedGroupData = expandedNode?.endpoint.type === "group" ? expandedNode.endpoint : null;

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
          {(Object.keys(EDGE_COLOR) as EdgeKind[]).map((kind) => (
            <marker
              key={kind}
              id={`arrow-${kind}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill={EDGE_COLOR[kind]} />
            </marker>
          ))}
        </defs>

        {graph.edges.map((e, i) => {
          const from = positions.get(endpointKey(e.from));
          const to = positions.get(endpointKey(e.to));
          if (!from || !to) return null;
          const fromW = nodeWidth(e.from);
          const fromH = nodeHeight(e.from);
          const toH = nodeHeight(e.to);
          const x1 = from.x + fromW;
          const y1 = from.y + fromH / 2;
          const x2 = to.x;
          const y2 = to.y + toH / 2;
          const midX = (x1 + x2) / 2;
          const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
          const labelX = (x1 + x2) / 2;
          const labelY = (y1 + y2) / 2;
          const dashed = e.kind === "gap" || e.kind === "alternative";
          return (
            <g key={i}>
              <path
                d={path}
                fill="none"
                stroke={EDGE_COLOR[e.kind]}
                strokeWidth={1.6}
                strokeDasharray={dashed ? "4 3" : undefined}
                markerEnd={`url(#arrow-${e.kind})`}
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
                  fill={EDGE_LABEL_COLOR[e.kind]}
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
          const key = endpointKey(n.endpoint);
          const pos = positions.get(key);
          if (!pos) return null;
          const isCenter = n.role === "center";
          const isGroup = n.endpoint.type === "group";
          const isText = n.endpoint.type === "text";
          const w = nodeWidth(n.endpoint);
          const h = nodeHeight(n.endpoint);

          const handleClick = () => {
            if (isCenter || isText) return;
            if (n.endpoint.type === "group") {
              setExpandedGroup(expandedGroup === n.endpoint.id ? null : n.endpoint.id);
            } else if (n.endpoint.type === "course") {
              onSelectCode(n.endpoint.course.code);
            }
          };

          const tooltip =
            n.endpoint.type === "course"
              ? [
                  `${n.endpoint.course.code} — ${n.endpoint.course.title} (${n.endpoint.course.level})`,
                  n.endpoint.course.entry_text && `Entry: ${n.endpoint.course.entry_text}`,
                  n.endpoint.course.donation_amount &&
                    `Donation: ${n.endpoint.course.donation_amount}${n.endpoint.course.donation_text ? ` — ${n.endpoint.course.donation_text}` : ""}`,
                ]
                  .filter(Boolean)
                  .join("\n")
              : n.endpoint.type === "group"
                ? `${n.endpoint.label}: ${n.endpoint.members.map((m) => m.code).join(", ")}`
                : n.endpoint.text;

          return (
            <g
              key={key}
              transform={`translate(${pos.x}, ${pos.y})`}
              className={"graph-node" + (isCenter ? " graph-node-center" : "") + (isText ? " graph-node-text" : "")}
              onClick={handleClick}
              style={{ cursor: isCenter || isText ? "default" : "pointer" }}
            >
              <title>{tooltip}</title>
              <rect
                width={w}
                height={h}
                rx={10}
                fill={isCenter ? "var(--accent-bg)" : isText ? "var(--bg-alt)" : "var(--bg)"}
                stroke={isCenter ? "var(--accent)" : "var(--border)"}
                strokeWidth={isCenter ? 2 : 1}
                strokeDasharray={isGroup ? "3 3" : undefined}
              />
              {n.endpoint.type === "course" ? (
                <>
                  <text x={12} y={22} fontSize={11} fontFamily="var(--mono)" fontWeight={700} fill="var(--accent)">
                    {n.endpoint.course.code}
                  </text>
                  <text x={12} y={38} fontSize={10.5} fill="var(--text-h)">
                    {truncate(n.endpoint.course.title, 25)}
                  </text>
                  <text x={12} y={50} fontSize={9} fill="var(--text)" fontFamily="var(--mono)">
                    {n.endpoint.course.level}
                  </text>
                </>
              ) : n.endpoint.type === "group" ? (
                <>
                  <text x={12} y={24} fontSize={10.5} fontWeight={700} fill="#1f8080">
                    {truncate(n.endpoint.label, 26)}
                  </text>
                  <text x={12} y={40} fontSize={9.5} fill="var(--text)">
                    {n.endpoint.members.length} courses — click to list
                  </text>
                </>
              ) : (
                <>
                  <text x={12} y={16} fontSize={9} fontWeight={700} fill="var(--text)" letterSpacing={0.4}>
                    BEYOND SCHOOL
                  </text>
                  {wrapText(n.endpoint.text, CHARS_PER_LINE).map((line, li) => (
                    <text
                      key={li}
                      x={12}
                      y={20 + 14 + li * LINE_HEIGHT}
                      fontSize={10}
                      fill="var(--text-h)"
                    >
                      {line}
                    </text>
                  ))}
                </>
              )}
            </g>
          );
        })}
      </svg>
      {expandedGroupData && (
        <div className="graph-group-popover">
          <div className="graph-group-popover-head">
            <strong>{expandedGroupData.label}</strong>
            <button type="button" onClick={() => setExpandedGroup(null)}>
              ×
            </button>
          </div>
          <ul>
            {expandedGroupData.members.map((m) => (
              <li key={m.code}>
                <button type="button" onClick={() => onSelectCode(m.code)}>
                  <span className="link-chip-code">{m.code}</span> {m.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ul className="graph-legend">
        <li>
          <span className="legend-swatch pathway" /> pathway text
        </li>
        <li>
          <span className="legend-swatch prereq" /> stated entry requirement
        </li>
        <li>
          <span className="legend-swatch alternative" /> accepted as an alternative subject
        </li>
        <li>
          <span className="legend-swatch gap" /> same subject, not stated as required
        </li>
      </ul>
    </div>
  );
}

export type { GraphEndpoint };
