import type { Course } from "./types";

const CODE_RE = /\b[A-Z]{2,4}\d{3}(?:\/[A-Z]{2,4}\d{3})?\*?\b/g;

function codesMentionedIn(text: string, courseByCode: Map<string, Course>): string[] {
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(CODE_RE);
  while ((match = re.exec(text)) !== null) {
    const code = match[0].replace(/\*$/, "");
    if (courseByCode.has(code)) found.add(code);
  }
  return Array.from(found);
}

export interface PathwayLinks {
  downstream: Course[]; // this course's pathway text leads to these
  upstream: Course[]; // other courses whose pathway text names this course
}

/** Precompute, for every course, which other courses reference it in their
 * "pathway" text (upstream = prerequisite-ish, points at this course from
 * elsewhere) vs which courses this course's own pathway text points to
 * (downstream = where this course leads). */
export function buildPathwayIndex(courses: Course[]): Map<string, PathwayLinks> {
  const courseByCode = new Map(courses.map((c) => [c.code, c]));
  const index = new Map<string, PathwayLinks>();
  for (const c of courses) {
    index.set(c.code, { downstream: [], upstream: [] });
  }

  for (const c of courses) {
    const mentioned = codesMentionedIn(c.pathway, courseByCode).filter(
      (code) => code !== c.code
    );
    for (const code of mentioned) {
      index.get(c.code)!.downstream.push(courseByCode.get(code)!);
      index.get(code)!.upstream.push(c);
    }
  }

  return index;
}

export type EdgeKind = "pathway" | "prerequisite" | "gap" | "alternative";

// Higher wins when two edges exist for the same course pair — a stated
// entry requirement (with its credit count) is more informative than a
// generic "leads to" pathway-text mention of the same pair.
const EDGE_PRIORITY: Record<EdgeKind, number> = {
  prerequisite: 3,
  gap: 2,
  alternative: 1,
  pathway: 0,
};

/** A single real course, or a synthetic "any of these Y12 courses" group
 * (used for "or another Social Science" style alternative pathways, so the
 * graph shows one node instead of one per sibling course). */
export type GraphEndpoint =
  | { type: "course"; course: Course }
  | { type: "group"; id: string; label: string; members: Course[] };

export function endpointKey(e: GraphEndpoint): string {
  return e.type === "course" ? e.course.code : e.id;
}

export interface GraphEdge {
  from: GraphEndpoint;
  to: GraphEndpoint;
  kind: EdgeKind;
  requiredCredits: number | null;
  label: string;
}

export interface GraphNode {
  endpoint: GraphEndpoint;
  role: "center" | "upstream" | "downstream";
}

export interface PathwayGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function subjectPrefix(code: string): string {
  return code.match(/^[A-Z]+/)?.[0] ?? code;
}

/** Build the direct-neighbor graph (Y12 <-> Y13, one hop) for a selected
 * course, combining three independent signals from the prospectus:
 *  - "pathway" prose (e.g. "This course can lead to BIO335")
 *  - the structured entry-requirement extraction (explicit prerequisite
 *    codes + credit counts, and unstated-prerequisite gaps like FIN330)
 *  - a general "or another <Faculty>" alternative pathway (e.g. CLS335
 *    accepting credits from any Level 2 Social Science, not just CLE223) —
 *    resolved against every other Y12 course in the same faculty and
 *    collapsed into a single grouped node so the graph stays readable.
 * When more than one signal links the same pair, the richer one (credits >
 * gap > general alternative > bare pathway mention) is kept. */
