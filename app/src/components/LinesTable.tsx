import type { Course, LineDefinition } from "../types";

interface Props {
  lines: LineDefinition[];
  courseByCode: Map<string, Course>;
  selectedCode: string | null;
  onSelect: (code: string) => void;
  currentPicks: Record<number, string | null>;
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
}: Props) {
  const maxRows = Math.max(...lines.map((l) => l.codes.length));

  return (
    <div className="lines-table-wrap">
      <p className="hint">
        Choose 5 courses total, at most one per line. Highlighted chips are
        the current picks from the planning sheet.
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
                  return (
                    <td key={l.line}>
                      <button
                        className={
                          "course-chip " +
                          facultyClass(course?.faculty ?? null) +
                          (isSelected ? " selected" : "") +
                          (isPick ? " current-pick" : "")
                        }
                        onClick={() => onSelect(code)}
                        title={course?.title ?? "STAR / placeholder slot — not in prospectus"}
                      >
                        <span className="chip-code">{code}</span>
                        {course ? (
                          <span className="chip-title">{course.title}</span>
                        ) : (
                          <span className="chip-title">STAR / other (see school)</span>
                        )}
                        {isPick && <span className="pick-star">★</span>}
                      </button>
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
