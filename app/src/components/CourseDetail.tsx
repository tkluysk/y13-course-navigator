import type { ReactNode } from "react";
import type { Course } from "../types";
import type { PathwayLinks } from "../pathways";
import type { PrerequisiteCheck } from "../prerequisiteCheck";
import { GLOSSARY } from "../glossary";
import BookmarkIcon from "./BookmarkIcon";
import NotInterestedIcon from "./NotInterestedIcon";
import WarningIcon from "./WarningIcon";

interface Props {
  course: Course | null;
  courseByCode: Map<string, Course>;
  unresolvedCode?: string | null;
  links?: PathwayLinks | null;
  onSelectCode?: (code: string) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (code: string) => void;
  isNotInterested?: boolean;
  onToggleNotInterested?: (code: string) => void;
  prereqStatus?: PrerequisiteCheck | null;
}

const CODE_RE = /\b[A-Z]{2,4}\d{3}(?:\/[A-Z]{2,4}\d{3}\*?)?\b/;
const GLOSSARY_RE = new RegExp(`\\b(${Object.keys(GLOSSARY).join("|")})\\b`);
const COMBINED_RE = new RegExp(`${CODE_RE.source}|${GLOSSARY_RE.source}`, "g");

const LEVEL_TITLES: Record<string, string> = {
  L1: "NCEA Level 1",
  L2: "NCEA Level 2",
  L3: "NCEA Level 3",
  "L3+": "NCEA Level 3, extension course",
  "L2-3": "Offered at NCEA Level 2 or 3",
  "Y11-13": "Offered across Years 11–13",
  "Y12-13": "Offered across Years 12–13",
  "Y11-L2-3": "Offered across Year 11, Level 2 and Level 3",
  "Pre-NCEA": "Pre-NCEA (not yet credit-bearing)",
};

function levelTitle(level: string): string {
  return LEVEL_TITLES[level] ?? level;
}

/** Single pass over free text that turns known course codes into
 * clickable links and known acronyms (CAA, NCEA, UE, HoF, TiC, ...) into
 * tooltipped <abbr> elements — combined into one regex so neither pass
 * can double-wrap something the other already touched. */
function linkifyCodes(
  text: string,
  courseByCode: Map<string, Course>,
  onSelectCode?: (code: string) => void
) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(COMBINED_RE);
  while ((match = re.exec(text)) !== null) {
    const token = match[0];
    const code = token.replace(/\*$/, "");
    parts.push(text.slice(lastIndex, match.index));
    if (GLOSSARY[token]) {
      parts.push(
        <abbr className="glossary-term" title={GLOSSARY[token]} key={match.index}>
          {token}
        </abbr>
      );
    } else if (courseByCode.has(code)) {
      parts.push(
        <button
          type="button"
          className="code-ref"
          key={match.index}
          onClick={() => onSelectCode?.(code)}
        >
          {token}
        </button>
      );
    } else {
      parts.push(token);
    }
    lastIndex = match.index + token.length;
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
  isNotInterested,
  onToggleNotInterested,
  prereqStatus,
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

  return (
    <div className="detail">
      <div className="detail-header">
        <div className="detail-code-row">
          <span className="detail-level" title={levelTitle(course.level)}>
            {course.level}
          </span>
          <span className="detail-code">{course.code}</span>
          {course.ue && (
            <span className="badge ue" title="Contributes credits towards University Entrance">
              UE
            </span>
          )}
          {course.scholarship && (
            <span className="badge schol" title="Scholarship-level examination available in this subject">
              SCHOL
            </span>
          )}
          <button
            type="button"
            className={"bookmark-btn" + (isBookmarked ? " active" : "")}
            onClick={() => onToggleBookmark?.(course.code)}
            title={isBookmarked ? "Remove bookmark" : "Bookmark this course"}
            aria-pressed={isBookmarked}
          >
            <BookmarkIcon filled={isBookmarked} size={18} />
          </button>
          <button
            type="button"
            className={"not-interested-btn" + (isNotInterested ? " active" : "")}
            onClick={() => onToggleNotInterested?.(course.code)}
            title={
              isNotInterested
                ? "Mark as interested again"
                : "Mark as not interested — greys it out everywhere"
            }
            aria-pressed={isNotInterested}
          >
            <NotInterestedIcon size={17} />
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
        {isNotInterested && (
          <p className="not-interested-note">Marked as not interested</p>
        )}
      </div>

      {prereqStatus && prereqStatus.status !== "ok" && (
        <section className={"gap-warning gap-warning-" + prereqStatus.status}>
          <WarningIcon size={14} className="gap-warning-icon" />
          <span>
            <strong>
              {prereqStatus.status === "unmet"
                ? "Entry requirement not met by her current Y12 picks."
                : "No stated prerequisite in the prospectus text."}
            </strong>{" "}
            {linkifyCodes(prereqStatus.reason, courseByCode, onSelectCode)}
          </span>
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
          <p className="detail-description">
            {linkifyCodes(course.description, courseByCode, onSelectCode)}
          </p>
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
