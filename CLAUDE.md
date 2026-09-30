# Security+ quizzes — project context

Read with `/root/.claude/CLAUDE.md`, which sets the rules and wins over this
file: push to GitHub after each verified change, AAA contrast on painted
pixels, objectives from the owner's Google Doc, 20+ questions per topic.

## What this is

A static Security+ (V8) practice site: `index.html` (dashboard and quick
quizzes), `custom.html` (the Full Custom Quiz setup), `quiz.html` (runner and
results). It is the same engine as the Network+ site
(RafikiScyent888/Network-quizzes), so fixes to one usually apply to the other.

The topic list and question bank are in `assets/questions.js`, two lines long:

1. `window.OBJECTIVES`
2. `window.QUESTION_BANK`

Both are single-line JSON. Question ids are integers. GitHub Pages serves
`main`.

## Topics (30 September 2026)

- **Source:** the 26 topics come from the owner's "All updated Objectives" doc
  (Security+ V8), numbered in its order, with the doc's own wording as labels.
  They are not CompTIA's numbers.
- **Filing:** the old quiz used SY0-701's 28 topics, often mislabelled. All
  773 questions were read and filed one by one. The owner saw the preview
  first and approved it: "I like Security, push it."
- **Where topics with no match in the doc went:**
  - Old 1.2 "Fundamental Security Concepts" was split:
    - CIA and control types went to 1.1.
    - AAA and access models went to 4.5.
    - Zero trust went to 3.2.
    - Risk terms went to 5.2.
    - Non-repudiation went to 1.3.
  - Old 2.5 "Mitigation Techniques" and old 4.5 "Enterprise Capabilities" went
    to whichever topic each question actually tests.
  - Attacks are split three ways:
    - How the attack arrives went to 2.2 Threat vectors.
    - Recognizing an attack in progress went to 2.3 Indicators.
    - Kinds of weakness went to 2.4 Vulnerabilities.
- **Fixed:** question 43 asked about mandatory vacations but was keyed "Job
  rotation", and no mandatory-vacation option existed. It now offers
  "Mandatory vacation" (correct), with "Job rotation", "Separation of duties"
  and "Least privilege" as the wrong options.
- **The floor:** each short topic is topped up to 25 (20 plus the standing
  five extra scenarios).
  - Topics still short are listed in `PENDING` in `verify/objectives.mjs`.
  - Take a topic off that list in the same commit that fills it.
- **Question format** for new questions:
  - four options, with `correctIndex` varied
  - a "why" for every option, and an `explanation` equal to the correct
    option's
  - the right answer shouldn't be the longest option more often than chance
  - wrong options are near misses
  - a `source` note beginning "written 30 Sept 2026 for doc topic"

## Checks: `verify/` (need Playwright; not needed to run the site)

- `node verify/objectives.mjs`
  - Checks the bank against the doc copy.
  - Checks that answer keys agree with their explanations, and that question
    43's key stays fixed.
  - Drives `custom.html` and a quiz, including the results screen's score bars.
  - `--plant` runs 19 plants.
- `node verify/retake.mjs`
  - Drives "Retake the ones I missed".
  - `--plant` runs 7 plants.

## Known, not yet fixed

Same as Network+:
- **Contrast:** the standard sky-blue buttons measure about 2.8:1, under the
  AAA floor. The fix is a colour change, so it needs a preview for the owner
  first.
- **Footer:** it reads "Security+ Practice Hub · For educational purposes
  only · Not affiliated with CompTIA". It is waiting for the owner's go-ahead
  to change it.
