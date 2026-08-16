import type { Course } from "./types";

export type PrerequisiteStatus = "ok" | "unmet" | "unclear";

export interface PrerequisiteCheck {
  status: PrerequisiteStatus;
  reason: string;
}

const isY13Level = (level: string) => level === "L3" || level === "L3+";

/** Whether a Y13 course's entry requirement is met by the given picks, based
 * on the same signals the pathway graph uses:
 *  - "unmet": the course names specific prerequisite code(s) or accepts a
 *    general subject category, and none of the picks satisfy either.
 *  - "unclear": the prospectus doesn't explicitly require anything (no
 *    named code, no category) but a same-subject Y12 course exists and
 *    wasn't picked — the "implied prerequisite gap" the detail panel
 *    already flags. Softer than "unmet": the course may still be enterable.
 *  - "ok": either no prerequisite signal applies (e.g. "Open" entry), or
 *    at least one pick satisfies it.
 *
 * A named prerequisite that is itself a Y13 (L3/L3+) course is a
 * co-enrolment requirement (e.g. DTE355 "Successful completion of or
 * co-enrolment in CSC335"), not a Y12 lead-in — those are checked against
 * the current Y13 picks instead.
 */
export function checkPrerequisite(
  course: Course,
  y12Picks: Set<string>,
  courseByCode: Map<string, Course>,
  y13Picks: Set<string> = new Set()
): PrerequisiteCheck {
  if (course.level !== "L3" && course.level !== "L3+") {
    return { status: "ok", reason: "" };
  }

  const hasExplicit = course.explicit_prerequisites.length > 0;
  const hasCategory = !!course.alternative_faculty;

  if (hasExplicit || hasCategory) {
    const explicitMet = course.explicit_prerequisites.some((code) => {
      const prereqCourse = courseByCode.get(code);
      const picks = prereqCourse && isY13Level(prereqCourse.level) ? y13Picks : y12Picks;
      return picks.has(code);
    });
    const categoryMet =
      hasCategory &&
      Array.from(y12Picks).some(
        (code) => courseByCode.get(code)?.faculty === course.alternative_faculty
      );
    if (explicitMet || categoryMet) {
      return { status: "ok", reason: "" };
    }
    const named = course.explicit_prerequisites.join(", ");
    const anyCoEnrolment = course.explicit_prerequisites.some((code) =>
      isY13Level(courseByCode.get(code)?.level ?? "")
    );
    const yearWord = anyCoEnrolment ? "co-enrolled Y13" : "Y12";
    const reason = hasExplicit
      ? `Requires ${named}${hasCategory ? ` (or another ${course.alternative_category})` : ""} — not in the current ${yearWord} picks.`
      : `Requires a Level 2 ${course.alternative_category} course — not in the current Y12 picks.`;
    return { status: "unmet", reason };
  }

  if (course.implied_prerequisite && !y12Picks.has(course.implied_prerequisite)) {
    const gap = courseByCode.get(course.implied_prerequisite);
    return {
      status: "unclear",
      reason: `The prospectus doesn't state a Y12 prerequisite, but ${course.implied_prerequisite}${
        gap ? ` (${gap.title})` : ""
      } is the usual lead-in and isn't in the current Y12 picks.`,
    };
  }

  return { status: "ok", reason: "" };
}
