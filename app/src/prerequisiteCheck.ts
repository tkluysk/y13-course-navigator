import type { Course } from "./types";

export type PrerequisiteStatus = "ok" | "unmet" | "unclear";

export interface PrerequisiteCheck {
  status: PrerequisiteStatus;
  reason: string;
}

/** Whether a Y13 course's entry requirement is met by the given set of Y12
 * pick codes, based on the same signals the pathway graph uses:
 *  - "unmet": the course names specific prerequisite code(s) or accepts a
 *    general subject category, and none of the Y12 picks satisfy either.
 *  - "unclear": the prospectus doesn't explicitly require anything (no
 *    named code, no category) but a same-subject Y12 course exists and
 *    wasn't picked — the "implied prerequisite gap" the detail panel
 *    already flags. Softer than "unmet": the course may still be enterable.
 *  - "ok": either no prerequisite signal applies (e.g. "Open" entry), or
 *    at least one Y12 pick satisfies it.
 */
export function checkPrerequisite(
  course: Course,
  y12Picks: Set<string>,
  courseByCode: Map<string, Course>
): PrerequisiteCheck {
  if (course.level !== "L3" && course.level !== "L3+") {
    return { status: "ok", reason: "" };
  }

  const hasExplicit = course.explicit_prerequisites.length > 0;
  const hasCategory = !!course.alternative_faculty;

  if (hasExplicit || hasCategory) {
    const explicitMet = course.explicit_prerequisites.some((code) => y12Picks.has(code));
    const categoryMet =
      hasCategory &&
      Array.from(y12Picks).some(
        (code) => courseByCode.get(code)?.faculty === course.alternative_faculty
      );
    if (explicitMet || categoryMet) {
      return { status: "ok", reason: "" };
    }
    const named = course.explicit_prerequisites.join(", ");
    const reason = hasExplicit
      ? `Requires ${named}${hasCategory ? ` (or another ${course.alternative_category})` : ""} — not in her current Y12 picks.`
      : `Requires a Level 2 ${course.alternative_category} course — not in her current Y12 picks.`;
    return { status: "unmet", reason };
  }

  if (course.implied_prerequisite && !y12Picks.has(course.implied_prerequisite)) {
    const gap = courseByCode.get(course.implied_prerequisite);
    return {
      status: "unclear",
      reason: `The prospectus doesn't state a Y12 prerequisite, but ${course.implied_prerequisite}${
        gap ? ` (${gap.title})` : ""
      } is the usual lead-in and isn't in her current Y12 picks.`,
    };
  }

  return { status: "ok", reason: "" };
}
