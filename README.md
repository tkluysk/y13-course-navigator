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

## Source & errata

Source document: [Senior Course Choices 2027 v5](https://www.whs.school.nz/wp-content/uploads/Senior-Course-Choices-2027-v5.pdf)
(Wellington High School), mirrored in `docs/`.

A few inconsistencies turned up in the PDF itself while building the
parser, worth flagging back to whoever maintains the prospectus:

1. **MEG335's entry requirement cites a non-existent code.** It reads "At
   least 12 credits at Level 2 in **MEG222**" — but the actual Level 2
   Mechanical Engineering course in the same prospectus is **MEG223**.
   `MEG222` doesn't appear anywhere else in the document; looks like a typo.
2. **The Social Sciences faculty header uses a non-standard separator.**
   "SOCIAL SCIENCES | TIKANGA-Ā-IWI" is the only faculty heading whose Māori
   name contains hyphens; every other faculty heading uses single words or
   spaces only. Not an error exactly, just inconsistent formatting versus
   the other 7 faculty headings.
3. **Combined/dual codes lack a consistent notation.** `ODE223/ODI223*`
   (Outdoor Education, with the international-student variant) is the only
   course using a slash-combined code with a footnote asterisk; every other
   course in the prospectus uses a single clean code.
4. **Sonic Arts (SON223/SON334) is printed twice**, near-verbatim (only
   trivial wording differences — "also provides" vs "provides"), once
   under Arts and once under Technology, rather than being cross-referenced
   from one canonical listing.
5. **Inconsistent entry-requirement phrasing for "same subject" credits** —
   sometimes naming the exact code (e.g. "CHI223 and Head of Department
   approval"), sometimes a general category ("12 Level 2 Science credits"),
   and sometimes neither despite an obvious Level 2 sibling existing.
   **FIN330** never mentions FIN223 or any credit category at all, just
   "Literacy and Numeracy CAAs" — flagged in the app as an unstated
   prerequisite gap. May be intentional, but worth confirming with the
   Maths faculty since every comparable course states its entry
   requirement explicitly.

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
