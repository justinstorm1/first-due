export type Track = "dispatch" | "ff1" | "ff2" | "officer" | "chief";

export type Role = "dispatcher" | "ff" | "officer" | "chief";
export type FieldRole = Exclude<Role, "dispatcher">;

export type Topic =
  | "behavior"
  | "construction"
  | "ventilation"
  | "hose"
  | "water"
  | "scba"
  | "search"
  | "forcible"
  | "ladders"
  | "ics"
  | "ric"
  | "mayday"
  | "safety"
  | "hazmat"
  | "extrication"
  | "mva"
  | "sizeup"
  | "strategy"
  | "dispatch"
  | "ems"
  | "wildland"
  | "marine"
  | "systems"
  | "elevator"
  | "gas"
  | "overhaul"
  | "investigation"
  | "leadership"
  | "njcode";

export interface Question {
  id: string;
  level: Track;
  topic: Topic;
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
  reference: string;
}

export type UnitType =
  | "engine"
  | "ladder"
  | "rescue"
  | "tanker"
  | "brush"
  | "marine"
  | "chief";

export type UnitStatus =
  | "available"
  | "dispatched"
  | "enroute"
  | "onscene"
  | "returning";

export interface Station {
  id: number;
  name: string;
  x: number; // 0-100 schematic map position
  y: number;
}

export interface CrewMember {
  id: string;
  name: string;
  rank: string;
  role: FieldRole;
}

export interface Unit {
  id: string;
  name: string;
  type: UnitType;
  stationId: number;
  status: UnitStatus;
  incidentId: string | null;
  statusUntil: number; // game clock second when the current status timer ends
  crew: CrewMember[];
}

export type IncidentTypeId =
  | "res-fire"
  | "apt-fire"
  | "comm-fire"
  | "veh-fire"
  | "mva-ent"
  | "alarm"
  | "gas"
  | "elevator"
  | "brush"
  | "marine";

export type SceneFamily =
  | "fire"
  | "mva"
  | "wildland"
  | "marine"
  | "gas"
  | "alarm"
  | "technical";

export type Building =
  | "house"
  | "apartment"
  | "stripmall"
  | "vehicle"
  | "woods"
  | "boat"
  | "commercial";

export interface Requirement {
  types: UnitType[];
  count: number;
}

export interface IncidentType {
  id: IncidentTypeId;
  label: string;
  short: string;
  family: SceneFamily;
  building: Building;
  priority: 1 | 2 | 3;
  plan: Requirement[];
  calls: string[][]; // caller transcript variants
  locations: { address: string; zone: number; note: string }[];
}

export interface Metrics {
  air: number;
  thermal: number;
  safety: number;
  victim: number;
  morale: number;
  fire: number; // hidden hazard level that drives the visual
}

export interface SceneAction {
  label: string;
  icon: IconName;
  topics: Topic[];
  focus: keyof Metrics;
}

export interface ScenePhase {
  key: string;
  title: string;
  text: string;
  actions: SceneAction[];
}

export interface AnswerRecord {
  questionId: string;
  choice: number;
  correct: boolean;
  phase: string;
  action: string;
}

export interface PendingQuestion {
  actionIndex: number;
  questionId: string;
  choice: number | null;
}

export interface SceneState {
  role: FieldRole;
  unitId: string;
  personName: string;
  personRank: string;
  family: SceneFamily;
  phases: ScenePhase[];
  phaseIndex: number;
  /** Action indexes already resolved in the current phase. */
  phaseDone: number[];
  metrics: Metrics;
  answers: AnswerRecord[];
  pending: PendingQuestion | null;
  maydayTriggered: boolean;
  victimLost: boolean;
  status: "active" | "complete";
  startedAt: number;
  endedAt: number | null;
  outcome: string | null;
  usedQuestionIds: string[];
}

export interface DispatchEval {
  classifiedAs: IncidentTypeId;
  classificationCorrect: boolean;
  missing: string[];
  firstDueIncluded: boolean;
  delaySeconds: number;
  by: "player" | "ai";
}

export interface Incident {
  id: string;
  number: string;
  typeId: IncidentTypeId;
  address: string;
  note: string;
  zone: number;
  transcript: string[];
  createdAt: number;
  status: "pending" | "active" | "closed";
  units: string[];
  dispatch: DispatchEval | null;
  closeAt: number | null;
  delayFlagged: boolean;
  scene: SceneState | null;
}

export type LogKind = "call" | "dispatch" | "radio" | "ai" | "alert" | "system";

export interface LogEntry {
  id: string;
  at: number;
  kind: LogKind;
  text: string;
}

export type CertId = "tele" | "ff1" | "ff2" | "fo1" | "ast" | "chief";

export interface CertRecord {
  status: "earned" | "revoked";
  date: string;
}

export interface TrackStats {
  answered: number;
  correct: number;
  recent: boolean[]; // last 20 results, newest last
}

export interface WriteUp {
  id: string;
  date: string;
  reason: string;
  severity: "warning" | "write-up" | "revocation";
}

export interface DebriefSummary {
  incidentId: string;
  number: string;
  typeLabel: string;
  role: FieldRole;
  grade: string;
  correct: number;
  total: number;
  outcome: string;
  date: string;
}

export interface Profile {
  name: string;
  standing: number;
  xp: number;
  tracks: Record<Track, TrackStats>;
  certificates: Partial<Record<CertId, CertRecord>>;
  writeUps: WriteUp[];
  incidentsByRole: Record<Role, number>;
  history: DebriefSummary[];
}

export type IconName =
  | "siren"
  | "flame"
  | "radio"
  | "truck"
  | "shield"
  | "heart"
  | "gauge"
  | "wind"
  | "award"
  | "map"
  | "timer"
  | "droplets"
  | "ladder"
  | "search"
  | "hammer"
  | "users"
  | "clipboard"
  | "thermometer"
  | "alert"
  | "anchor"
  | "trees"
  | "car"
  | "building"
  | "wrench"
  | "activity"
  | "megaphone"
  | "eye"
  | "check"
  | "x"
  | "headset"
  | "home"
  | "user"
  | "arrow-left"
  | "zap"
  | "play"
  | "file"
  | "star";
