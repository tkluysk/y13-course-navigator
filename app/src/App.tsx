import { useMemo, useState } from "react";
import coursesData from "./data/courses.json";
import {
  LINES,
  CURRENT_PICKS,
  LINES_Y12,
  CURRENT_PICKS_Y12,
} from "./data/lines";
import type { Course } from "./types";
import { buildPathwayIndex } from "./pathways";
import LinesTable from "./components/LinesTable";
import CourseBrowser from "./components/CourseBrowser";
import CourseDetail from "./components/CourseDetail";
import "./App.css";

const courses = coursesData as Course[];

type View = "lines13" | "lines12" | "browse";

function App() {
  const [selectedCode, setSelectedCode] = useState<string | null>(
    CURRENT_PICKS[1] ?? null
  );
  const [view, setView] = useState<View>("lines13");

  const courseByCode = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of courses) map.set(c.code, c);
    return map;
  }, []);

  const pathwayIndex = useMemo(() => buildPathwayIndex(courses), []);

  const selectedCourse = selectedCode ? courseByCode.get(selectedCode) ?? null : null;
  const selectedLinks = selectedCode ? pathwayIndex.get(selectedCode) ?? null : null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-title">
          <h1>Course Navigator</h1>
          <p className="subtitle">
            NCEA Levels 2 &amp; 3 &middot; Wellington High School
          </p>
        </div>
        <nav className="view-toggle" aria-label="View">
          <button
            className={view === "lines13" ? "active" : ""}
            onClick={() => setView("lines13")}
          >
            Y13 planning lines
          </button>
          <button
            className={view === "lines12" ? "active" : ""}
            onClick={() => setView("lines12")}
          >
            Y12 planning lines
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
          {view === "lines13" && (
            <LinesTable
              lines={LINES}
              courseByCode={courseByCode}
              selectedCode={selectedCode}
              onSelect={setSelectedCode}
              currentPicks={CURRENT_PICKS}
            />
          )}
          {view === "lines12" && (
            <LinesTable
              lines={LINES_Y12}
              courseByCode={courseByCode}
              selectedCode={selectedCode}
              onSelect={setSelectedCode}
              currentPicks={CURRENT_PICKS_Y12}
            />
          )}
          {view === "browse" && (
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
            links={selectedLinks}
            onSelectCode={setSelectedCode}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
