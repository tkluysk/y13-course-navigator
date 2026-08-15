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

export type EdgeKind = "pathway" | "prerequisite" | "gap";

export interface GraphEdge {
  from: Course; // earlier/prerequisite course
  to: Course; // later course the edge leads into
  kind: EdgeKind;
  requiredCredits: number | null;
  label: string;
}

export interface GraphNode {
  course: Course;
  role: "center" | "upstream" | "downstream";
}

export interface PathwayGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Build the direct-neighbor graph (Y12 <-> Y13, one hop) for a selected
 * course, combining two independent signals from the prospectus:
 *  - "pathway" prose (e.g. "This course can lead to BIO335")
 *  - the structured entry-requirement extraction (explicit prerequisite
 *    codes + credit counts, and unstated-prerequisite gaps like FIN330).
 * Edges carry the required-credit count when the entry text states one. */
export function buildCourseGraph(
  code: string,
  courseByCode: Map<string, Course>,
  pathwayIndex: Map<string, PathwayLinks>
): PathwayGraph | null {
  const center = courseByCode.get(code);
  if (!center) return null;

  const links = pathwayIndex.get(code) ?? { upstream: [], downstream: [] };
  const nodesByCode = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const edgeKey = new Set<string>();

  const addEdge = (from: Course, to: Course, kind: EdgeKind, requiredCredits: number | null, label: string) => {
    const key = `${from.code}->${to.code}`;
    if (edgeKey.has(key)) return;
    edgeKey.add(key);
    edges.push({ from, to, kind, requiredCredits, label });
  };

  const addNode = (course: Course, role: GraphNode["role"]) => {
    if (!nodesByCode.has(course.code)) nodesByCode.set(course.code, { course, role });
  };

  addNode(center, "center");

  // Pathway-prose links (forward = pathway text of an earlier course
  // mentions a later one it leads to).
  for (const up of links.upstream) {
    addNode(up, "upstream");
    addEdge(up, center, "pathway", null, "leads to");
  }
  for (const down of links.downstream) {
    addNode(down, "downstream");
    addEdge(center, down, "pathway", null, "leads to");
  }

  // Entry-requirement links, from either side.
  if (center.level === "L3" || center.level === "L3+") {
    for (const prereqCode of center.explicit_prerequisites) {
      const prereq = courseByCode.get(prereqCode);
      if (!prereq) continue;
      addNode(prereq, "upstream");
      addEdge(
        prereq,
        center,
        "prerequisite",
        center.required_credits,
        center.required_credits ? `${center.required_credits}+ credits` : "prerequisite"
      );
    }
    if (center.implied_prerequisite) {
      const gap = courseByCode.get(center.implied_prerequisite);
      if (gap) {
        addNode(gap, "upstream");
        addEdge(gap, center, "gap", null, "same subject — not required");
      }
    }
  }
  // Courses at L2 that name `code` as their own explicit/implied prerequisite
  // target (i.e. this IS the L3 side for some other course's requirement) —
  // already covered above when center is L3. When center is L2, find L3
  // courses whose prerequisite fields point back at it.
  if (center.level === "L2") {
    for (const other of courseByCode.values()) {
      if (other.level !== "L3" && other.level !== "L3+") continue;
      if (other.explicit_prerequisites.includes(center.code)) {
        addNode(other, "downstream");
        addEdge(
          center,
          other,
          "prerequisite",
          other.required_credits,
          other.required_credits ? `${other.required_credits}+ credits` : "prerequisite"
        );
      } else if (other.implied_prerequisite === center.code) {
        addNode(other, "downstream");
        addEdge(center, other, "gap", null, "same subject — not required");
      }
    }
  }

  return { nodes: Array.from(nodesByCode.values()), edges };
}
