#!/usr/bin/env python3
"""Parse Wellington High School Senior Course Choices 2027 PDF (raw-mode text
extraction) into structured JSON for the course navigator webapp."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_TXT = ROOT / "docs" / "prospectus_raw.txt"
OUT_JSON = ROOT / "app" / "src" / "data" / "courses.json"

FACULTY_RE = re.compile(r"^([A-ZĀĒĪŌŪ][A-ZĀĒĪŌŪ &]+) \| ([A-ZĀĒĪŌŪ \-]+)$")
LEVEL_PREFIX = (
    r"Y11\s*/\s*Y12\s*/\s*Y13|Y12\s*/\s*Y13|Y11\s*/\s*L2\s*/\s*L3|"
    r"Pre-NCEA|L2\s*/\s*L3|L[123]\+?|Y11"
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
# The prospectus phrases a "credits from a related Level 2 subject" entry
# requirement in several different ways across courses, e.g.:
#   "or another Social Science"
#   "or another Level 2 Social Science, English"
#   "Level 2 Art 12 credits"
#   "12 credits at Level 2 Painting"
#   "12 Level 2 Science credits"
#   "10 credits in Level 2 Sport Science"
#   "9 credits from CSC223 or Level 2 Maths"
# All of these name a *category* (a faculty name, or a subject word that
# maps to one) rather than a specific course code. Try several orderings
# and keep the first plausible noun-phrase match; validity against a real
# faculty/subject is checked by the caller (which has the course list).
# The prospectus abbreviates "Level 2" as "L2" about as often as it spells
# it out (e.g. ENC335/ENP335 say "a L2 English course"), so every pattern
# below matches either form.
LEVEL2 = r"(?:level\s*2|L2)"

CATEGORY_PATTERNS = [
    re.compile(rf"another\s+(?:{LEVEL2}\s+)?([A-Za-z][A-Za-z ]*?)(?:\s+subject|\s+or\b|,|\.|$)", re.I),
    # the word(s) immediately after "Level 2"/"L2" up to the next stop word —
    # covers "Level 2 English course", "Level 2 Art 12 credits",
    # "Level 2 Science credits", "Level 2 Sport Science", "L2 English course"
    # etc uniformly.
    re.compile(
        rf"{LEVEL2}\s+(?!or\b)([A-Za-z]+(?:\s+(?!(?:credits?|course|subject|or|and)\b)[A-Za-z]+)?)\s*"
        r"(?=\d|credits?\b|course\b|subject\b|or\b|and\b|$|,|\.)",
        re.I,
    ),
    re.compile(rf"credits?\s+(?:at|in|from)\s+{LEVEL2}\s+([A-Za-z][A-Za-z]*)", re.I),
    re.compile(r"\d+\s+credits?\s+(?:at|in|from)\s+([A-Za-z][A-Za-z]*)\s*(?:or\b|,|\.|$)", re.I),
]
STOPWORD_CATEGORIES = {"or", "in", "at", "from", "external", "and", "any"}


def subject_prefix(code: str) -> str:
    """Alphabetic prefix of a course code, e.g. 'CHE335' -> 'CHE'."""
    m = re.match(r"^([A-Z]+)", code)
    return m.group(1) if m else code


# Words the prospectus uses for a faculty that don't literally appear in the
# faculty name or any course title, e.g. "Art" for the ARTS faculty (whose
# courses are titled Painting/Sculpture/Design/etc, never "Art").
CATEGORY_SYNONYMS = {
    "art": "ARTS",
    "maths": "MATHEMATICS",
    "math": "MATHEMATICS",
    "pe": "HEALTH & PHYSICAL EDUCATION",
}


def _singularize(word: str) -> str:
    if word.endswith("ies"):
        return word[:-3] + "y"
    if word.endswith("s") and not word.endswith("ss"):
        return word[:-1]
    return word


def resolve_category(
    phrase: str, faculty_names: set, subject_words: dict, subject_codes: dict
) -> tuple[str | None, str | None]:
    """Match a raw category phrase (e.g. 'Science', 'Chemistry', 'Art',
    'Social Science') found in entry-requirement text. Returns
    (faculty, specific_code):
      - A phrase that names an entire faculty (its full name, a
        singular/plural-tolerant match, or a known synonym like "Art" for
        ARTS) is a genuine general-category acceptance: (faculty, None).
      - A phrase that names one specific L2 course's subject and that
        subject ISN'T the same as its faculty name (e.g. "Chemistry" is a
        subject within SCIENCE, not the faculty itself — unlike "English",
        which names both the ENGLISH faculty and its own subject at once)
        is really an explicit single-course prerequisite worded as a
        category rather than a code: (None, code).
    A stray regex match like "or"/"external" resolves to (None, None).
    """
    w = phrase.strip().lower()
    if not w or w in STOPWORD_CATEGORIES:
        return None, None

    phrase_words = {_singularize(x) for x in w.split()}
    for fac in faculty_names:
        fac_words = {_singularize(x) for x in fac.lower().replace("&", " ").split()}
        if phrase_words == fac_words:
            return fac, None

    if w in CATEGORY_SYNONYMS:
        return CATEGORY_SYNONYMS[w], None

    if len(phrase_words) == 1:
        (single,) = phrase_words
        if len(single) >= 4 and single in subject_words:
            return subject_words[single], subject_codes.get(single)
    return None, None


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

    TITLE_STOPWORDS = {"with", "for", "and", "the", "of", "a", "an", "in", "study", "studies"}

    l2_by_subject: dict[str, str] = {}
    faculty_names: set = set()
    subject_words: dict[str, str] = {}
    subject_codes: dict[str, str] = {}
    for c in courses:
        if c["level"] == "L2":
            l2_by_subject.setdefault(subject_prefix(c["code"]), c["code"])
            if c["faculty"]:
                faculty_names.add(c["faculty"])
                for word in re.findall(r"[A-Za-z]+", c["title"]):
                    w = _singularize(word.lower())
                    if w in TITLE_STOPWORDS:
                        continue
                    subject_words.setdefault(w, c["faculty"])
                    subject_codes.setdefault(w, c["code"])

    for c in courses:
        if c["level"] not in ("L3", "L3+"):
            c["required_credits"] = None
            c["explicit_prerequisites"] = []
            c["implied_prerequisite"] = None
            c["alternative_category"] = None
            c["alternative_faculty"] = None
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

        # The entry text may name a general subject *category* rather than
        # (or in addition to) a specific code — "Level 2 Art", "another
        # Social Science", "Level 2 Maths" etc. Try each known phrasing and
        # keep the first candidate that resolves. A phrase naming a whole
        # faculty (e.g. "Science", "English" — which is both the ENGLISH
        # faculty's name and its own core subject) is a genuine general
        # category; a phrase naming one specific subject that ISN'T also
        # its faculty's name (e.g. "Chemistry" within SCIENCE, "Painting"
        # within ARTS) is really a single-code prerequisite worded as a
        # category, so route it into explicit_codes instead — otherwise
        # "12 Level 2 Chemistry credits" would wrongly accept Biology,
        # Physics etc as alternatives too.
        alternative_category = None
        alternative_faculty = None
        for pattern in CATEGORY_PATTERNS:
            m = pattern.search(entry)
            if not m:
                continue
            candidate = m.group(1).strip()
            fac, specific_code = resolve_category(candidate, faculty_names, subject_words, subject_codes)
            if specific_code and specific_code != c["code"] and specific_code not in explicit_codes:
                explicit_codes = sorted(explicit_codes + [specific_code])
                break
            if fac:
                alternative_category = candidate
                alternative_faculty = fac
                break

        # Does a same-subject Y12 course exist that ISN'T named, and the
        # entry text also doesn't reference the subject via a validated
        # general category phrase (a legitimate looser pathway, e.g. BIO335
        # accepting "Level 2 Science credits")?
        implied_prerequisite = None
        subj = subject_prefix(c["code"])
        l2_sibling = l2_by_subject.get(subj)
        if l2_sibling and l2_sibling not in explicit_codes and not alternative_faculty:
            implied_prerequisite = l2_sibling

        c["required_credits"] = required_credits
        c["explicit_prerequisites"] = explicit_codes
        c["implied_prerequisite"] = implied_prerequisite
        c["alternative_category"] = alternative_category
        c["alternative_faculty"] = alternative_faculty


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
            # Usually "<external> <internal> $..." but a course with only
            # one credit type (e.g. MUS223, internal-only) prints just
            # "<credits> $..."; MAT223 uses "TBC" in place of one of the two
            # numbers ("12 TBC $10"); EPB223 gives credit ranges ("4-8 12-16
            # $ TBC"). Match any of these so the ENTRY block still gets
            # picked up regardless.
            CREDIT_TOKEN = r"(?:\d+(?:-\d+)?|TBC)"
            if metrics_start is None and re.match(rf"^{CREDIT_TOKEN}\s+(?:{CREDIT_TOKEN}\s+)?\$", s):
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
            # else: single-credit-type course (e.g. MUS223): "<credits> $...".
            # The two-column layout means both "EXTERNAL" and "INTERNAL"
            # labels can appear nearby regardless of which one the number
            # actually belongs to, so which credit type it is can't be
            # determined reliably from text alone — leave both null rather
            # than risk mislabelling. Not load-bearing: the pathway graph
            # and entry-requirement logic don't use these two fields, only
            # metrics_raw/entry_text, both still extracted correctly.
            donation_amount_m = re.search(r"\$\s*([\d,]+|TBC)", first)
            donation_amount = donation_amount_m.group(0).replace(" ", "") if donation_amount_m else None

            # Separately, extract ENTRY/DONATION text with a more generous
            # window (not capped for display), stopping at the next ALL-CAPS
            # section/course header or a glued page-number tail.
            full_text = " ".join(l.strip() for l in candidate if l.strip())

            # PDF-layout quirk: SOC223's raw text has an unrelated sidebar
            # note about Tourism Māori ("For Year 12 students... speak to
            # Megan Southwell.") sitting between its real ENTRY text
            # ("Literacy corequisite") and the next section heading — almost
            # certainly a page callout box that pdftotext linearised into
            # the wrong position. Strip it out rather than let it pollute
            # entry_text; not a general pattern, just this one known case.
            full_text = re.sub(
                r"For Year 12 students,.*?speak to Megan Southwell\.\s*",
                "",
                full_text,
            )
            # the removed aside was itself followed by a bare "Level 2"/
            # "Level 3" section-heading line that pdftotext had run on
            # directly after it — drop that orphaned trailing fragment too.
            full_text = re.sub(r"\s+Level\s*[23]?$", "", full_text)

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

            # Detect a "bare page number" ENTRY block at the line level,
            # before flattening to full_text: some courses' raw text has a
            # line that is literally just "ENTRY" followed by a line that
            # is literally just the page number (e.g. ENR223: "ENTRY" /
            # "24", ENS223: "ENTRY" / "25") — i.e. no entry text was stated
            # at all, just the page footer digit landing right after the
            # label. This must be checked on the original lines: once
            # joined into full_text, "12 Level 2 Science credits..." (a
            # perfectly normal entry starting with a number) would be
            # indistinguishable from "24" followed by an unrelated
            # paragraph if matched by content shape alone.
            entry_is_bare_page_number = False
            for j, l in enumerate(candidate):
                if l.strip() == "ENTRY":
                    nxt = candidate[j + 1].strip() if j + 1 < len(candidate) else ""
                    if re.match(r"^\d{1,3}$", nxt):
                        entry_is_bare_page_number = True
                    break

            entry_idx = full_text.find("ENTRY")
            if entry_idx != -1:
                entry_tail = full_text[entry_idx + len("ENTRY") :].lstrip()
                entry_text = "" if entry_is_bare_page_number else _clean_tail(entry_tail)

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
