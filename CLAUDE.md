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
- **Fixed 31 Oct 2026:** 36 questions (427-462) showed formatting marks as
  literal asterisks around an acronym ("What does **BIA** stand for..."). The
  owner: "fix the asterisks". The marks are gone; the words are unchanged, and
  `verify/objectives.mjs` fails on any `**` in a question, option or why.
- **Fixed:** question 43 asked about mandatory vacations but was keyed "Job
  rotation", and no mandatory-vacation option existed. It now offers
  "Mandatory vacation" (correct), with "Job rotation", "Separation of duties"
  and "Least privilege" as the wrong options.
- **The floor:** each short topic is topped up to 25 (20 plus the standing
  five extra scenarios).
  - Topics still short are listed in `PENDING` in `verify/objectives.mjs`.
  - Take a topic off that list in the same commit that fills it.
  - 30 Sept 2026: 41 new questions, ids 774–814:
    - 1.2 Change management +11
    - 2.5 AI risks +24
    - 4.6 Automation +6
  - Every topic now has at least 20 questions (814 in all), and `PENDING` is
    empty.
- **Question format** for new questions:
  - four options, with `correctIndex` varied
  - a "why" for every option, and an `explanation` equal to the correct
    option's
  - the right answer shouldn't be the longest option more often than chance
  - wrong options are near misses
  - a `source` note beginning "written 30 Sept 2026 for doc topic"

## Score card, question map and filters (31 October 2026)

Built to the owner's decisions in the doc "Test banks: score card, question
map and filters (plan)" (https://claude.ai/artifact/6vcGwyvSsrwfHBWaKp6rq5):
the features the owner approved on Core 1, Core 2 and Network+, taken from
Network+ (the same engine). The owner saw the preview (the 26 colours, a
quiz, the filters, Reset, results, the dashboard, the Full Custom Quiz page,
Easier reading, a phone) and approved it: "Yes push it". Live on `main` the
same day. Still open: the CertMaster Learn address students use.
- **`assets/testbank.js`** holds it all (colours, Missed list, Shuffle order,
  Easier reading, the confirm dialog, score card, "Study these first", parts
  bar, chips, map). `quiz.js` and `style.css` are Network+'s.
- **Topic colours:** `TOPIC_COLOR`, 26 deep shades around the rainbow in topic
  order, white lettering over 7:1 on each; a colour always goes with its
  topic's number. Parts don't brighten on hover.
- **"New for the updated objectives"** is the 41 questions whose `source`
  begins "written 30 Sept 2026" (774-814).
- **Its own keys (a fix):** Security+ used to save under Network+'s keys
  (`nq_config`, `nq_paused_state`), and both sites live at
  rafikiscyent888.github.io, so a paused quiz showed on the other site. It now
  uses `sq_config` and `sq_paused_state`; on load, a quiz paused under the old
  key moves over if every question in it is this bank's. Network+ ignores a
  paused quiz that isn't its own (live 31 October). The new keys are
  `sq_missed_v1` and `sq_shuffle_v1`; Easier reading is `cwp-easier-reading`,
  shared with the other test banks.
- **CertMaster Learn:** `CERTMASTER_URL` is CompTIA's sign-in page until the
  owner confirms the address students use.

## Light or dark (31 October 2026)

The owner asked for a dark/light switch on every test bank ("we need to keep
things easy for my students to read"). Core 1 was previewed first; the owner
approved it and said of the other four: "Push it and do the rest". The same
change as Network+ (same engine); decided by the owner before building:
- **One choice for the whole program:** the key is `cwp:theme` ("light" or
  "dark"), the same key the acronym sites use. Nothing is saved until the
  student presses the button.
- **Until the student chooses, the page follows the device**, live; once
  chosen, the choice wins over the device. (Only Core 1 starts dark.)

How it works:
- Each page's head stamps `data-theme` on `<html>` before it paints.
- `#themeBtn` beside Easier reading, wired by `TB.initTheme()`. It names where
  it goes ("Dark mode" on the light page), with a moon or sun.
- **Dark mode** is the block at the end of `assets/style.css` (identical to
  Network+'s), every rule under `:root[data-theme="dark"]`: the program's dark
  look, as on Core 1.
- **Topic colours in dark mode:** `TB.TOPIC_BRIGHT`, a bright shade of each
  of the 26 hues, dark lettering over 7:1, neighbours alternating in
  lightness. `tc(id)` carries both (`--tc`, `--tcb`).
- Three hard-coded greys (`color:#475569`) now use `var(--muted)`.

## AAA on gradients (fixed 31 October 2026)

The contrast check only took a background colour that covered 8% of a text's
box, so on a gradient it found none and passed the text unmeasured. Fixed in
`verify/contrast.mjs`. It found the tiles' bright glow spots behind their
lettering (white on the green glow 1.6:1) and the orange, green and yellow
ends too light, as on Network+. The glows are gone, each tile keeps its hue,
deeper; the small counts and the quiz bar's pills sit on a darker backing.
Over 7:1 (4.5:1 for the large titles), both modes.

## Checks: `verify/` (need Playwright; not needed to run the site)

- `node verify/objectives.mjs`
  - Checks the bank against the doc copy.
  - Checks that answer keys agree with their explanations, and that question
    43's key stays fixed.
  - Drives `custom.html` and a quiz, including the results screen's score bars.
  - Fails on literal `**` formatting marks.
  - `--plant` runs 20 plants.
- `node verify/scorecard.mjs`
  - Drives the score card, map, chips, parts bar, Missed list, Reset, the
    prompts, Shuffle order, review, Easier reading, the key move and light or
    dark (the device followed, live, until chosen; nothing saved until then;
    the button's words; `cwp:theme` on every page; a choice from another site;
    the choice beats the device; the bright shades).
  - `--plant` runs 34 plants (`--only=<name>` runs one).
  - Fixed 31 Oct: the "finish with questions left" step could land, after a
    reshuffle, on the question already answered (about one run in ten); it
    now answers it only if still open. A failed drive reports its lines.
- `node verify/retake.mjs`
  - Drives "Retake the ones I missed".
  - `--plant` runs 7 plants.

## Contrast (fixed 30 September 2026)

Every student-facing screen meets AAA on painted pixels. The owner approved
the before/after preview: "I like all of the changes in all of the quizzes".
- The approved colours are in a block marked "AAA contrast" (at the end of `assets/style.css`).
- Colour changes stay in the royal palette, with no new hues.
- Disabled buttons are no longer faded out. They're solid silver with a dashed
  border and readable text.
- `node verify/contrast.mjs` drives every screen (dashboard, setup, question
  before and after answering, results, paused-quiz banner; since 31 October
  also a chip and a part chosen, every part hovered, the confirm dialog,
  Easier reading on every page, and a phone) and fails on
  anything under 7:1 (4.5:1 for large text). `--plant` puts back the old
  sky-blue buttons and must fail.
- Since 31 October it drives every screen twice, dark then light, each in a
  fresh browser, fails if a sweep finds the page in the other theme, and
  measures text on gradients (above). `--theme=dark` runs one. Calibrated
  with plants: faint dark-only text, a glow tile put back, the theme setting
  ignored; all caught.

Run it after any colour or layout change.

## Known, not yet fixed

- **Footer:** it reads "Security+ Practice Hub · For educational purposes
  only · Not affiliated with CompTIA". It is waiting for the owner's go-ahead
  to change it.
