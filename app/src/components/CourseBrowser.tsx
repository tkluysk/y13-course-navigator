import { useMemo, useState } from "react";
import type { Course } from "../types";

interface Props {
  courses: Course[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
}

export default function CourseBrowser({ courses, selectedCode, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [facultyFilter, setFacultyFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("L3");

  const faculties = useMemo(
    () =>
      Array.from(new Set(courses.map((c) => c.faculty).filter(Boolean))).sort() as string[],
    [courses]
  );

  const levels = useMemo(
    () => Array.from(new Set(courses.map((c) => c.level))).sort(),
    [courses]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((c) => {
      if (facultyFilter !== "all" && c.faculty !== facultyFilter) return false;
      // A search query narrows results enough on its own — don't also let
      // the level filter silently hide matches like DTE355 (level "L3+").
      if (!q && levelFilter !== "all" && c.level !== levelFilter) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    });
  }, [courses, query, facultyFilter, levelFilter]);

  return (
    <div className="browser">
      <div className="browser-controls">
        <input
          type="search"
          placeholder="Search courses…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
          <option value="all">All levels</option>
          {levels.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select value={facultyFilter} onChange={(e) => setFacultyFilter(e.target.value)}>
          <option value="all">All faculties</option>
          {faculties.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <ul className="browser-list">
        {filtered.map((c) => (
          <li key={c.code}>
            <button
              className={
                "browser-row" + (selectedCode === c.code ? " selected" : "")
              }
              onClick={() => onSelect(c.code)}
            >
              <span className="browser-code">{c.code}</span>
              <span className="browser-title">{c.title}</span>
              <span className="browser-faculty">{c.faculty}</span>
              <span className="browser-badges">
                {c.ue && <span className="badge ue">UE</span>}
                {c.scholarship && <span className="badge schol">SCHOL</span>}
              </span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="no-results">No courses match.</li>}
      </ul>
    </div>
  );
}
