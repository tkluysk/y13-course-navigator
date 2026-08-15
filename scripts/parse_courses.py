#!/usr/bin/env python3
"""Parse Wellington High School Senior Course Choices 2027 PDF (raw-mode text
extraction) into structured JSON for the course navigator webapp."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_TXT = ROOT / "docs" / "prospectus_raw.txt"
OUT_JSON = ROOT / "app" / "src" / "data" / "courses.json"

FACULTY_RE = re.compile(r"^([A-ZĀĒĪŌŪ][A-ZĀĒĪŌŪ &]+) \| ([A-ZĀĒĪŌŪĀ̄ĀĒĪŌŪ ]+)$")
LEVEL_PREFIX = (
    r"Y11\s*/\s*Y12\s*/\s*Y13|Y12\s*/\s*Y13|Y11\s*/\s*L2\s*/\s*L3|"
    r"Pre-NCEA|L2\s*/\s*L3|L[123]\+?"
)
HEADER_RE = re.compile(
    rf"^(?:{LEVEL_PREFIX})\s*\|\s*([A-Z0-9/*]+)\s*(.*)$"
)

METRIC_LABELS = {
    "EXTERNAL", "CREDITS", "INTERNAL", "DONATION", "ENTRY", "Course",
    "endorsement", "offered", "Maximum",
}


def extract_level(header_prefix: str) -> str:
    if "Y11" in header_prefix and "Y12" in header_prefix:
        return "Y11-13"
    if "Y11" in header_prefix and "L2" in header_prefix and "L3" in header_prefix:
        return "Y11-L2-3"
    if "Y12" in header_prefix:
        return "Y12-13"
    if "Pre-NCEA" in header_prefix:
        return "Pre-NCEA"
    if "L2" in header_prefix and "L3" in header_prefix:
        return "L2-3"
    if "L3+" in header_prefix:
        return "L3+"
    if "L3" in header_prefix:
        return "L3"
    if "L2" in header_prefix:
        return "L2"
    if "L1" in header_prefix:
        return "L1"
    return header_prefix


def main():
    lines = RAW_TXT.read_text(encoding="utf-8").splitlines()

    # Locate course header lines and faculty section headers.
    header_positions = []  # (line_idx, kind, data)
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        m = FACULTY_RE.match(line)
        if m and "|" in line and not re.match(r"^(L[123]|Y1|Pre-NCEA)", line):
            header_positions.append((i, "faculty", m.group(1).strip()))
            continue
        # faculty header split across two lines, e.g. "HEALTH & PHYSICAL EDUCATION |" / "TE TARI ..."
        m3 = re.match(r"^([A-ZĀĒĪŌŪ][A-ZĀĒĪŌŪ &]+)\s*\|\s*$", line)
        if m3 and not re.match(r"^(L[123]|Y1|Pre-NCEA)", line):
            header_positions.append((i, "faculty", m3.group(1).strip()))
            continue
        # course header must start with one of the recognised level prefixes
        prefix_match = re.match(rf"^(?:{LEVEL_PREFIX})\s*\|", line)
        if prefix_match:
            m2 = re.match(
                rf"^({LEVEL_PREFIX})\s*\|\s*(\S+)\s*(.*)$",
                line,
            )
            if m2 and m2.group(2) not in ("STAR", "GATEWAY"):
                header_positions.append(
                    (i, "course", (m2.group(1), m2.group(2), m2.group(3).strip()))
                )

    # Stop parsing course blocks once we hit the Pathways/Gateway section,
    # which uses a different, non-subject format.
    cutoff = len(lines)
    for i, line in enumerate(lines):
        if line.strip().startswith("PATHWAYS | ARA"):
            cutoff = i
            break

    courses = []
    current_faculty = None
    course_headers = [h for h in header_positions if h[0] < cutoff]

    for idx, (line_no, kind, data) in enumerate(course_headers):
        if kind == "faculty":
            current_faculty = data
            continue

        level_prefix, code, flags = data
        # Find end of this course's block: next header position (any kind)
        next_line_no = (
            course_headers[idx + 1][0] if idx + 1 < len(course_headers) else cutoff
        )
        block = lines[line_no + 1 : next_line_no]
        block = [b.rstrip() for b in block]

        # Title is the first non-empty line after the header.
        bi = 0
        while bi < len(block) and not block[bi].strip():
            bi += 1
        title = block[bi].strip() if bi < len(block) else ""
        bi += 1

        # Strip trailing page-number digits stuck to the last word (pdftotext
        # raw mode sometimes glues footer page numbers onto text, e.g. "approval42").
        rest = block[bi:]

        # Find split points: "Pathway:" line, "Course component(s)" line,
        # and the metrics line (starts with digits/currency tokens).
        pathway_start = None
        components_start = None
        metrics_start = None
        for j, l in enumerate(rest):
            s = l.strip()
            if pathway_start is None and s.startswith("Pathway:"):
                pathway_start = j
            if components_start is None and re.match(r"^Course components?$", s):
                components_start = j
            if metrics_start is None and re.match(r"^[\d]+\s+[\d]+\s+\$", s):
                metrics_start = j
                break

        end_of_text = metrics_start if metrics_start is not None else len(rest)

        if components_start is not None:
            desc_end = pathway_start if pathway_start is not None else components_start
        else:
            desc_end = pathway_start if pathway_start is not None else end_of_text

        description = " ".join(l.strip() for l in rest[:desc_end] if l.strip())

        pathway = ""
        if pathway_start is not None:
            p_end = components_start if components_start is not None else end_of_text
            pathway_lines = rest[pathway_start:p_end]
            pathway = " ".join(l.strip() for l in pathway_lines if l.strip())
            pathway = re.sub(r"^Pathway:\s*", "", pathway).strip()

        components = []
        if components_start is not None:
            comp_lines = rest[components_start + 1 : end_of_text]
            buf = []
            for l in comp_lines:
                s = l.strip()
                if not s:
                    continue
                if s.startswith("●") or s.startswith("•"):
                    if buf:
                        components.append(" ".join(buf).strip())
                    buf = [s.lstrip("●•").strip()]
                else:
                    buf.append(s)
            if buf:
                components.append(" ".join(buf).strip())
            # strip stray glued page numbers at the very end of the last component
            if components:
                components[-1] = re.sub(r"(\.)(\d{1,3})$", r"\1", components[-1])

        # Metrics: first numeric line has external/internal credits + donation cue.
        external_credits = None
        internal_credits = None
        metrics_raw = ""
        if metrics_start is not None:
            metrics_lines = rest[metrics_start:end_of_text] if False else rest[metrics_start:]
            # limit metrics block to a reasonable window (until next course found via header anyway)
            metrics_raw = " ".join(l.strip() for l in metrics_lines if l.strip())
            first = rest[metrics_start].strip()
            nums = re.match(r"^(\d+)\s+(\d+)\s+\$", first)
            if nums:
                external_credits = int(nums.group(1))
                internal_credits = int(nums.group(2))

        ue = "UE" in flags
        schol = "SCHOL" in flags

        courses.append(
            {
                "code": code.strip(),
                "level": extract_level(level_prefix),
                "title": title,
                "faculty": current_faculty,
                "ue": ue,
                "scholarship": schol,
                "description": description.strip(),
                "pathway": pathway.strip(),
                "components": components,
                "external_credits": external_credits,
                "internal_credits": internal_credits,
                "metrics_raw": metrics_raw.strip(),
            }
        )

    # Dedupe by code: a handful of courses (e.g. Sonic Arts) are cross-listed
    # verbatim under two faculty sections. Keep the first occurrence and
    # record the extra faculty as a cross-listing.
    deduped = {}
    dropped = []
    for c in courses:
        if c["code"] in deduped:
            existing = deduped[c["code"]]
            if c["faculty"] and c["faculty"] != existing["faculty"]:
                existing.setdefault("also_listed_under", [])
                if c["faculty"] not in existing["also_listed_under"]:
                    existing["also_listed_under"].append(c["faculty"])
            dropped.append(c["code"])
            continue
        c["also_listed_under"] = []
        deduped[c["code"]] = c
    courses = list(deduped.values())

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(courses, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Parsed {len(courses)} courses -> {OUT_JSON}")
    if dropped:
        print(f"Deduped {len(dropped)} cross-listed repeats: {dropped}")

    # quick sanity report
    l3 = [c for c in courses if c["level"] in ("L3", "L3+")]
    print(f"L3/L3+ courses: {len(l3)}")
    missing_title = [c["code"] for c in courses if not c["title"]]
    if missing_title:
        print("WARNING missing titles:", missing_title)


if __name__ == "__main__":
    main()
