import { ESCALATIONS, UPDATE_WINDOW } from "@/data/escalations";
import { incidentTypeById, INCIDENT_TYPES, TIMES, WEATHER } from "@/data/incident-types";
import { isGenerated, QUESTIONS } from "@/data/questions";
import { MAYDAY_PHASE, PHASES_BY_FAMILY, SEAT_LINE, VEHICLE_FIRE, type PhaseDef } from "@/data/scenes";
import { stationById, UNIT_TYPE_LABEL } from "@/data/town";
import type {
  ActivityEntry,
  CertId,
  DispatchEval,
  FieldRole,
  Incident,
  IncidentTypeId,
  Metrics,
  Profile,
  Question,
  Requirement,
  SceneState,
  ScenePhase,
  Topic,
  Track,
  Unit,
  WriteUp,
} from "./types";

// ───────────── helpers ─────────────
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
export const uid = () => Math.random().toString(36).slice(2, 10);
export const today = () => new Date().toISOString().slice(0, 10);

export function formatClock(sec: number) {
  // Game day starts at 08:00.
  const total = 8 * 3600 + sec * 6; // 1 real second = 6 game seconds
  const h = Math.floor(total / 3600) % 24;
  const m = Math.floor((total % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

let incidentSeq = 1000 + Math.floor(Math.random() * 8000);

// ───────────── incidents ─────────────
export function createIncident(
  now: number,
  opts: { typeId?: IncidentTypeId; typeIds?: IncidentTypeId[]; zone?: number; forPlayer?: boolean } = {},
): Incident {
  const allowed = opts.typeId
    ? [incidentTypeById(opts.typeId)]
    : opts.typeIds
      ? INCIDENT_TYPES.filter((t) => opts.typeIds!.includes(t.id))
      : INCIDENT_TYPES;
  const pool = allowed.length ? allowed : INCIDENT_TYPES;
  // Prefer a call type with a real location in the requested zone (first-due area).
  const inZone = opts.zone !== undefined ? pool.filter((t) => t.locations.some((l) => l.zone === opts.zone)) : [];
  const type = pick(inZone.length ? inZone : pool);
  const zoneLocs = opts.zone !== undefined ? type.locations.filter((l) => l.zone === opts.zone) : [];
  const base = pick(zoneLocs.length ? zoneLocs : type.locations);
  const loc = opts.zone !== undefined && !zoneLocs.length ? { ...base, zone: opts.zone } : base;
  incidentSeq += 1;
  return {
    id: uid(),
    number: `F26-${String(incidentSeq).padStart(5, "0")}`,
    typeId: type.id,
    address: loc.address,
    note: loc.note,
    zone: loc.zone,
    transcript: pick(type.calls),
    conditions: `${pick(WEATHER)} · ${pick(TIMES)} · ${pick(type.conditions)}`,
    forPlayer: !!opts.forPlayer,
    createdAt: now,
    status: "pending",
    units: [],
    dispatch: null,
    planExtra: [],
    escalation: null,
    updateAt: null,
    update: null,
    closeAt: null,
    delayFlagged: false,
    scene: null,
  };
}

export function travelSeconds(unit: Unit, zone: number) {
  const a = stationById(unit.stationId);
  const b = stationById(zone);
  const dist = Math.hypot(a.x - b.x, a.y - b.y);
  return Math.round(6 + dist * 0.35);
}

/** Current required apparatus: the call type's run card plus anything added by updates. */
export function requirementsFor(incident: Incident): Requirement[] {
  return [...incidentTypeById(incident.typeId).plan, ...incident.planExtra];
}

const reqLabel = (req: Requirement) => req.types.map((t) => UNIT_TYPE_LABEL[t]).join("/");

/** Greedily match units to requirements; returns the shortfall per requirement. */
function shortfalls(reqs: Requirement[], sent: Unit[]) {
  const used = new Set<string>();
  return reqs
    .map((req) => {
      const matches = sent.filter((u) => req.types.includes(u.type) && !used.has(u.id)).slice(0, req.count);
      matches.forEach((u) => used.add(u.id));
      return { req, short: req.count - matches.length };
    })
    .filter((x) => x.short > 0);
}

/** Units still committed to this incident. */
export const assignedUnits = (incident: Incident, units: Unit[]) =>
  units.filter((u) => incident.units.includes(u.id) && u.incidentId === incident.id);

/** Human-readable list of apparatus still needed, e.g. ["2× Engine", "1× Ladder"]. */
export function missingFor(incident: Incident, units: Unit[]): string[] {
  return shortfalls(requirementsFor(incident), assignedUnits(incident, units)).map((x) => `${x.short}× ${reqLabel(x.req)}`);
}

/** Closest available units that fill whatever the incident is still short. */
export function recommendUnits(incident: Incident, units: Unit[]): string[] {
  const chosen: string[] = [];
  for (const { req, short } of shortfalls(requirementsFor(incident), assignedUnits(incident, units))) {
    const candidates = units
      .filter((u) => u.status === "available" && req.types.includes(u.type) && !chosen.includes(u.id))
      .sort((x, y) => travelSeconds(x, incident.zone) - travelSeconds(y, incident.zone));
    chosen.push(...candidates.slice(0, short).map((u) => u.id));
  }
  return chosen;
}

/** Decide (at dispatch time) whether this call will get a scenario update later. */
export function rollEscalation(incident: Incident, now: number): Pick<Incident, "escalation" | "updateAt"> {
  const rule = ESCALATIONS[incident.typeId];
  if (!rule || incident.scene || Math.random() >= rule.chance) return { escalation: null, updateAt: null };
  return { escalation: pick(rule.options), updateAt: now + 25 + Math.floor(Math.random() * 21) };
}

/** Apply a due escalation: change the call type and/or add requirements, and raise an update. */
export function applyEscalation(incident: Incident, now: number): Incident {
  const e = incident.escalation;
  if (!e) return incident;
  return {
    ...incident,
    typeId: e.toType ?? incident.typeId,
    planExtra: [...incident.planExtra, ...(e.extra ?? [])],
    escalation: null,
    updateAt: null,
    update: { text: e.text, at: now, deadline: now + UPDATE_WINDOW, status: "pending" },
    // Keep the call open until the new apparatus arrives (the next arrival sets closeAt).
    closeAt: null,
  };
}

export function evaluateDispatch(
  incident: Incident,
  classifiedAs: IncidentTypeId,
  unitIds: string[],
  units: Unit[],
  now: number,
  by: "player" | "ai",
): DispatchEval {
  const sent = units.filter((u) => unitIds.includes(u.id));
  const missing = shortfalls(requirementsFor(incident), sent).map((x) => `${x.short}× ${reqLabel(x.req)}`);
  return {
    classifiedAs,
    classificationCorrect: classifiedAs === incident.typeId,
    missing,
    firstDueIncluded: sent.some((u) => u.stationId === incident.zone),
    delaySeconds: now - incident.createdAt,
    by,
  };
}

// ───────────── questions ─────────────
export const TRACKS_FOR_ROLE: Record<FieldRole | "dispatcher", Track[]> = {
  dispatcher: ["dispatch"],
  ff: ["ff1", "ff2"],
  officer: ["officer", "ff2"],
  chief: ["chief", "officer"],
};

export function pickQuestion(role: FieldRole | "dispatcher", topics: Topic[], used: string[]): Question {
  const tracks = TRACKS_FOR_ROLE[role];
  const fresh = (list: Question[]) => {
    const unused = list.filter((x) => !used.includes(x.id));
    return unused.length ? unused : list;
  };
  const tiers = [
    QUESTIONS.filter((x) => tracks.includes(x.level) && topics.includes(x.topic)),
    QUESTIONS.filter((x) => topics.includes(x.topic)),
    QUESTIONS.filter((x) => tracks.includes(x.level)),
  ];
  for (const tier of tiers) {
    if (!tier.length) continue;
    // Balance the ~100 hand-written scenario questions against ~2,000 computed ones.
    const hand = tier.filter((x) => !isGenerated(x.id));
    const gen = tier.filter((x) => isGenerated(x.id));
    const source = hand.length && gen.length ? (Math.random() < 0.55 ? hand : gen) : tier;
    return pick(fresh(source));
  }
  return pick(QUESTIONS);
}

// ───────────── scenes ─────────────
function fillPhase(def: PhaseDef, role: FieldRole, incident: Incident, unitName: string, first = false): ScenePhase {
  const body = def.text
    .replace("{unit}", unitName)
    .replace("{address}", incident.address)
    .replace("{note}", incident.note)
    .replace("{seat}", SEAT_LINE[role]);
  const text = first && incident.conditions ? `${body}\n\nConditions: ${incident.conditions}` : body;
  return { key: def.key, title: def.title, text, actions: def.actions[role] };
}

export function createScene(
  incident: Incident,
  role: FieldRole,
  unit: Unit,
  person: { name: string; rank: string },
  now: number,
): SceneState {
  const type = incidentTypeById(incident.typeId);
  const defs = type.family === "fire" && type.building === "vehicle" ? VEHICLE_FIRE : PHASES_BY_FAMILY[type.family];
  const isFire = type.family === "fire" || type.family === "wildland" || type.family === "marine";
  return {
    role,
    unitId: unit.id,
    personName: person.name,
    personRank: person.rank,
    family: type.family,
    phases: defs.map((d, i) => fillPhase(d, role, incident, unit.name, i === 0)),
    phaseIndex: 0,
    phaseDone: [],
    metrics: {
      air: 100,
      thermal: isFire ? 35 : 10,
      safety: 80,
      victim: type.family === "alarm" ? 100 : 75,
      morale: 80,
      fire: isFire ? 60 : type.family === "gas" ? 40 : 15,
    },
    answers: [],
    pending: null,
    maydayTriggered: false,
    victimLost: false,
    status: "active",
    startedAt: now,
    endedAt: null,
    outcome: null,
    usedQuestionIds: [],
  };
}

/** Per-second decay. Returns a new metrics object. */
export function decayMetrics(scene: SceneState): Metrics {
  const m = { ...scene.metrics };
  const hot = scene.family === "fire" || scene.family === "marine" || scene.family === "wildland";
  const interior = scene.role === "ff" && scene.family === "fire";
  m.air = clamp(m.air - (interior ? 0.7 : scene.role === "ff" ? 0.25 : 0.12));
  m.thermal = clamp(m.thermal + (hot ? m.fire / 260 : 0.02));
  m.fire = clamp(m.fire + (hot ? 0.12 : 0.03));
  m.victim = clamp(m.victim - (m.victim < 100 ? 0.08 + m.fire / 900 : 0));
  m.safety = clamp(m.safety - (m.thermal > 70 ? 0.3 : 0.05));
  m.morale = clamp(m.morale - 0.03);
  return m;
}

export function applyAnswer(metrics: Metrics, focus: keyof Metrics, correct: boolean): Metrics {
  const m = { ...metrics };
  if (correct) {
    m.fire = clamp(m.fire - (focus === "fire" ? 26 : 12));
    m.thermal = clamp(m.thermal - (focus === "thermal" ? 22 : 8));
    m.victim = clamp(m.victim + (focus === "victim" ? 18 : 6));
    m.safety = clamp(m.safety + (focus === "safety" ? 15 : 5));
    m.morale = clamp(m.morale + (focus === "morale" ? 14 : 6));
    m.air = clamp(m.air + (focus === "air" ? 15 : 3));
  } else {
    m.fire = clamp(m.fire + 14);
    m.thermal = clamp(m.thermal + 12);
    m.victim = clamp(m.victim - (focus === "victim" ? 18 : 8));
    m.safety = clamp(m.safety - (focus === "safety" ? 18 : 10));
    m.morale = clamp(m.morale - 10);
    m.air = clamp(m.air - (focus === "air" ? 15 : 6));
  }
  return m;
}

export function maydayPhase(role: FieldRole, incident: Incident, unitName: string): ScenePhase {
  return fillPhase(MAYDAY_PHASE, role, incident, unitName);
}

export function sceneGrade(scene: SceneState) {
  const total = scene.answers.length || 1;
  const correct = scene.answers.filter((x) => x.correct).length;
  const pct = correct / total;
  const m = scene.metrics;
  const metricAvg = (m.safety + m.victim + m.morale + (100 - m.thermal)) / 400;
  const score = pct * 0.75 + metricAvg * 0.25 - (scene.victimLost ? 0.1 : 0);
  const grade = score >= 0.9 ? "A" : score >= 0.8 ? "B" : score >= 0.7 ? "C" : score >= 0.6 ? "D" : "F";
  return { correct, total: scene.answers.length, pct, grade, score };
}

// ───────────── career ─────────────
export const CERTS: {
  id: CertId;
  title: string;
  track: Track;
  min: number;
  pct: number;
  requires: CertId[];
  standard: string;
}[] = [
  { id: "tele", title: "Public Safety Telecommunicator", track: "dispatch", min: 12, pct: 0.75, requires: [], standard: "NFPA 1061 · APCO" },
  { id: "ff1", title: "Fire Fighter I", track: "ff1", min: 15, pct: 0.7, requires: [], standard: "NFPA 1001 · NJDFS" },
  { id: "ff2", title: "Fire Fighter II", track: "ff2", min: 12, pct: 0.7, requires: ["ff1"], standard: "NFPA 1001 · NJDFS" },
  { id: "fo1", title: "Fire Officer I", track: "officer", min: 15, pct: 0.7, requires: ["ff2"], standard: "NFPA 1021 · NJDFS" },
  { id: "ast", title: "Advanced Safety & Tactics", track: "chief", min: 12, pct: 0.75, requires: ["fo1"], standard: "NFPA 1561 · N.J.A.C. 5:75" },
  { id: "chief", title: "Fire Chief / Incident Commander", track: "chief", min: 25, pct: 0.8, requires: ["ast"], standard: "NFPA 1021 · NIMS" },
];

export const emptyProfile = (name = "Probie"): Profile => ({
  id: uid(),
  createdAt: new Date().toISOString(),
  name,
  standing: 75,
  xp: 0,
  tracks: {
    dispatch: { answered: 0, correct: 0, recent: [] },
    ff1: { answered: 0, correct: 0, recent: [] },
    ff2: { answered: 0, correct: 0, recent: [] },
    officer: { answered: 0, correct: 0, recent: [] },
    chief: { answered: 0, correct: 0, recent: [] },
  },
  certificates: {},
  writeUps: [],
  incidentsByRole: { dispatcher: 0, ff: 0, officer: 0, chief: 0 },
  history: [],
  activity: [{ id: uid(), at: new Date().toISOString(), kind: "profile", text: `Profile created: ${name}` }],
  timeOnDuty: { dispatcher: 0, ff: 0, officer: 0, chief: 0 },
});

/** Fill fields added after a profile was first saved. */
export function migrateProfile(p: Partial<Profile>): Profile {
  const base = emptyProfile(p.name ?? "Probie");
  return {
    ...base,
    ...p,
    id: p.id ?? base.id,
    createdAt: p.createdAt ?? base.createdAt,
    activity: p.activity ?? [],
    timeOnDuty: p.timeOnDuty ?? base.timeOnDuty,
    history: p.history ?? [],
  } as Profile;
}

const ACTIVITY_CAP = 5000;
export function logActivity(p: Profile, entry: Omit<ActivityEntry, "id" | "at">): Profile {
  const e: ActivityEntry = { id: uid(), at: new Date().toISOString(), ...entry };
  return { ...p, activity: [e, ...p.activity].slice(0, ACTIVITY_CAP) };
}

function logEvents(p: Profile, events: CareerEvent[]): Profile {
  return events.reduceRight(
    (acc, ev) => logActivity(acc, { kind: ev.kind === "writeup" ? "writeup" : "cert", text: ev.text }),
    p,
  );
}

export const hasCert = (p: Profile, id: CertId) => p.certificates[id]?.status === "earned";

export function errorRate(p: Profile) {
  const all = Object.values(p.tracks);
  const answered = all.reduce((s, t) => s + t.answered, 0);
  const correct = all.reduce((s, t) => s + t.correct, 0);
  return answered ? 1 - correct / answered : 0;
}

export function rankFor(p: Profile) {
  if (hasCert(p, "chief")) return "Chief of Department";
  if (hasCert(p, "ast")) return "Battalion Chief";
  if (hasCert(p, "fo1")) return p.incidentsByRole.officer >= 10 ? "Captain" : "Lieutenant";
  if (hasCert(p, "ff2")) return "Senior Firefighter";
  if (hasCert(p, "ff1")) return "Firefighter";
  return "Probationary Firefighter";
}

export interface CareerEvent {
  kind: "earned" | "revoked" | "writeup";
  text: string;
}

/** Record one answered question and re-evaluate standing & certificates. */
export function recordAnswer(
  profile: Profile,
  track: Track,
  correct: boolean,
  info?: { questionId?: string; context?: string; text?: string },
): { profile: Profile; events: CareerEvent[] } {
  const t = profile.tracks[track];
  const tracks = {
    ...profile.tracks,
    [track]: {
      answered: t.answered + 1,
      correct: t.correct + (correct ? 1 : 0),
      recent: [...t.recent, correct].slice(-20),
    },
  };
  const before = profile.standing;
  const standing = clamp(before + (correct ? 0.8 : -2));
  const next: Profile = { ...profile, tracks, standing, xp: profile.xp + (correct ? 10 : 2) };
  const events: CareerEvent[] = [];
  if (before >= 50 && standing < 50) {
    const w = writeUp("Standing fell below 50: performance improvement plan issued.", "write-up");
    next.writeUps = [w, ...next.writeUps];
    events.push({ kind: "writeup", text: w.reason });
  }
  const logged = info
    ? logActivity(next, {
        kind: "answer",
        text: info.text ?? (correct ? "Answered correctly" : "Answered incorrectly"),
        questionId: info.questionId,
        correct,
        track,
        context: info.context,
      })
    : next;
  const r = evaluateCerts(logged, events);
  return { profile: logEvents(r.profile, r.events), events: r.events };
}

export function penalize(profile: Profile, amount: number, reason: string, severity: WriteUp["severity"] = "warning") {
  const next: Profile = { ...profile, standing: clamp(profile.standing - amount) };
  const w = writeUp(reason, severity);
  next.writeUps = [w, ...profile.writeUps].slice(0, 500);
  const r = evaluateCerts(next, [{ kind: "writeup", text: reason }]);
  return { profile: logEvents(r.profile, r.events), events: r.events };
}

function writeUp(reason: string, severity: WriteUp["severity"]): WriteUp {
  return { id: uid(), date: today(), reason, severity };
}

function evaluateCerts(p: Profile, events: CareerEvent[]) {
  const certificates = { ...p.certificates };
  let writeUps = p.writeUps;
  for (const c of CERTS) {
    const t = p.tracks[c.track];
    const accuracy = t.answered ? t.correct / t.answered : 0;
    const status = certificates[c.id]?.status;
    const prereqs = c.requires.every((r) => certificates[r]?.status === "earned");
    if (status !== "earned" && prereqs && t.answered >= c.min && accuracy >= c.pct) {
      // A revoked cert needs a strong recent run to be reinstated.
      const recentPct = t.recent.filter(Boolean).length / Math.max(1, t.recent.length);
      if (status === "revoked" && recentPct < c.pct) continue;
      certificates[c.id] = { status: "earned", date: today() };
      events.push({ kind: "earned", text: `Certificate earned: ${c.title}` });
    } else if (status === "earned" && t.recent.length >= 10) {
      const recentPct = t.recent.filter(Boolean).length / t.recent.length;
      if (recentPct < 0.5) {
        certificates[c.id] = { status: "revoked", date: today() };
        const reason = `${c.title} revoked: recent accuracy ${Math.round(recentPct * 100)}%.`;
        writeUps = [writeUp(reason, "revocation"), ...writeUps];
        events.push({ kind: "revoked", text: reason });
      }
    }
  }
  let standing = p.standing;
  if (standing < 30) {
    const top = [...CERTS].reverse().find((c) => certificates[c.id]?.status === "earned");
    if (top) {
      certificates[top.id] = { status: "revoked", date: today() };
      const reason = `Administrative review: ${top.title} revoked (standing ${Math.round(standing)}).`;
      writeUps = [writeUp(reason, "revocation"), ...writeUps];
      events.push({ kind: "revoked", text: reason });
      standing = 45;
    }
  }
  return { profile: { ...p, certificates, writeUps, standing }, events };
}
