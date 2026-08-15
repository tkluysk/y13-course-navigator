import { useMemo, useState } from "react";
import coursesData from "./data/courses.json";
import { LINES, CURRENT_PICKS } from "./data/lines";
import type { Course } from "./types";
import LinesTable from "./components/LinesTable";
import CourseBrowser from "./components/CourseBrowser";
import CourseDetail from "./components/CourseDetail";
import "./App.css";

const courses = coursesData as Course[];

type View = "lines" | "browse";

function App() {
  const [selectedCode, setSelectedCode] = useState<string | null>(
    CURRENT_PICKS[1] ?? null
  );
  const [view, setView] = useState<View>("lines");

  const courseByCode = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of courses) map.set(c.code, c);
    return map;
  }, []);

  const selectedCourse = selectedCode ? courseByCode.get(selectedCode) ?? null : null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-title">
          <h1>Y13 Course Navigator</h1>
          <p className="subtitle">
            NCEA Level 3 2027 &middot; Wellington High School
          </p>
        </div>
        <nav className="view-toggle" aria-label="View">
          <button
            className={view === "lines" ? "active" : ""}
            onClick={() => setView("lines")}
          >
            Planning lines
          </button>
          <button
            className={view === "browse" ? "active" : ""}
            onClick={() => setView("browse")}
          >
            Browse all courses
          </button>
        </nav>
      </header>

      <main className="app-main">
        <div className="panel-left">
          {view === "lines" ? (
            <LinesTable
              lines={LINES}
              courseByCode={courseByCode}
              selectedCode={selectedCode}
              onSelect={setSelectedCode}
              currentPicks={CURRENT_PICKS}
            />
          ) : (
            <CourseBrowser
              courses={courses}
              selectedCode={selectedCode}
              onSelect={setSelectedCode}
            />
          )}
        </div>
        <div className="panel-right">
          <CourseDetail
            course={selectedCourse}
            courseByCode={courseByCode}
            unresolvedCode={!selectedCourse ? selectedCode : null}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
