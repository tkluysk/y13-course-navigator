import type { ReactNode } from "react";
import type { Course } from "../types";
import type { PathwayLinks } from "../pathways";

interface Props {
  course: Course | null;
  courseByCode: Map<string, Course>;
  unresolvedCode?: string | null;
  links?: PathwayLinks | null;
  onSelectCode?: (code: string) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (code: string) => void;
}

const CODE_RE = /\b[A-Z]{2,4}\d{3}(?:\/[A-Z]{2,4}\d{3}\*?)?\b/g;

function linkifyCodes(
  text: string,
  courseByCode: Map<string, Course>,
  onSelectCode?: (code: string) => void
) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(CODE_RE);
  while ((match = re.exec(text)) !== null) {
    const code = match[0].replace(/\*$/, "");
    const known = courseByCode.has(code);
    if (known) {
      parts.push(text.slice(lastIndex, match.index));
      parts.push(
        <button
          type="button"
          className="code-ref"
          key={match.index}
          onClick={() => onSelectCode?.(code)}
        >
          {match[0]}
        </button>
      );
      lastIndex = match.index + match[0].length;
    }
  }
  parts.push(text.slice(lastIndex));
  return parts;
}

function CourseChipList({
  courses,
  onSelectCode,
}: {
  courses: Course[];
  onSelectCode?: (code: string) => void;
}) {
  return (
    <ul className="link-list">
      {courses.map((c) => (
        <li key={c.code}>
          <button
            type="button"
            className="link-chip"
            onClick={() => onSelectCode?.(c.code)}
          >
            <span className="link-chip-code">{c.code}</span>
            <span className="link-chip-title">{c.title}</span>
            <span className="link-chip-level">{c.level}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function CourseDetail({
  course,
  courseByCode,
  unresolvedCode,
  links,
  onSelectCode,
  isBookmarked,
  onToggleBookmark,
}: Props) {
  if (!course) {
    return (
      <div className="detail empty-state">
        {unresolvedCode ? (
          <p>
            <strong>{unresolvedCode}</strong> is a timetable-line placeholder
            (e.g. STAR, Gateway, or a Learning Services umbrella code) not
            individually described in the course prospectus — check with
            the relevant faculty or Pathways team for details.
          </p>
        ) : (
          <p>Select a course to see its full summary.</p>
        )}
      </div>
    );
  }

  const impliedGap = course.implied_prerequisite
    ? courseByCode.get(course.implied_prerequisite)
    : null;

  return (
    <div className="detail">
      <div className="detail-header">
        <div className="detail-code-row">
          <span className="detail-level">{course.level}</span>
          <span className="detail-code">{course.code}</span>
          {course.ue && <span className="badge ue">UE</span>}
          {course.scholarship && <span className="badge schol">SCHOL</span>}
          <button
            type="button"
            className={"bookmark-btn" + (isBookmarked ? " active" : "")}
            onClick={() => onToggleBookmark?.(course.code)}
            title={isBookmarked ? "Remove bookmark" : "Bookmark this course"}
            aria-pressed={isBookmarked}
          >
            {isBookmarked ? "★" : "☆"}
          </button>
        </div>
        <h2>{course.title}</h2>
        {course.faculty && (
          <p className="detail-faculty">
            {course.faculty}
            {course.also_listed_under.length > 0 &&
              ` (also listed under ${course.also_listed_under.join(", ")})`}
          </p>
        )}
      </div>

      {impliedGap && (
        <section className="gap-warning">
          <strong>No stated prerequisite in the prospectus text.</strong> A
          Level 2 course in the same subject exists (
          <button
            type="button"
            className="code-ref"
            onClick={() => onSelectCode?.(impliedGap.code)}
          >
            {impliedGap.code}
          </button>
          {" "}
          {impliedGap.title}) but the entry requirement for {course.code}{" "}
          doesn't name it or a general Level 2 credit category — check with
          the department whether it's expected.
        </section>
      )}

      {links && links.upstream.length > 0 && (
        <section>
          <h3>Leads in from (prior-year courses)</h3>
          <CourseChipList courses={links.upstream} onSelectCode={onSelectCode} />
        </section>
      )}

      {course.description && (
        <section>
          <p className="detail-description">{course.description}</p>
        </section>
      )}

      {course.pathway && (
        <section>
          <h3>Pathway</h3>
          <p>{linkifyCodes(course.pathway, courseByCode, onSelectCode)}</p>
        </section>
      )}

      {links && links.downstream.length > 0 && (
        <section>
          <h3>Leads on to</h3>
          <CourseChipList courses={links.downstream} onSelectCode={onSelectCode} />
        </section>
      )}

      {course.components.length > 0 && (
        <section>
          <h3>Course components</h3>
          <ul className="components-list">
            {course.components.map((comp, i) => (
              <li key={i}>{comp}</li>
            ))}
          </ul>
        </section>
      )}

      {(course.external_credits !== null || course.internal_credits !== null) && (
        <section className="credits-grid">
          <div>
            <span className="credit-num">{course.external_credits ?? "–"}</span>
            <span className="credit-label">External credits</span>
          </div>
          <div>
            <span className="credit-num">{course.internal_credits ?? "–"}</span>
            <span className="credit-label">Internal credits</span>
          </div>
          <div>
            <span className="credit-num">
              {(course.external_credits ?? 0) + (course.internal_credits ?? 0)}
            </span>
            <span className="credit-label">Total credits</span>
          </div>
        </section>
      )}

      {(course.entry_text || course.donation_text || course.donation_amount) && (
        <section>
          <h3>Donation &amp; entry</h3>
          <dl className="info-list">
            {course.donation_amount && (
              <div>
                <dt>Donation</dt>
                <dd>
                  {course.donation_amount}
                  {course.donation_text && ` — ${course.donation_text}`}
                </dd>
              </div>
            )}
            {course.entry_text && (
              <div>
                <dt>Entry requirement</dt>
                <dd>{linkifyCodes(course.entry_text, courseByCode, onSelectCode)}</dd>
              </div>
            )}
          </dl>
        </section>
      )}
    </div>
  );
}
