// Parses the legacy "Sec + Day N.html" / assorted quiz files, normalizes their
// wildly different embedded data formats into one schema, tags every question
// with a CompTIA Security+ (SY0-701) domain/objective, and writes
// assets/questions.js.
//
// Run with: node tools/build-questions.mjs

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const VAR_NAMES = [
  "QUESTION_BANK", "QUESTIONS", "questions", "quizData", "quizQuestions",
  "allQuestions", "rawQuestions",
];

// ---------------------------------------------------------------------------
// 1. Extract the raw array literal text for each file's question bank.
//    Handles // and /* */ comments so bracket-depth counting doesn't get
//    confused by stray characters inside them.
// ---------------------------------------------------------------------------

function findArrayLiteral(text, varName) {
  const re = new RegExp(`(?:const|var|let)\\s+${varName}\\s*=\\s*\\[`, "g");
  const m = re.exec(text);
  if (!m) return null;
  const start = text.indexOf("[", m.index);
  let depth = 0;
  let inStr = null;
  let escape = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") { inBlockComment = false; i++; }
      continue;
    }
    if (inStr) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "/" && next === "/") { inLineComment = true; i++; continue; }
    if (ch === "/" && next === "*") { inBlockComment = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function extractRaw(file) {
  const text = readFileSync(path.join(ROOT, file), "utf8");
  for (const varName of VAR_NAMES) {
    const lit = findArrayLiteral(text, varName);
    if (lit) {
      // eslint-disable-next-line no-new-func
      const arr = new Function(`return (${lit});`)();
      if (Array.isArray(arr) && arr.length) return arr;
    }
  }
  throw new Error(`No question array found in ${file}`);
}

// ---------------------------------------------------------------------------
// 2. Generic adapter: detects one of ~8 shapes seen across this repo's files
//    and normalizes to { question, options[], correctIndex, explanation, tag }.
// ---------------------------------------------------------------------------

function adaptItem(raw, file) {
  const questionText = raw.q ?? raw.question ?? raw.Question;
  if (!questionText) throw new Error("no question text");

  let options, correctIndex, explanation = "", tag = null;

  if (raw.answers && !Array.isArray(raw.answers) && typeof raw.answers === "object") {
    // { answers: {A:.., B:.., ...}, correct: "A" }
    const letters = Object.keys(raw.answers);
    options = letters.map((l) => raw.answers[l]);
    correctIndex = letters.indexOf(raw.correct);
    explanation = raw.explanation || raw.exp || "";
    tag = raw.category || null;
  } else if (Array.isArray(raw.answers)) {
    // { answers: [{label, text, correct}] }
    options = raw.answers.map((a) => a.text);
    correctIndex = raw.answers.findIndex((a) => a.correct);
    explanation = raw.explanation || raw.exp || "";
  } else if (Array.isArray(raw.opts)) {
    // { opts: [{t, c}] }
    options = raw.opts.map((o) => o.t);
    correctIndex = raw.opts.findIndex((o) => o.c);
    explanation = raw.exp || raw.explanation || "";
  } else if (Array.isArray(raw.choices) && typeof raw.choices[0] === "object") {
    // { choices: [{t, correct}], domain? }
    options = raw.choices.map((c) => c.t);
    correctIndex = raw.choices.findIndex((c) => c.correct);
    explanation = raw.exp || raw.explanation || "";
    tag = raw.domain || null;
  } else if (Array.isArray(raw.choices)) {
    // { choices: [string], correctIndex | correct }
    options = raw.choices;
    correctIndex = raw.correctIndex ?? raw.correct ?? raw.answer;
    explanation = raw.exp || raw.explanation || "";
  } else if (Array.isArray(raw.options) && typeof raw.options[0] === "object") {
    // { options: [{text, isCorrect}] }
    options = raw.options.map((o) => o.text);
    correctIndex = raw.options.findIndex((o) => o.isCorrect);
    explanation = raw.explanation || raw.exp || "";
  } else if (Array.isArray(raw.a)) {
    // { a: [string], e } — no correct marker; repo convention: index 0 is correct
    options = raw.a;
    correctIndex = 0;
    explanation = raw.e || "";
  } else if (Array.isArray(raw.options)) {
    // { options: [string], answer: number | string, tags? }
    options = raw.options;
    if (typeof raw.answer === "string") {
      correctIndex = options.indexOf(raw.answer);
    } else {
      correctIndex = raw.correct ?? raw.answer ?? raw.correctIndex;
    }
    explanation = raw.explanation || raw.exp || "";
    tag = Array.isArray(raw.tags) ? raw.tags.join(" / ") : null;
  } else {
    throw new Error(`Unrecognized question shape: ${JSON.stringify(raw).slice(0, 120)}`);
  }

  if (options.every((o) => typeof o === "string" && /^[A-D]\.\s+/.test(o))) {
    options = options.map((o) => o.replace(/^[A-D]\.\s+/, ""));
  }

  if (typeof correctIndex !== "number" || correctIndex < 0 || correctIndex >= options.length) {
    throw new Error(`No valid correct index for question in ${file}: ${questionText.slice(0, 60)}`);
  }

  return { question: String(questionText).trim(), options, correctIndex, explanation, tag };
}

// ---------------------------------------------------------------------------
// 3. CompTIA Security+ (SY0-701) objective taxonomy + classifier.
//    Original study-aid grouping inspired by the public SY0-701 domain
//    structure; not official CompTIA material.
// ---------------------------------------------------------------------------

export const OBJECTIVES = [
  { id: "1.1", domain: "1.0 General Security Concepts", label: "Security Controls" },
  { id: "1.2", domain: "1.0 General Security Concepts", label: "Fundamental Security Concepts (CIA, AAA, Zero Trust)" },
  { id: "1.3", domain: "1.0 General Security Concepts", label: "Change Management" },
  { id: "1.4", domain: "1.0 General Security Concepts", label: "Cryptographic Solutions" },

  { id: "2.1", domain: "2.0 Threats, Vulnerabilities & Mitigations", label: "Threat Actors & Motivations" },
  { id: "2.2", domain: "2.0 Threats, Vulnerabilities & Mitigations", label: "Threat Vectors & Attack Surfaces" },
  { id: "2.3", domain: "2.0 Threats, Vulnerabilities & Mitigations", label: "Vulnerability Types" },
  { id: "2.4", domain: "2.0 Threats, Vulnerabilities & Mitigations", label: "Indicators of Malicious Activity" },
  { id: "2.5", domain: "2.0 Threats, Vulnerabilities & Mitigations", label: "Mitigation Techniques" },

  { id: "3.1", domain: "3.0 Security Architecture", label: "Architecture Models" },
  { id: "3.2", domain: "3.0 Security Architecture", label: "Enterprise Infrastructure Security" },
  { id: "3.3", domain: "3.0 Security Architecture", label: "Data Protection Concepts" },
  { id: "3.4", domain: "3.0 Security Architecture", label: "Resilience & Recovery" },

  { id: "4.1", domain: "4.0 Security Operations", label: "Securing Computing Resources & Hardening" },
  { id: "4.2", domain: "4.0 Security Operations", label: "Asset Management" },
  { id: "4.3", domain: "4.0 Security Operations", label: "Vulnerability Management" },
  { id: "4.4", domain: "4.0 Security Operations", label: "Security Monitoring & Alerting" },
  { id: "4.5", domain: "4.0 Security Operations", label: "Enterprise Security Capabilities (Firewalls, IDS/IPS, DLP)" },
  { id: "4.6", domain: "4.0 Security Operations", label: "Identity & Access Management (IAM)" },
  { id: "4.7", domain: "4.0 Security Operations", label: "Automation & Orchestration" },
  { id: "4.8", domain: "4.0 Security Operations", label: "Incident Response" },
  { id: "4.9", domain: "4.0 Security Operations", label: "Digital Forensics & Investigation Data Sources" },

  { id: "5.1", domain: "5.0 Security Program Management & Oversight", label: "Security Governance" },
  { id: "5.2", domain: "5.0 Security Program Management & Oversight", label: "Risk Management" },
  { id: "5.3", domain: "5.0 Security Program Management & Oversight", label: "Third-Party Risk Management" },
  { id: "5.4", domain: "5.0 Security Program Management & Oversight", label: "Security Compliance" },
  { id: "5.5", domain: "5.0 Security Program Management & Oversight", label: "Audits & Assessments" },
  { id: "5.6", domain: "5.0 Security Program Management & Oversight", label: "Security Awareness Training" },
];

const TAG_MAP = {
  "fundamentals": "1.2",
  "governance": "5.1",
  "governance/risk": "5.1",
  "security operations": "4.4",
  "service identification": "4.5",
};

// Ordered keyword rules for questions with no explicit tag. First match wins.
// Domain 1's control-type/definitional rules are checked first since their
// vocabulary (e.g. "compensating control") also appears incidentally inside
// other domains' distractor options.
const KEYWORD_RULES = [
  ["1.1", /\bsecurity control|preventive control|detective control|corrective control|deterrent control|compensating control|directive control|technical control|managerial control|operational control|physical control/i],
  ["1.4", /\bcryptograph|encrypt|hashing|digital signature|public key infrastructure|\bpki\b|certificate authority|symmetric (key|encryption)|asymmetric (key|encryption)|\baes\b|\brsa\b|blockchain|steganography|key (exchange|escrow|stretching)/i],
  ["1.3", /\bchange management|change control|technical implication|rollback plan|maintenance window|impact analysis.{0,20}change|approval process/i],
  ["1.2", /\bconfidentiality\b|\bintegrity\b|\bavailability\b|non-repudiation|\baaa\b|authentication.{0,20}authorization|zero trust\b|gap analysis|deception technology|honeypot|honeynet|honeyfile|honeytoken/i],

  ["5.6", /\bphishing (campaign|simulation)|security awareness|user (training|guidance)|anomalous behavior recognition|click-?through rate\b/i],
  ["5.5", /\baudit\b|attestation|internal audit|external audit|penetration test(ing)?|pentest|rules of engagement.{0,20}audit/i],
  ["5.4", /\bcompliance report|non-?compliance|regulatory requirement|privacy (notice|regulation)|gdpr|data sovereignty/i],
  ["5.3", /\bthird-?party risk|vendor (assessment|monitoring|questionnaire)|supply chain risk|right-to-audit|service level agreement|\bsla\b|\bmou\b|\bnda\b/i],
  ["5.2", /\brisk (register|appetite|tolerance|matrix|assessment|analysis)|business impact analysis|\bbia\b|single loss expectancy|\bsle\b|\bale\b|\baro\b|qualitative risk|quantitative risk|risk acceptance|risk transfer|risk avoidance|risk mitigation strategy/i],
  ["5.1", /\bpolicy\b|\bstandard\b|\bprocedure\b|\bguideline\b|security governance|acceptable use policy|\baup\b|roles and responsibilit/i],
  ["4.9", /\bdigital forensics|chain of custody|order of volatility|forensic (image|copy)|packet capture|\bpcap\b|metadata analysis|legal hold/i],
  ["4.8", /\bincident response|containment|eradication|lessons learned|root cause analysis|\bir plan\b|tabletop exercise|threat hunt/i],
  ["4.7", /\bautomation\b|orchestration|\bsoar\b|playbook|scripting|infrastructure as code automation/i],
  ["4.6", /\bidentity and access management|\biam\b|single sign-on|\bsso\b|federation|provisioning|deprovisioning|multifactor|\bmfa\b|password polic|privileged access management|\bpam\b|least privilege|role-based access|\brbac\b|attribute-based access|\babac\b|discretionary access|\bdac\b|mandatory access|\bmac\b/i],
  ["4.5", /\bfirewall\b|\bids\b|\bips\b|web filter|\bdlp\b|data loss prevention|network access control|\bnac\b|email security|\bspf\b|\bdkim\b|\bdmarc\b|secure protocol|load balancer|proxy server/i],
  ["4.4", /\bsiem\b|\bsnmp\b|log aggregation|security monitoring|alert(ing)?\b|packet capture monitoring|netflow|vulnerability scan(ner|ning) output|dashboard/i],
  ["4.3", /\bvulnerability (scan|management|remediation|report)|patch management|\bcve\b|\bcvss\b|false positive|false negative/i],
  ["4.2", /\basset (management|inventory|tracking|acquisition|disposal)|decommission|media sanitization|data destruction/i],
  ["4.1", /\bhardening\b|secure baseline|wireless security|mobile device (management|security)|\bmdm\b|endpoint protection|host-based/i],

  ["3.4", /\bhigh availability|\bhot site|warm site|cold site|failover|redundan|backup (strategy|type)|\brto\b|\brpo\b|\bmtd\b|disaster recovery|replication|clustering|load balancing.{0,20}resilien/i],
  ["3.3", /\bdata classification|data (at rest|in transit|in use)|data masking|tokeniz|data loss prevention type|data sovereignty|data retention/i],
  ["3.2", /\bnetwork segmentation|microsegmentation|screened subnet|\bdmz\b|zero trust architecture|secure access service edge|\bsase\b|vpn\b|remote access/i],
  ["3.1", /\bcloud (architecture|model|deployment)|\biaas\b|\bpaas\b|\bsaas\b|serverless|microservices|infrastructure as code|\biac\b|containeriz|on-premises architecture|centralized architecture|decentralized architecture/i],

  ["2.5", /\bmitigation techniqu|compensating control|patch(ing)? as mitigation|segmentation as mitigation|isolation as mitigation|least privilege as mitigation|configuration enforcement/i],
  ["2.4", /\bmalware\b|ransomware|trojan|worm\b|rootkit|keylogger|spyware|logic bomb|\bxss\b|\bcsrf\b|\bxsrf\b|sql injection|\bsqli\b|buffer overflow|privilege escalation|on-path attack|man-in-the-middle|denial of service|\bdos\b|\bddos\b|brute force|password spray|credential stuffing|social engineering|phishing|pretexting|impersonation|watering hole|indicator of compromise|\bioc\b/i],
  ["2.3", /\bvulnerability type|zero-day|misconfiguration|unpatched|legacy system vulnerability|weak encryption vulnerability|default credential/i],
  ["2.2", /\bthreat vector|attack surface|unsecured network vector|removable media vector|supply chain vector|phishing vector|image-based vector|voice call vector/i],
  ["2.1", /\bthreat actor|nation-state|hacktivist|insider threat|organized crime|unskilled attacker|script kiddie|shadow it|competitor as threat/i],
];

const FILE_DEFAULTS = {
  "100 questions Sec + v3.html": "1.1",
  "61-80 Secv1.html": "2.4",
  "81-100 Secv1.html": "5.1",
  "Overall 81-100 v1.html": "5.1",
  "Overall Sec 41-80v1.html": "2.4",
  "Overall quiz Secv1.html": "4.6",
  "Sec + Day 1.html": "1.2",
  "Sec + Day 2.html": "1.4",
  "Sec + Day 3.html": "3.1",
  "Sec + Day 4.html": "4.3",
  "Sec + Day 5.html": "4.4",
  "Sec + Day 6.html": "4.8",
  "Sec + Day 7.html": "5.1",
  "Sec + Day 8.html": "5.2",
  "Sec + Full Review.html": "5.1",
  "Sec + acronyms.html": "1.2",
  "Sec+Day1Quiz.html": "1.2",
  "comptia_ports_protocols_exam_mode_quiz.html": "4.5",
};

function classify(item, file) {
  if (item.tag) {
    const key = String(item.tag).trim().toLowerCase();
    if (TAG_MAP[key]) return TAG_MAP[key];
  }
  const haystack = `${item.question} ${item.options.join(" ")} ${item.explanation}`;
  for (const [objId, re] of KEYWORD_RULES) {
    if (re.test(haystack)) return objId;
  }
  return FILE_DEFAULTS[file] || "1.2";
}

// ---------------------------------------------------------------------------
// 4. Main
// ---------------------------------------------------------------------------

function main() {
  const files = readdirSync(ROOT).filter((f) => f.endsWith(".html"));
  const bank = [];
  const seen = new Set();
  let skippedShapes = [];

  for (const file of files) {
    let rawItems;
    try {
      rawItems = extractRaw(file);
    } catch (err) {
      console.error(`SKIP FILE ${file}: ${err.message}`);
      continue;
    }
    for (const raw of rawItems) {
      let item;
      try {
        item = adaptItem(raw, file);
      } catch (err) {
        skippedShapes.push(`${file}: ${err.message}`);
        continue;
      }
      if (!item.question || !Array.isArray(item.options) || item.options.length < 2) continue;
      const dedupeKey = item.question.trim().toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const objectiveId = classify(item, file);
      const objective = OBJECTIVES.find((o) => o.id === objectiveId);

      bank.push({
        id: bank.length + 1,
        question: item.question,
        options: item.options,
        correctIndex: item.correctIndex,
        explanation: item.explanation || item.options[item.correctIndex],
        domain: objective.domain,
        objectiveId: objective.id,
        objective: objective.label,
        source: file,
      });
    }
  }

  if (skippedShapes.length) {
    console.error(`Skipped ${skippedShapes.length} unrecognized items:`);
    skippedShapes.slice(0, 15).forEach((s) => console.error("  " + s));
  }

  const byObjective = {};
  for (const q of bank) byObjective[q.objectiveId] = (byObjective[q.objectiveId] || 0) + 1;
  console.log(`Total questions: ${bank.length}`);
  for (const obj of OBJECTIVES) {
    console.log(`  ${obj.id} ${obj.label.padEnd(50)} ${byObjective[obj.id] || 0}`);
  }

  const out = `// AUTO-GENERATED by tools/build-questions.mjs — do not hand-edit.
// Regenerate with: node tools/build-questions.mjs
window.OBJECTIVES = ${JSON.stringify(OBJECTIVES)};
window.QUESTION_BANK = ${JSON.stringify(bank)};
`;
  writeFileSync(path.join(ROOT, "assets", "questions.js"), out);
  console.log(`\nWrote assets/questions.js (${bank.length} questions).`);
}

main();