export function buildCourseGraph(
  code: string,
  courseByCode: Map<string, Course>,
  pathwayIndex: Map<string, PathwayLinks>
): PathwayGraph | null {
  const center = courseByCode.get(code);
  if (!center) return null;

  const links = pathwayIndex.get(code) ?? { upstream: [], downstream: [] };
  const nodesByKey = new Map<string, GraphNode>();
  const edgeByKey = new Map<string, GraphEdge>();

  const centerEndpoint: GraphEndpoint = { type: "course", course: center };

  const addEdge = (
    from: GraphEndpoint,
    to: GraphEndpoint,
    kind: EdgeKind,
    requiredCredits: number | null,
    label: string
  ) => {
    const key = `${endpointKey(from)}->${endpointKey(to)}`;
    const existing = edgeByKey.get(key);
    if (existing && EDGE_PRIORITY[existing.kind] >= EDGE_PRIORITY[kind]) return;
    edgeByKey.set(key, { from, to, kind, requiredCredits, label });
  };

  const addNode = (endpoint: GraphEndpoint, role: GraphNode["role"]) => {
    const key = endpointKey(endpoint);
    if (!nodesByKey.has(key)) nodesByKey.set(key, { endpoint, role });
  };

  addNode(centerEndpoint, "center");

  // Pathway-prose links (forward = pathway text of an earlier course
  // mentions a later one it leads to). Added first — lowest priority, so
  // a richer entry-requirement edge for the same pair overrides it below.
  for (const up of links.upstream) {
    const ep: GraphEndpoint = { type: "course", course: up };
    addNode(ep, "upstream");
    addEdge(ep, centerEndpoint, "pathway", null, "leads to");
  }
  for (const down of links.downstream) {
    const ep: GraphEndpoint = { type: "course", course: down };
    addNode(ep, "downstream");
    addEdge(centerEndpoint, ep, "pathway", null, "leads to");
  }

  const prereqLabel = (creditedCourse: Course) =>
    creditedCourse.required_credits
      ? `${creditedCourse.required_credits}+ credits`
      : "prerequisite";

  // Entry-requirement links when center is the L3(+) side.
  if (center.level === "L3" || center.level === "L3+") {
    for (const prereqCode of center.explicit_prerequisites) {
      const prereq = courseByCode.get(prereqCode);
      if (!prereq) continue;
      const ep: GraphEndpoint = { type: "course", course: prereq };
      addNode(ep, "upstream");
      addEdge(ep, centerEndpoint, "prerequisite", center.required_credits, prereqLabel(center));
    }
    if (center.implied_prerequisite) {
      const gap = courseByCode.get(center.implied_prerequisite);
      if (gap) {
        const ep: GraphEndpoint = { type: "course", course: gap };
        addNode(ep, "upstream");
        addEdge(ep, centerEndpoint, "gap", null, "same subject — not required");
      }
    }
    if (center.alternative_category && center.alternative_faculty) {
      // Exclude L2 courses already covered by an explicit-prerequisite edge
      // above (e.g. CLE223 for CLS335) so the group doesn't duplicate them.
      const alreadyLinkedSubjects = new Set(
        center.explicit_prerequisites.map((c) => subjectPrefix(c))
      );
      alreadyLinkedSubjects.add(subjectPrefix(center.code));
      const members = Array.from(courseByCode.values()).filter(
        (o) =>
          o.level === "L2" &&
          o.faculty === center.alternative_faculty &&
          !alreadyLinkedSubjects.has(subjectPrefix(o.code))
      );
      if (members.length > 0) {
        const label = center.required_credits
          ? `${center.required_credits}+ credits (any ${center.alternative_category})`
          : `any ${center.alternative_category}`;
        const group: GraphEndpoint = {
          type: "group",
          id: `alt:${center.alternative_faculty}:L2:${center.code}`,
          label: `Any other L2 ${center.alternative_category}`,
          members,
        };
        addNode(group, "upstream");
        addEdge(group, centerEndpoint, "alternative", center.required_credits, label);
      }
    }
  }

  // When center is L2: find L3 courses whose prerequisite fields point
  // back at it, including as a general same-faculty alternative (grouped
  // into one "accepts any Y13 <faculty> course" node rather than one edge
  // per L3 course). Multiple different alternative faculties are possible
  // (e.g. a Maths course could be named by both a Social Sciences course
  // and a Technology course), so group per matched faculty, not globally.
  if (center.level === "L2") {
    const altGroups = new Map<string, { members: Course[]; label: string; credits: number | null }>();

    for (const other of courseByCode.values()) {
      if (other.level !== "L3" && other.level !== "L3+") continue;
      if (other.explicit_prerequisites.includes(center.code)) {
        const ep: GraphEndpoint = { type: "course", course: other };
        addNode(ep, "downstream");
        addEdge(centerEndpoint, ep, "prerequisite", other.required_credits, prereqLabel(other));
      } else if (other.implied_prerequisite === center.code) {
        const ep: GraphEndpoint = { type: "course", course: other };
        addNode(ep, "downstream");
        addEdge(centerEndpoint, ep, "gap", null, "same subject — not required");
      } else if (
        other.alternative_category &&
        other.alternative_faculty === center.faculty &&
        subjectPrefix(other.code) !== subjectPrefix(center.code)
      ) {
        const key = other.alternative_faculty ?? "";
        const label = other.required_credits
          ? `${other.required_credits}+ credits (any ${other.alternative_category})`
          : `any ${other.alternative_category}`;
        const entry = altGroups.get(key) ?? { members: [], label, credits: other.required_credits };
        entry.members.push(other);
        altGroups.set(key, entry);
      }
    }

    for (const [facultyKey, { members, label, credits }] of altGroups) {
      const group: GraphEndpoint = {
        type: "group",
        id: `alt:${facultyKey}:L3:${center.code}`,
        label: `Any other L3 ${facultyKey}`.trim(),
        members,
      };
      addNode(group, "downstream");
      addEdge(centerEndpoint, group, "alternative", credits, label);
    }
  }

  return { nodes: Array.from(nodesByKey.values()), edges: Array.from(edgeByKey.values()) };
}
