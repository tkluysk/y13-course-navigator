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


CODE_IN_TEXT_RE = re.compile(r"\b([A-Z]{2,4}\d{3})\b")
CREDIT_COUNT_RE = re.compile(
    r"(?:minimum\s+)?(\d+)(?:-\d+)?\s*(?:\+)?\s*credits?", re.I
)
LEVEL2_CATEGORY_RE = re.compile(r"level\s*2|\bL2\b", re.I)


def subject_prefix(code: str) -> str:
    """Alphabetic prefix of a course code, e.g. 'CHE335' -> 'CHE'."""
    m = re.match(r"^([A-Z]+)", code)
    return m.group(1) if m else code


def annotate_entry_requirements(courses: list) -> None:
    """Parse each L3(+) course's entry_text into structured prerequisite
    info: explicit Y12 codes named, a minimum credit count if stated, and
    whether a same-subject Y12 course exists in the prospectus that ISN'T
    named in the entry text (e.g. FIN330 vs FIN223) — a "prerequisite gap"
    worth flagging, since a family reading only the pathway/entry text could
    otherwise miss that a lower-level equivalent exists.
    """
    by_code = {c["code"]: c for c in courses}
    # Map every bare sub-code (e.g. "ODE223", "ODI223") found inside a
    # combined stored code (e.g. "ODE223/ODI223*") back to that stored code,
    # so text mentions of the bare form still resolve to the right course.
    subcode_to_stored: dict[str, str] = {}
    for c in courses:
        for sub in CODE_IN_TEXT_RE.findall(c["code"]):
            subcode_to_stored[sub] = c["code"]

    l2_by_subject: dict[str, str] = {}
    for c in courses:
        if c["level"] == "L2":
            l2_by_subject.setdefault(subject_prefix(c["code"]), c["code"])

    for c in courses:
        if c["level"] not in ("L3", "L3+"):
            c["required_credits"] = None
            c["explicit_prerequisites"] = []
            c["implied_prerequisite"] = None
            continue

        entry = c["entry_text"]
        explicit_codes = sorted(
            {
                subcode_to_stored[code]
                for code in CODE_IN_TEXT_RE.findall(entry)
                if code in subcode_to_stored and subcode_to_stored[code] != c["code"]
            }
        )

        credit_match = CREDIT_COUNT_RE.search(entry)
        required_credits = int(credit_match.group(1)) if credit_match else None

        # Does a same-subject Y12 course exist that ISN'T named, and the
        # entry text also doesn't reference the subject by a general
        # "Level 2 <category>" credits phrase (a legitimate looser
        # pathway, e.g. BIO335 accepting "Level 2 Science credits")?
        implied_prerequisite = None
        subj = subject_prefix(c["code"])
        l2_sibling = l2_by_subject.get(subj)
        if l2_sibling and l2_sibling not in explicit_codes:
            mentions_category = bool(LEVEL2_CATEGORY_RE.search(entry))
            if not mentions_category:
                implied_prerequisite = l2_sibling

        c["required_credits"] = required_credits
        c["explicit_prerequisites"] = explicit_codes
        c["implied_prerequisite"] = implied_prerequisite


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
        # The footer block is short (credits/donation/entry labels); cap its
        # length and stop early if we hit what looks like unrelated prose
        # (e.g. a following section's intro paragraph bleeding in from a
        # neighbouring column) so metrics_raw doesn't run away.
        external_credits = None
        internal_credits = None
        metrics_raw = ""
        entry_text = ""
        donation_text = ""
        donation_amount = None
        if metrics_start is not None:
            candidate = rest[metrics_start:]
            metrics_lines = []
            cutoff_j = None
            for j, l in enumerate(candidate):
                s = l.strip()
                if j > 0 and re.match(r"^(L[123]\+?|Y1\d|Pre-NCEA)\s*[/|]", s):
                    cutoff_j = j
                    break
                if j > 0 and j >= 20 and cutoff_j is None:
                    cutoff_j = j
                metrics_lines.append(l)
                if j >= 30:
                    break
            metrics_raw = " ".join(
                l.strip() for l in metrics_lines[: cutoff_j or len(metrics_lines)] if l.strip()
            )
            first = rest[metrics_start].strip()
            nums = re.match(r"^(\d+)\s+(\d+)\s+\$", first)
            if nums:
                external_credits = int(nums.group(1))
                internal_credits = int(nums.group(2))
            donation_amount_m = re.search(r"\$\s*([\d,]+|TBC)", first)
            donation_amount = donation_amount_m.group(0).replace(" ", "") if donation_amount_m else None

            # Separately, extract ENTRY/DONATION text with a more generous
            # window (not capped for display), stopping at the next ALL-CAPS
            # section/course header or a glued page-number tail.
            full_text = " ".join(l.strip() for l in candidate if l.strip())

            def _clean_tail(text: str) -> str:
                text = re.split(
                    r"\s+(?=[A-Z][A-Z ]{6,}\|)", text, maxsplit=1
                )[0].strip()
                # strip a trailing page number, glued or space-separated, e.g.
                # "...approval42", "...(internal) 40", or a course code with
                # the page number glued straight on ("GDD22358" -> "GDD223").
                # Do this BEFORE the generic digit-tail strip below, and never
                # strip a bare trailing course code's own 3 digits ("DVC223").
                text = re.sub(r"([A-Z]{2,4}\d{3})\d{1,2}$", r"\1", text)
                # trailing "<course code> <page number>" -> drop the number
                text = re.sub(r"([A-Z]{2,4}\d{3})\s+\d{1,2}$", r"\1", text)
                if not re.search(r"[A-Z]{2,4}\d{3}$", text):
                    text = re.sub(r"(?<=[a-zA-Z.,)])\s?\d{1,3}$", "", text).strip()
                return text

            entry_idx = full_text.find("ENTRY")
            if entry_idx != -1:
                entry_text = _clean_tail(full_text[entry_idx + len("ENTRY") :])

            donation_idx = full_text.find("DONATION")
            if donation_idx != -1:
                donation_end = entry_idx if entry_idx > donation_idx else len(full_text)
                donation_text = _clean_tail(
                    full_text[donation_idx + len("DONATION") : donation_end]
                )
            else:
                donation_text = ""

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
                "entry_text": entry_text.strip(),
                "donation_text": donation_text.strip(),
                "donation_amount": donation_amount,
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

    annotate_entry_requirements(courses)

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
