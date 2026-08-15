import { useEffect, useMemo, useState } from "react";
import coursesData from "./data/courses.json";
import { LINES, LINES_Y12 } from "./data/lines";
import type { Course } from "./types";
import { buildPathwayIndex, buildCourseGraph } from "./pathways";
import { checkPrerequisite } from "./prerequisiteCheck";
import { useLocalStorage } from "./useLocalStorage";
import { useUndoableState } from "./useUndoableState";
import {
  makeDefaultY13Scenarios,
  makeDefaultY12Scenarios,
  newScenarioId,
  type Scenario,
} from "./scenarios";
import LinesTable from "./components/LinesTable";
import CourseBrowser from "./components/CourseBrowser";
import CourseDetail from "./components/CourseDetail";
import ScenarioBar from "./components/ScenarioBar";
import BookmarksBar from "./components/BookmarksBar";
import PathwayGraphPanel from "./components/PathwayGraphPanel";
import "./App.css";

const courses = coursesData as Course[];

type View = "lines13" | "lines12" | "browse";

function useScenarioSet(storageKey: string, makeDefaults: () => Scenario[]) {
  const [storedScenarios, setStoredScenarios] = useLocalStorage<Scenario[]>(
    storageKey,
    makeDefaults()
  );
  const { value: scenarios, set: setScenarios, undo, canUndo } = useUndoableState(
    storedScenarios,
    setStoredScenarios
  );
  const [activeId, setActiveId] = useLocalStorage<string>(
    `${storageKey}.active`,
    scenarios[0]?.id ?? ""
  );
  const active = scenarios.find((s) => s.id === activeId) ?? scenarios[0];

  const togglePick = (line: number, code: string) => {
    setScenarios((prev) =>
      prev.map((s) => {
        if (s.id !== active.id || s.locked) return s;
        const nextPicks = { ...s.picks };
        if (nextPicks[line] === code) {
          // unpick from this line
          nextPicks[line] = null;
        } else {
          // a course can only be picked on one line at a time — clear it
          // from wherever else it's currently picked, then set it here
          for (const [otherLine, pickedCode] of Object.entries(nextPicks)) {
            if (pickedCode === code) nextPicks[Number(otherLine)] = null;
          }
          nextPicks[line] = code;
        }
        return { ...s, picks: nextPicks };
      })
    );
  };

  const create = (name: string) => {
    const s: Scenario = { id: newScenarioId(), name, picks: {} };
    setScenarios((prev) => [...prev, s]);
    setActiveId(s.id);
  };

  const duplicate = (id: string) => {
    const source = scenarios.find((s) => s.id === id);
    if (!source) return;
    const s: Scenario = {
      id: newScenarioId(),
      name: `${source.name} copy`,
      picks: { ...source.picks },
    };
    setScenarios((prev) => [...prev, s]);
    setActiveId(s.id);
  };

  const rename = (id: string, name: string) => {
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const toggleLock = (id: string) => {
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s)));
  };

  const remove = (id: string) => {
    setScenarios((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target?.locked) return prev;
      const next = prev.filter((s) => s.id !== id);
      return next.length > 0 ? next : makeDefaults();
    });
    if (activeId === id) {
      const remaining = scenarios.filter((s) => s.id !== id);
      setActiveId(remaining[0]?.id ?? makeDefaults()[0].id);
    }
  };

  return {
    scenarios,
    active,
    setActiveId,
    togglePick,
    create,
    duplicate,
    rename,
    toggleLock,
    remove,
    undo,
    canUndo,
  };
}

function App() {
  const y13 = useScenarioSet("y13nav.scenarios.y13", makeDefaultY13Scenarios);
  const y12 = useScenarioSet("y13nav.scenarios.y12", makeDefaultY12Scenarios);

  const [bookmarks, setBookmarks] = useLocalStorage<string[]>("y13nav.bookmarks", []);
  const [notInterested, setNotInterested] = useLocalStorage<string[]>(
    "y13nav.notInterested",
    []
  );

  const [selectedCode, setSelectedCode] = useState<string | null>(y13.active?.picks[1] ?? null);
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

  const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks]);
  const notInterestedSet = useMemo(() => new Set(notInterested), [notInterested]);

  const y12PickSet = useMemo(
    () => new Set(Object.values(y12.active.picks).filter((c): c is string => !!c)),
    [y12.active.picks]
  );
  const y13PickSet = useMemo(
    () => new Set(Object.values(y13.active.picks).filter((c): c is string => !!c)),
    [y13.active.picks]
  );
  const pickedSet = useMemo(
    () => new Set([...y12PickSet, ...y13PickSet]),
    [y12PickSet, y13PickSet]
  );
  const prereqStatusByCode = useMemo(() => {
    const map = new Map<string, ReturnType<typeof checkPrerequisite>>();
    for (const c of courses) {
      if (c.level === "L3" || c.level === "L3+") {
        map.set(c.code, checkPrerequisite(c, y12PickSet, courseByCode));
      }
    }
    return map;
  }, [y12PickSet, courseByCode]);

  const toggleBookmark = (code: string) => {
    setBookmarks((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleNotInterested = (code: string) => {
    setNotInterested((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (view === "lines13") {
        e.preventDefault();
        y13.undo();
      } else if (view === "lines12") {
        e.preventDefault();
        y12.undo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, y13, y12]);

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
          pickedCodes={pickedSet}
          bookmarkedCodes={bookmarkSet}
          notInterestedCodes={notInterestedSet}
          prereqStatusByCode={prereqStatusByCode}
        />
      )}

      <main className="app-main">
        <div className="panel-left">
          {view === "lines13" && (
            <>
              <ScenarioBar
                scenarios={y13.scenarios}
                activeId={y13.active.id}
                onSwitch={y13.setActiveId}
                onCreate={y13.create}
                onRename={y13.rename}
                onDelete={y13.remove}
                onDuplicate={y13.duplicate}
                onToggleLock={y13.toggleLock}
                onUndo={y13.undo}
                canUndo={y13.canUndo}
              />
              <LinesTable
                lines={LINES}
                courseByCode={courseByCode}
                selectedCode={selectedCode}
                onSelect={setSelectedCode}
                currentPicks={y13.active.picks}
                editable
                locked={y13.active.locked}
                onTogglePick={y13.togglePick}
                bookmarks={bookmarkSet}
                notInterested={notInterestedSet}
                onToggleNotInterested={toggleNotInterested}
                prereqStatusByCode={prereqStatusByCode}
              />
            </>
          )}
          {view === "lines12" && (
            <>
              <ScenarioBar
                scenarios={y12.scenarios}
                activeId={y12.active.id}
                onSwitch={y12.setActiveId}
                onCreate={y12.create}
                onRename={y12.rename}
                onDelete={y12.remove}
                onDuplicate={y12.duplicate}
                onToggleLock={y12.toggleLock}
                onUndo={y12.undo}
                canUndo={y12.canUndo}
              />
              <LinesTable
                lines={LINES_Y12}
                courseByCode={courseByCode}
                selectedCode={selectedCode}
                onSelect={setSelectedCode}
                currentPicks={y12.active.picks}
                editable
                locked={y12.active.locked}
                onTogglePick={y12.togglePick}
                bookmarks={bookmarkSet}
                notInterested={notInterestedSet}
                onToggleNotInterested={toggleNotInterested}
              />
            </>
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
            isNotInterested={selectedCode ? notInterestedSet.has(selectedCode) : false}
            onToggleNotInterested={toggleNotInterested}
            prereqStatus={selectedCode ? prereqStatusByCode.get(selectedCode) ?? null : null}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
