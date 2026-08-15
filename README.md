# Y13 Course Navigator

A course-planning tool for Wellington High School's NCEA Level 2/3 subject
choices, built from the school's Senior Course Choices prospectus PDF.

Live at: https://tkluysk.github.io/y13-course-navigator/

## What it does

- **Planning lines** — the school's timetable-line grids (which subjects
  share a period) for both Y12 and Y13, with clickable course chips.
- **Scenarios** — save and switch between named combinations of course
  picks (one per line/column), duplicate them to explore alternatives, and
  lock a scenario to protect it from accidental edits.
- **Pathway graph** — for the selected course, a diagram of the Y12
  courses that lead into it and what it leads on to, sourced from the
  prospectus's pathway text and entry-requirement wording. Edges are
  labelled with required credits and distinguish stated requirements from
  general "or another Science/Social Science/..." alternatives and
  same-subject courses the prospectus doesn't explicitly require.
- **Bookmarks** and **not-interested tagging** — a personal shortlist plus
  a way to grey out courses that are off the table, both independent of
  any scenario.
- **Browse all courses** — full-text search across every course in the
  prospectus, with faculty/level filters.

## Project layout

- `docs/` — the source prospectus PDF.
- `scripts/parse_courses.py` — extracts every course's title, description,
  pathway text, credits, and entry requirements from the PDF into
  `app/src/data/courses.json`. Re-run after replacing the PDF:
  ```
  pdftotext -raw docs/senior-course-choices-2027-v5.pdf docs/prospectus_raw.txt
  python3 scripts/parse_courses.py
  rm docs/prospectus_raw.txt
  ```
- `app/` — the Vite + React + TypeScript frontend. `app/src/data/lines.ts`
  holds the hand-transcribed timetable-line groupings (not present in the
  PDF text).

## Development

```
cd app
npm install
npm run dev
```

Deploys automatically to GitHub Pages on push to `main` via
`.github/workflows/deploy.yml`.
