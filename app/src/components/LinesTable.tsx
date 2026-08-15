import type { Course, LineDefinition } from "../types";
import type { PrerequisiteCheck } from "../prerequisiteCheck";
import BookmarkIcon from "./BookmarkIcon";
import NotInterestedIcon from "./NotInterestedIcon";
import WarningIcon from "./WarningIcon";

interface Props {
  lines: LineDefinition[];
  courseByCode: Map<string, Course>;
  selectedCode: string | null;
  onSelect: (code: string) => void;
  currentPicks: Record<number, string | null>;
  editable?: boolean;
  locked?: boolean;
  onTogglePick?: (line: number, code: string) => void;
  bookmarks?: Set<string>;
  notInterested?: Set<string>;
  onToggleNotInterested?: (code: string) => void;
  prereqStatusByCode?: Map<string, PrerequisiteCheck>;
  hint?: string;
}

function facultyClass(faculty: string | null): string {
  if (!faculty) return "fac-other";
  return "fac-" + faculty.toLowerCase().replace(/[^a-z]+/g, "-");
}

export default function LinesTable({
  lines,
  courseByCode,
  selectedCode,
  onSelect,
  currentPicks,
  editable = false,
  locked = false,
  onTogglePick,
  bookmarks,
  notInterested,
  onToggleNotInterested,
  prereqStatusByCode,
  hint,
}: Props) {
  const maxRows = Math.max(...lines.map((l) => l.codes.length));

  return (
    <div className="lines-table-wrap">
      <p className="hint">
        {hint ??
          `Choose minimum 5 courses, at most 1 per column.${
            locked
              ? " This scenario is locked — unlock it to change picks."
              : editable
                ? " Click the star on a chip to pick it for this scenario."
                : ""
          }`}
      </p>
      <div className="lines-table-scroll">
        <table className="lines-table">
          <thead>
            <tr>
              {lines.map((l) => {
                const pick = currentPicks[l.line];
                const pickCourse = pick ? courseByCode.get(pick) : null;
                return (
                  <th key={l.line}>
                    <div className="line-head">Line {l.line}</div>
                    <div className="line-pick">
                      {pickCourse ? (
                        <span className="pick-badge" title={pickCourse.title}>
                          {pickCourse.code}
                        </span>
                      ) : (
                        <span className="pick-badge empty">not chosen</span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, rowIdx) => (
              <tr key={rowIdx}>
                {lines.map((l) => {
                  const code = l.codes[rowIdx];
                  if (!code) return <td key={l.line} className="empty-cell" />;
                  const course = courseByCode.get(code);
                  const isSelected = selectedCode === code;
                  const isPick = currentPicks[l.line] === code;
                  const isBookmarked = bookmarks?.has(code);
                  const isNotInterested = notInterested?.has(code);
                  const prereq = prereqStatusByCode?.get(code);
                  return (
                    <td key={l.line}>
                      <div
                        className={
                          "course-chip " +
                          facultyClass(course?.faculty ?? null) +
                          (isSelected ? " selected" : "") +
                          (isPick ? " current-pick" : "") +
                          (isNotInterested ? " not-interested" : "")
                        }
                        title={course?.title ?? "Placeholder slot — not in prospectus"}
                      >
                        <button
                          type="button"
                          className="chip-main"
                          onClick={() => onSelect(code)}
                        >
                          <span className="chip-code">{code}</span>
                          {course ? (
                            <span className="chip-title">{course.title}</span>
                          ) : (
                            <span className="chip-title">Other (see school)</span>
                          )}
                        </button>
                        {prereq && prereq.status !== "ok" && (
                          <span
                            className={"chip-warning chip-warning-" + prereq.status}
                            title={prereq.reason}
                          >
                            <WarningIcon size={12} />
                          </span>
                        )}
                        {isBookmarked && (
                          <BookmarkIcon filled size={11} className="chip-bookmark" />
                        )}
                        {course && (
                          <button
                            type="button"
                            className={"chip-not-interested-btn" + (isNotInterested ? " active" : "")}
                            onClick={() => onToggleNotInterested?.(code)}
                            title={
                              isNotInterested
                                ? "Mark as interested again"
                                : "Mark as not interested"
                            }
                            aria-pressed={isNotInterested}
                          >
                            <NotInterestedIcon size={12} />
                          </button>
                        )}
                        {editable ? (
                          <button
                            type="button"
                            className={"chip-star-btn" + (isPick ? " active" : "")}
                            onClick={() => !locked && onTogglePick?.(l.line, code)}
                            disabled={locked}
                            title={
                              locked
                                ? "Scenario is locked"
                                : isPick
                                  ? "Unpick for this scenario"
                                  : "Pick for this scenario"
                            }
                            aria-pressed={isPick}
                          >
                            {isPick ? "★" : "☆"}
                          </button>
                        ) : (
                          isPick && <span className="pick-star">★</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
