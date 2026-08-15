import { useMemo, useState } from "react";
import coursesData from "./data/courses.json";
import { LINES, LINES_Y12, CURRENT_PICKS_Y12 } from "./data/lines";
import type { Course } from "./types";
import { buildPathwayIndex, buildCourseGraph } from "./pathways";
import { useLocalStorage } from "./useLocalStorage";
import { makeDefaultScenario, newScenarioId, type Scenario } from "./scenarios";
import LinesTable from "./components/LinesTable";
import CourseBrowser from "./components/CourseBrowser";
import CourseDetail from "./components/CourseDetail";
import ScenarioBar from "./components/ScenarioBar";
import BookmarksBar from "./components/BookmarksBar";
import PathwayGraphPanel from "./components/PathwayGraphPanel";
import "./App.css";

const courses = coursesData as Course[];

type View = "lines13" | "lines12" | "browse";

function App() {
  const [scenarios, setScenarios] = useLocalStorage<Scenario[]>("y13nav.scenarios", [
    makeDefaultScenario(),
  ]);
  const [activeScenarioId, setActiveScenarioId] = useLocalStorage<string>(
    "y13nav.activeScenario",
    scenarios[0]?.id ?? "actual"
  );
  const [bookmarks, setBookmarks] = useLocalStorage<string[]>("y13nav.bookmarks", []);

  const [selectedCode, setSelectedCode] = useState<string | null>(
    scenarios[0]?.picks[1] ?? null
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
  const selectedGraph = useMemo(
    () => (selectedCode ? buildCourseGraph(selectedCode, courseByCode, pathwayIndex) : null),
    [selectedCode, courseByCode, pathwayIndex]
  );

  const activeScenario =
    scenarios.find((s) => s.id === activeScenarioId) ?? scenarios[0];

  const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks]);

  const toggleBookmark = (code: string) => {
    setBookmarks((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const togglePick = (line: number, code: string) => {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id !== activeScenario.id
          ? s
          : {
              ...s,
              picks: {
                ...s.picks,
                [line]: s.picks[line] === code ? null : code,
              },
            }
      )
    );
  };

  const createScenario = (name: string) => {
    const s: Scenario = { id: newScenarioId(), name, picks: {} };
    setScenarios((prev) => [...prev, s]);
    setActiveScenarioId(s.id);
  };

  const duplicateScenario = (id: string) => {
    const source = scenarios.find((s) => s.id === id);
    if (!source) return;
    const s: Scenario = {
      id: newScenarioId(),
      name: `${source.name} copy`,
      picks: { ...source.picks },
    };
    setScenarios((prev) => [...prev, s]);
    setActiveScenarioId(s.id);
  };

  const renameScenario = (id: string, name: string) => {
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const deleteScenario = (id: string) => {
    setScenarios((prev) => {
      const next = prev.filter((s) => s.id !== id);
      return next.length > 0 ? next : [makeDefaultScenario()];
    });
    if (activeScenarioId === id) {
      const remaining = scenarios.filter((s) => s.id !== id);
      setActiveScenarioId(remaining[0]?.id ?? "actual");
    }
  };

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

      <BookmarksBar
        bookmarks={bookmarks}
        courseByCode={courseByCode}
        onSelect={setSelectedCode}
        onRemove={toggleBookmark}
      />

      {view !== "browse" && (
        <PathwayGraphPanel
          graph={selectedGraph}
          centerCode={selectedCode}
          onSelectCode={setSelectedCode}
        />
      )}

      <main className="app-main">
        <div className="panel-left">
          {view === "lines13" && (
            <>
              <ScenarioBar
                scenarios={scenarios}
                activeId={activeScenario.id}
                onSwitch={setActiveScenarioId}
                onCreate={createScenario}
                onRename={renameScenario}
                onDelete={deleteScenario}
                onDuplicate={duplicateScenario}
              />
              <LinesTable
                lines={LINES}
                courseByCode={courseByCode}
                selectedCode={selectedCode}
                onSelect={setSelectedCode}
                currentPicks={activeScenario.picks}
                editable
                onTogglePick={togglePick}
                bookmarks={bookmarkSet}
              />
            </>
          )}
          {view === "lines12" && (
            <LinesTable
              lines={LINES_Y12}
              courseByCode={courseByCode}
              selectedCode={selectedCode}
              onSelect={setSelectedCode}
              currentPicks={CURRENT_PICKS_Y12}
              bookmarks={bookmarkSet}
              hint="Her Y12 (2026) picks, for reference — read-only."
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
            isBookmarked={selectedCode ? bookmarkSet.has(selectedCode) : false}
            onToggleBookmark={toggleBookmark}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
