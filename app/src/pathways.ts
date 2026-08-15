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
