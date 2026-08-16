import { useMemo, useState } from "react";
import type { EdgeKind, GraphEndpoint, PathwayGraph as PathwayGraphData } from "../pathways";
import { endpointKey } from "../pathways";
import type { PrerequisiteCheck } from "../prerequisiteCheck";

interface Props {
  graph: PathwayGraphData;
  centerCode: string;
  onSelectCode: (code: string) => void;
  pickedCodes?: Set<string>;
  bookmarkedCodes?: Set<string>;
  notInterestedCodes?: Set<string>;
  prereqStatusByCode?: Map<string, PrerequisiteCheck>;
}

const NODE_W = 180;
const NODE_H = 56;
const GROUP_EXPANDED_W = 220;
const MEMBER_ROW_H = 22;
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

function nodeHeight(endpoint: GraphEndpoint, expandedGroup: string | null): number {
  if (endpoint.type === "text") {
    const lines = wrapText(endpoint.text, CHARS_PER_LINE);
    return Math.max(TEXT_NODE_MIN_H, 20 + lines.length * LINE_HEIGHT + 12);
  }
  if (endpoint.type === "group" && endpoint.id === expandedGroup) {
    return 40 + endpoint.members.length * MEMBER_ROW_H + 10;
  }
  return NODE_H;
}

function nodeWidth(endpoint: GraphEndpoint, expandedGroup: string | null): number {
  if (endpoint.type === "text") return TEXT_NODE_W;
  if (endpoint.type === "group" && endpoint.id === expandedGroup) return GROUP_EXPANDED_W;
  return NODE_W;
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

export default function PathwayGraph({
  graph,
  centerCode,
  onSelectCode,
  pickedCodes,
  bookmarkedCodes,
  notInterestedCodes,
  prereqStatusByCode,
}: Props) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const { upstream, center, downstream } = useMemo(() => {
    const upstream = graph.nodes.filter((n) => n.role === "upstream");
    const downstream = graph.nodes.filter((n) => n.role === "downstream");
    const center = graph.nodes.find((n) => n.role === "center") ?? null;
    return { upstream, center, downstream };
  }, [graph]);

  if (!center) return null;

  const colWidth = {
    upstream: Math.max(NODE_W, ...upstream.map((n) => nodeWidth(n.endpoint, expandedGroup))),
    center: NODE_W,
    downstream: Math.max(NODE_W, ...downstream.map((n) => nodeWidth(n.endpoint, expandedGroup))),
  };

  const colTotalH = (nodes: typeof upstream) => {
    if (nodes.length === 0) return NODE_H;
    const heights = nodes.map((n) => nodeHeight(n.endpoint, expandedGroup));
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
      y += nodeHeight(n.endpoint, expandedGroup) + ROW_GAP;
    }
    return map;
  };

  const centerY = height / 2 - NODE_H / 2;

  const positions = new Map<string, { x: number; y: number }>();
  positions.set(endpointKey(center.endpoint), { x: colX.center, y: centerY });
  for (const [key, y] of yPositions(upstream)) positions.set(key, { x: colX.upstream, y });
  for (const [key, y] of yPositions(downstream)) positions.set(key, { x: colX.downstream, y });

  return (
    <div className="pathway-graph-wrap">
      <div className="pathway-graph-scroll">
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
            const fromW = nodeWidth(e.from, expandedGroup);
            const fromH = nodeHeight(e.from, expandedGroup);
            const toH = nodeHeight(e.to, expandedGroup);
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
            const isExpanded = isGroup && n.endpoint.type === "group" && n.endpoint.id === expandedGroup;
            const w = nodeWidth(n.endpoint, expandedGroup);
            const h = nodeHeight(n.endpoint, expandedGroup);

            const courseCode = n.endpoint.type === "course" ? n.endpoint.course.code : null;
            const isPicked = !!courseCode && !!pickedCodes?.has(courseCode);
            const isBookmarked = !!courseCode && !!bookmarkedCodes?.has(courseCode);
            const isNotInterested = !!courseCode && !!notInterestedCodes?.has(courseCode);
            const prereq = courseCode ? prereqStatusByCode?.get(courseCode) : undefined;
            const hasWarning = !!prereq && prereq.status !== "ok";

            const handleHeaderClick = () => {
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
                    isPicked && "Picked in the active scenario",
                    isNotInterested && "Marked as not interested",
                    hasWarning && prereq && prereq.reason,
                  ]
                    .filter(Boolean)
                    .join("\n")
                : n.endpoint.type === "group"
                  ? `${n.endpoint.label}: ${n.endpoint.members.map((m) => m.code).join(", ")}`
                  : n.endpoint.text;

            // Fill = state (matches the chip grid's ".current-pick"/warning
            // tints); stroke = "you're looking at this" (matches the grid's
            // ".selected" ring). The two are independent so a picked course
            // that's also the graph's center gets both, same as a chip can
            // be selected and picked at once.
            let nodeFill = isText ? "var(--bg-alt)" : "var(--bg)";
            if (n.endpoint.type === "course") {
              if (isPicked) {
                nodeFill = "var(--pick-bg)";
              } else if (isNotInterested) {
                nodeFill = "var(--bg-alt)";
              } else if (hasWarning && prereq?.status === "unmet") {
                nodeFill = "rgba(192, 57, 43, 0.08)";
              } else if (hasWarning && prereq?.status === "unclear") {
                nodeFill = "rgba(217, 164, 65, 0.1)";
              }
            }
            let nodeStroke = "var(--border)";
            if (isCenter) {
              nodeStroke = "var(--accent)";
            } else if (n.endpoint.type === "course" && hasWarning) {
              nodeStroke =
                prereq?.status === "unmet" ? "rgba(192, 57, 43, 0.4)" : "rgba(217, 164, 65, 0.45)";
            } else if (isPicked) {
              nodeStroke = "var(--accent-border)";
            }

            return (
              <g
                key={key}
                transform={`translate(${pos.x}, ${pos.y})`}
                className={
                  "graph-node" +
                  (isCenter ? " graph-node-center" : "") +
                  (isText ? " graph-node-text" : "") +
                  (isNotInterested ? " graph-node-not-interested" : "")
                }
              >
                <title>{tooltip}</title>
                <rect
                  width={w}
                  height={h}
                  rx={10}
                  fill={nodeFill}
                  stroke={nodeStroke}
                  strokeWidth={isCenter ? 2 : 1}
                  strokeDasharray={isGroup && !isExpanded ? "3 3" : undefined}
                  opacity={isNotInterested ? 0.6 : 1}
                />
                {n.endpoint.type === "course" ? (
                  <g onClick={handleHeaderClick} style={{ cursor: "pointer" }}>
                    <rect width={w} height={h} rx={10} fill="transparent" />
                    <text
                      x={12}
                      y={22}
                      fontSize={11}
                      fontFamily="var(--mono)"
                      fontWeight={700}
                      fill="var(--accent)"
                      textDecoration={isNotInterested ? "line-through" : undefined}
                    >
                      {n.endpoint.course.code}
                    </text>
                    <text
                      x={12}
                      y={38}
                      fontSize={10.5}
                      fill="var(--text-h)"
                      textDecoration={isNotInterested ? "line-through" : undefined}
                    >
                      {truncate(n.endpoint.course.title, 25)}
                    </text>
                    <text x={12} y={50} fontSize={9} fill="var(--text)" fontFamily="var(--mono)">
                      {n.endpoint.course.level}
                    </text>
                    {hasWarning && (
                      <g transform="translate(6, 6)">
                        <path
                          d="M6 0 11 9.5H1z"
                          fill={prereq?.status === "unmet" ? "#c0392b" : "#d9a441"}
                        />
                        <rect x="5.4" y="4.2" width="1.2" height="3" fill="var(--bg)" />
                        <rect x="5.4" y="7.6" width="1.2" height="1.2" fill="var(--bg)" />
                      </g>
                    )}
                    {isPicked && (
                      <text x={w - 10} y={16} fontSize={13} fill="var(--accent)" textAnchor="end">
                        ★
                      </text>
                    )}
                    {isBookmarked && (
                      <path
                        d={`M ${w - 20} 0 h 10 a1 1 0 0 1 1 1 v 13 l -6 -3.6 -6 3.6 v -13 a1 1 0 0 1 1 -1 z`}
                        fill="#d9a441"
                      />
                    )}
                  </g>
                ) : n.endpoint.type === "group" ? (
                  <>
                    <g onClick={handleHeaderClick} style={{ cursor: "pointer" }}>
                      <rect width={w} height={28} rx={10} fill="transparent" />
                      <text x={12} y={17} fontSize={10.5} fontWeight={700} fill="#1f8080">
                        {truncate(n.endpoint.label, isExpanded ? 30 : 26)}
                      </text>
                      <text x={w - 10} y={17} fontSize={11} fill="#1f8080" textAnchor="end">
                        {isExpanded ? "▲" : "▼"}
                      </text>
                      {!isExpanded && (
                        <text x={12} y={40} fontSize={9.5} fill="var(--text)">
                          {n.endpoint.members.length} courses — click to list
                        </text>
                      )}
                    </g>
                    {isExpanded && (
                      <>
                        <line x1={0} y1={28} x2={w} y2={28} stroke="var(--border)" strokeWidth={1} />
                        {n.endpoint.members.map((m, mi) => {
                          const memberPicked = !!pickedCodes?.has(m.code);
                          const memberBookmarked = !!bookmarkedCodes?.has(m.code);
                          const memberPrereq = prereqStatusByCode?.get(m.code);
                          const memberWarning = memberPrereq && memberPrereq.status !== "ok";
                          const memberNotInterested = !!notInterestedCodes?.has(m.code);

                          // Same fill priority as a chip/course-node: pick >
                          // not-interested > warning tint > plain.
                          let memberFill = "transparent";
                          if (memberPicked) {
                            memberFill = "var(--pick-bg)";
                          } else if (memberNotInterested) {
                            memberFill = "var(--bg-alt)";
                          } else if (memberWarning && memberPrereq?.status === "unmet") {
                            memberFill = "rgba(192, 57, 43, 0.08)";
                          } else if (memberWarning && memberPrereq?.status === "unclear") {
                            memberFill = "rgba(217, 164, 65, 0.1)";
                          }

                          return (
                            <g
                              key={m.code}
                              transform={`translate(0, ${28 + mi * MEMBER_ROW_H})`}
                              onClick={() => onSelectCode(m.code)}
                              style={{ cursor: "pointer" }}
                              className="graph-group-member"
                            >
                              <rect width={w} height={MEMBER_ROW_H} fill={memberFill} opacity={memberNotInterested ? 0.7 : 1} />
                              <text
                                x={12}
                                y={15}
                                fontSize={9.5}
                                fontFamily="var(--mono)"
                                fontWeight={700}
                                fill="var(--accent)"
                                textDecoration={memberNotInterested ? "line-through" : undefined}
                              >
                                {m.code}
                              </text>
                              <text
                                x={68}
                                y={15}
                                fontSize={9.5}
                                fill={memberNotInterested ? "var(--text)" : "var(--text-h)"}
                                textDecoration={memberNotInterested ? "line-through" : undefined}
                              >
                                {truncate(m.title, memberPicked || memberWarning ? 14 : 18)}
                              </text>
                              {memberWarning && (
                                <circle
                                  cx={memberPicked ? w - 32 : w - 20}
                                  cy={11}
                                  r={3.5}
                                  fill={memberPrereq?.status === "unmet" ? "#c0392b" : "#d9a441"}
                                />
                              )}
                              {memberBookmarked && (
                                <circle cx={w - 20} cy={11} r={3} fill="#d9a441" />
                              )}
                              {memberPicked && (
                                <text x={w - 10} y={15} fontSize={11} fill="var(--accent)" textAnchor="end">
                                  ★
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <text x={12} y={16} fontSize={9} fontWeight={700} fill="var(--text)" letterSpacing={0.4}>
                      BEYOND SCHOOL
                    </text>
                    {wrapText(n.endpoint.text, CHARS_PER_LINE).map((line, li) => (
                      <text key={li} x={12} y={20 + 14 + li * LINE_HEIGHT} fontSize={10} fill="var(--text-h)">
                        {line}
                      </text>
                    ))}
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
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
