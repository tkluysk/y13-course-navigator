import type { Course, LineDefinition } from "../types";
import BookmarkIcon from "./BookmarkIcon";

interface Props {
  lines: LineDefinition[];
  courseByCode: Map<string, Course>;
  selectedCode: string | null;
  onSelect: (code: string) => void;
  currentPicks: Record<number, string | null>;
  editable?: boolean;
  onTogglePick?: (line: number, code: string) => void;
  bookmarks?: Set<string>;
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
  onTogglePick,
  bookmarks,
  hint,
}: Props) {
  const maxRows = Math.max(...lines.map((l) => l.codes.length));

  return (
    <div className="lines-table-wrap">
      <p className="hint">
        {hint ??
          `Choose 5 courses, at most one per column.${
            editable ? " Click the star on a chip to pick it for this scenario." : ""
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
                  return (
                    <td key={l.line}>
                      <div
                        className={
                          "course-chip " +
                          facultyClass(course?.faculty ?? null) +
                          (isSelected ? " selected" : "") +
                          (isPick ? " current-pick" : "")
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
                        {isBookmarked && (
                          <BookmarkIcon filled size={11} className="chip-bookmark" />
                        )}
                        {editable ? (
                          <button
                            type="button"
                            className={"chip-star-btn" + (isPick ? " active" : "")}
                            onClick={() => onTogglePick?.(l.line, code)}
                            title={isPick ? "Unpick for this scenario" : "Pick for this scenario"}
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
