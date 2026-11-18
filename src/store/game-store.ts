import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { incidentTypeById, INCIDENT_TYPES } from "@/data/incident-types";
import { questionById } from "@/data/questions";
import { createFleet } from "@/data/town";
import {
  applyAnswer,
  createIncident,
  createScene,
  decayMetrics,
  emptyProfile,
  evaluateDispatch,
  logActivity,
  maydayPhase,
  migrateProfile,
  penalize,
  pickQuestion,
  recommendUnits,
  recordAnswer,
  sceneGrade,
  today,
  travelSeconds,
  uid,
  type CareerEvent,
} from "@/game/engine";
import type {
  FieldRole,
  Incident,
  IncidentTypeId,
  LogEntry,
  LogKind,
  Profile,
  Role,
  Seat,
  Unit,
} from "@/game/types";

/** Phases need this many resolved actions before advancing. */
export const ACTIONS_PER_PHASE = 2;
/** A standing-by member is guaranteed a run within this many seconds of going in service. */
export const MAX_STANDBY_WAIT = 60;

export interface Notice {
  id: string;
  kind: CareerEvent["kind"] | "info";
  text: string;
}

export interface DispatchQuestion {
  incidentId: string;
  questionId: string;
  choice: number | null;
}

const ZERO_DUTY: Record<Role, number> = { dispatcher: 0, ff: 0, officer: 0, chief: 0 };

interface GameState {
  // persisted
  profile: Profile;
  others: Record<string, Profile>;
  // session
  role: Role | null;
  seat: Seat | null;
  clock: number;
  incidents: Incident[];
  units: Unit[];
  log: LogEntry[];
  nextCallAt: number;
  /** Clock time at which a call is generated for the standing-by player (null = not waiting). */
  playerCallAt: number | null;
  pendingSceneId: string | null;
  notices: Notice[];
  dispatchQuestion: DispatchQuestion | null;
  duty: Record<Role, number>;

  startDispatcher: () => void;
  startStandby: (seat: Seat) => void;
  tick: () => void;
  dispatchIncident: (incidentId: string, classifiedAs: IncidentTypeId, unitIds: string[]) => void;
  takeRole: (incidentId: string, unitId: string, crewId: string) => void;
  chooseAction: (incidentId: string, actionIndex: number) => void;
  answerScene: (incidentId: string, choice: number) => void;
  continueScene: (incidentId: string) => void;
  leaveScene: (incidentId: string) => void;
  takeConsole: () => void;
  exitToMenu: () => void;
  answerDispatchQuestion: (choice: number) => void;
  closeDispatchQuestion: () => void;
  answerDrill: (questionId: string, choice: number) => boolean;
  consumePendingScene: () => void;
  dismissNotice: (id: string) => void;
  setName: (name: string) => void;
  resetCareer: () => void;
  createProfile: (name: string) => void;
  switchProfile: (id: string) => void;
  deleteProfile: (id: string) => void;
}

const randInt = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
const entry = (at: number, kind: LogKind, text: string): LogEntry => ({ id: uid(), at, kind, text });
const addLog = (log: LogEntry[], ...entries: LogEntry[]) => [...entries.reverse(), ...log].slice(0, 150);
const toNotices = (events: CareerEvent[]): Notice[] => events.map((e) => ({ id: uid(), kind: e.kind, text: e.text }));

function assignUnits(units: Unit[], unitIds: string[], incidentId: string, now: number): Unit[] {
  return units.map((u) =>
    unitIds.includes(u.id) ? { ...u, status: "dispatched", incidentId, statusUntil: now + 2 } : u,
  );
}

/** Call types this seat's apparatus would be sent on. */
function typesForSeat(unit: Unit, role: FieldRole): IncidentTypeId[] {
  const ok = INCIDENT_TYPES.filter((t) => t.plan.some((r) => r.types.includes(unit.type)));
  const list = role === "chief" ? INCIDENT_TYPES.filter((t) => t.plan.some((r) => r.types.includes("chief"))) : ok;
  return (list.length ? list : INCIDENT_TYPES).map((t) => t.id);
}

const freshSession = () => ({
  clock: 0,
  incidents: [] as Incident[],
  units: createFleet(),
  pendingSceneId: null,
  dispatchQuestion: null,
  playerCallAt: null,
});

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      /** Merge accumulated on-duty seconds into the profile. */
      const flushDuty = (profile: Profile): Profile => {
        const d = get().duty;
        const timeOnDuty = { ...profile.timeOnDuty };
        (Object.keys(d) as Role[]).forEach((r) => (timeOnDuty[r] += d[r]));
        set({ duty: { ...ZERO_DUTY } });
        return { ...profile, timeOnDuty };
      };

      const updateIncident = (id: string, fn: (i: Incident) => Incident) =>
        set((s) => ({ incidents: s.incidents.map((i) => (i.id === id ? fn(i) : i)) }));

      /** Leave field role, give the player the console, AI dispatcher off. */
      const toConsole = (reason: string) => {
        const s = get();
        set({
          role: "dispatcher",
          seat: null,
          pendingSceneId: null,
          playerCallAt: null,
          profile: logActivity(flushDuty(s.profile), { kind: "session", text: reason }),
          log: addLog(s.log, entry(s.clock, "system", "You have the CAD console. AI Dispatcher off.")),
        });
      };

      return {
        profile: emptyProfile(),
        others: {},
        role: null,
        seat: null,
        log: [],
        nextCallAt: 3,
        notices: [],
        duty: { ...ZERO_DUTY },
        ...freshSession(),

        startDispatcher: () => {
          const s = get();
          set({
            ...freshSession(),
            role: "dispatcher",
            seat: null,
            nextCallAt: 3,
            log: [entry(0, "system", "You have the CAD console. Tour begins.")],
            profile: logActivity(flushDuty(s.profile), { kind: "session", text: "Started a Dispatcher tour" }),
          });
        },

        startStandby: (seat) => {
          const s = get();
          const units = createFleet();
          const unit = units.find((u) => u.id === seat.unitId);
          const person = unit?.crew.find((c) => c.id === seat.crewId);
          if (!unit || !person) return;
          set({
            ...freshSession(),
            units,
            role: person.role,
            seat,
            nextCallAt: 25,
            playerCallAt: randInt(8, 20),
            log: [entry(0, "system", `${person.rank} ${person.name} in service on ${unit.name}. AI Dispatcher has the console.`)],
            profile: logActivity(flushDuty(s.profile), {
              kind: "session",
              text: `Stood by as ${person.rank} on ${unit.name} (Station ${unit.stationId})`,
            }),
          });
        },

        tick: () => {
          const s = get();
          if (!s.role) return;
          const now = s.clock + 1;
          const ai = s.role !== "dispatcher";
          let log = s.log;
          let profile = s.profile;
          let notices = s.notices;
          let incidents = s.incidents;
          let pendingSceneId = s.pendingSceneId;
          let playerCallAt = s.playerCallAt;
          const playerBusy = incidents.some((i) => i.scene?.status === "active");

          // Unit status timers
          let units = s.units.map((u): Unit => {
            if (u.status === "available" || now < u.statusUntil) return u;
            const inc = incidents.find((i) => i.id === u.incidentId);
            if (u.status === "dispatched" && inc) {
              log = addLog(log, entry(now, "radio", `${u.name} responding to ${inc.address}`));
              return { ...u, status: "enroute", statusUntil: now + travelSeconds(u, inc.zone) };
            }
            if (u.status === "enroute" && inc) {
              log = addLog(log, entry(now, "radio", `${u.name} on scene, ${inc.number}`));
              if (!inc.scene && inc.closeAt === null) {
                incidents = incidents.map((i) => (i.id === inc.id ? { ...i, closeAt: now + randInt(50, 110) } : i));
              }
              return { ...u, status: "onscene", statusUntil: Number.MAX_SAFE_INTEGER };
            }
            if (u.status === "returning") {
              return { ...u, status: "available", incidentId: null, statusUntil: 0 };
            }
            return u;
          });

          // Close finished incidents and send units home
          incidents = incidents.map((i) => {
            if (i.status !== "active" || i.closeAt === null || now < i.closeAt) return i;
            log = addLog(log, entry(now, "radio", `${i.number} under control — all units clearing`));
            units = units.map((u) =>
              u.incidentId === i.id ? { ...u, status: "returning", statusUntil: now + travelSeconds(u, i.zone) } : u,
            );
            return { ...i, status: "closed" };
          });

          // Guarantee the standing-by member a run
          const seatUnit = s.seat ? units.find((u) => u.id === s.seat!.unitId) : undefined;
          if (ai && s.seat && seatUnit && !playerBusy && !pendingSceneId && playerCallAt !== null && now >= playerCallAt) {
            if (seatUnit.status === "available" || seatUnit.status === "returning") {
              const inc = createIncident(now, {
                typeIds: typesForSeat(seatUnit, s.role as FieldRole),
                zone: seatUnit.stationId,
                forPlayer: true,
              });
              incidents = [inc, ...incidents];
              log = addLog(log, entry(now, "call", `911 call: ${inc.address}`));
              playerCallAt = null;
            }
          }

          // Pending calls: AI dispatch or delay penalty
          incidents = incidents.map((i) => {
            if (i.status !== "pending") return i;
            if (ai && now - i.createdAt >= 4) {
              let ids = recommendUnits(i, units);
              // Tone out the player's unit on calls generated for them (even if still returning).
              if (i.forPlayer && seatUnit && !ids.includes(seatUnit.id) && seatUnit.status !== "onscene") {
                const sameType = ids.find((id) => units.find((u) => u.id === id)?.type === seatUnit.type);
                ids = sameType ? ids.map((id) => (id === sameType ? seatUnit.id : id)) : [...ids, seatUnit.id];
              }
              units = assignUnits(units, ids, i.id, now);
              const names = ids.map((id) => units.find((u) => u.id === id)?.name).join(", ");
              log = addLog(
                log,
                entry(now, "ai", ids.length ? `AI Dispatch: ${incidentTypeById(i.typeId).short} → ${names}` : `AI Dispatch: no units available for ${i.number}, requesting mutual aid`),
              );
              let next: Incident = {
                ...i,
                status: "active",
                units: ids,
                dispatch: evaluateDispatch(i, i.typeId, ids, units, now, "ai"),
                closeAt: ids.length ? null : now + 60,
              };
              // Player's unit was toned out → build their scene.
              const mine = s.seat && ids.includes(s.seat.unitId) && !playerBusy && !pendingSceneId;
              if (mine && s.seat) {
                const unit = units.find((u) => u.id === s.seat!.unitId)!;
                const person = unit.crew.find((c) => c.id === s.seat!.crewId)!;
                next = { ...next, scene: createScene(next, person.role, unit, person, now) };
                pendingSceneId = next.id;
                playerCallAt = null;
                log = addLog(log, entry(now, "alert", `TONE OUT — ${unit.name}: ${incidentTypeById(i.typeId).short}, ${i.address}`));
              }
              return next;
            }
            if (!ai && !i.delayFlagged && now - i.createdAt > 60) {
              const r = penalize(profile, 3, `Delayed dispatch on ${i.number} (over 60 s in queue).`);
              profile = r.profile;
              notices = [...notices, ...toNotices(r.events)];
              log = addLog(log, entry(now, "alert", `${i.number} pending over 60 seconds`));
              return { ...i, delayFlagged: true };
            }
            return i;
          });

          // New 911 calls
          let nextCallAt = s.nextCallAt;
          const open = incidents.filter((i) => i.status !== "closed").length;
          if (now >= nextCallAt) {
            if (open < 5) {
              const inc = createIncident(now);
              incidents = [inc, ...incidents.filter((i) => i.status !== "closed" || now - i.createdAt < 400)].slice(0, 20);
              log = addLog(log, entry(now, "call", `911 call: ${inc.address}`));
            }
            nextCallAt = now + (ai ? randInt(30, 60) : randInt(22, 48));
          }

          // Player scene simulation
          incidents = incidents.map((i) => {
            const sc = i.scene;
            if (!sc || sc.status !== "active") return i;
            if (sc.pending && sc.pending.choice !== null) return i; // paused on feedback
            const metrics = decayMetrics(sc);
            let next = { ...sc, metrics };
            if ((metrics.air <= 0 || metrics.safety <= 0) && !sc.maydayTriggered) {
              const unit = units.find((u) => u.id === sc.unitId);
              const phase = maydayPhase(sc.role, i, unit?.name ?? "your company");
              const at = sc.pending ? sc.phaseIndex + 1 : sc.phaseIndex;
              next = {
                ...next,
                phases: [...sc.phases.slice(0, at), phase, ...sc.phases.slice(at)],
                phaseDone: sc.pending ? sc.phaseDone : [],
                maydayTriggered: true,
                metrics: { ...metrics, air: Math.max(metrics.air, 25), safety: Math.max(metrics.safety, 20) },
              };
              log = addLog(log, entry(now, "alert", `MAYDAY — ${unit?.name ?? "member"} on ${i.number}`));
              const r = penalize(profile, 5, `Mayday on ${i.number}: air or scene safety was depleted.`, "write-up");
              profile = r.profile;
              notices = [...notices, ...toNotices(r.events)];
            }
            if (metrics.victim <= 0 && !sc.victimLost) {
              next = { ...next, victimLost: true };
              log = addLog(log, entry(now, "alert", `${i.number}: victim condition critical — patient lost`));
            }
            return { ...i, scene: next };
          });

          set({
            clock: now,
            units,
            incidents,
            log,
            profile,
            notices,
            nextCallAt,
            pendingSceneId,
            playerCallAt,
            duty: { ...s.duty, [s.role]: s.duty[s.role] + 1 },
          });
        },

        dispatchIncident: (incidentId, classifiedAs, unitIds) => {
          const s = get();
          const inc = s.incidents.find((i) => i.id === incidentId);
          if (!inc || inc.status !== "pending") return;
          const now = s.clock;
          const units = assignUnits(s.units, unitIds, incidentId, now);
          const ev = evaluateDispatch(inc, classifiedAs, unitIds, units, now, "player");
          const type = incidentTypeById(inc.typeId);
          let { profile } = s;
          let events: CareerEvent[] = [];
          let r = recordAnswer(profile, "dispatch", ev.classificationCorrect);
          profile = r.profile;
          events = events.concat(r.events);
          r = recordAnswer(profile, "dispatch", ev.missing.length === 0);
          profile = r.profile;
          events = events.concat(r.events);
          const names = unitIds.map((id) => units.find((u) => u.id === id)?.name).join(", ");
          const verdict =
            ev.classificationCorrect && ev.missing.length === 0
              ? "Run card correct."
              : `${ev.classificationCorrect ? "" : `Misclassified — actual: ${type.short}. `}${ev.missing.length ? `Short: ${ev.missing.join(", ")}.` : ""}`;
          profile = logActivity(profile, {
            kind: "dispatch",
            text: `${inc.number} ${type.short} at ${inc.address}: ${verdict}`,
            correct: ev.classificationCorrect && ev.missing.length === 0,
            track: "dispatch",
            context: `Sent ${names}`,
          });
          set({
            units,
            profile,
            notices: [...s.notices, ...toNotices(events)],
            incidents: s.incidents.map((i) => (i.id === incidentId ? { ...i, status: "active", units: unitIds, dispatch: ev } : i)),
            log: addLog(
              s.log,
              entry(now, "dispatch", `${inc.number} dispatched: ${names}`),
              entry(now, ev.classificationCorrect && !ev.missing.length ? "system" : "alert", `CAD review: ${verdict}`),
            ),
            dispatchQuestion:
              Math.random() < 0.6
                ? {
                    incidentId,
                    questionId: pickQuestion("dispatcher", ["dispatch", "gas", "ems", "mayday", "marine", "wildland", "mva", "systems"], []).id,
                    choice: null,
                  }
                : null,
          });
        },

        takeRole: (incidentId, unitId, crewId) => {
          const s = get();
          const inc = s.incidents.find((i) => i.id === incidentId);
          const unit = s.units.find((u) => u.id === unitId);
          const person = unit?.crew.find((c) => c.id === crewId);
          if (!inc || !unit || !person) return;
          const scene = createScene(inc, person.role, unit, person, s.clock);
          set({
            role: person.role,
            seat: { unitId, crewId },
            playerCallAt: null,
            incidents: s.incidents.map((i) => (i.id === incidentId ? { ...i, scene, closeAt: null } : i)),
            profile: logActivity(flushDuty(s.profile), {
              kind: "session",
              text: `Took the seat of ${person.rank} ${person.name} on ${unit.name} (${inc.number})`,
            }),
            log: addLog(s.log, entry(s.clock, "system", `You took the seat of ${person.rank} ${person.name} on ${unit.name}. AI Dispatcher has the console.`)),
          });
        },

        chooseAction: (incidentId, actionIndex) => {
          const sc = get().incidents.find((i) => i.id === incidentId)?.scene;
          if (!sc || sc.pending || sc.status !== "active") return;
          const action = sc.phases[sc.phaseIndex]?.actions[actionIndex];
          if (!action) return;
          const qn = pickQuestion(sc.role, action.topics, sc.usedQuestionIds);
          updateIncident(incidentId, (i) => ({
            ...i,
            scene: { ...sc, pending: { actionIndex, questionId: qn.id, choice: null }, usedQuestionIds: [...sc.usedQuestionIds, qn.id] },
          }));
        },

        answerScene: (incidentId, choice) => {
          const s = get();
          const inc = s.incidents.find((i) => i.id === incidentId);
          const sc = inc?.scene;
          if (!inc || !sc?.pending || sc.pending.choice !== null) return;
          const qn = questionById(sc.pending.questionId);
          if (!qn) return;
          const correct = qn.answer === choice;
          const phase = sc.phases[sc.phaseIndex];
          const action = phase.actions[sc.pending.actionIndex];
          const { profile, events } = recordAnswer(s.profile, qn.level, correct, {
            questionId: qn.id,
            context: `${inc.number} · ${action.label}`,
            text: qn.prompt,
          });
          set({
            profile,
            notices: [...s.notices, ...toNotices(events)],
            log: addLog(s.log, entry(s.clock, correct ? "radio" : "alert", `${action.label}: ${correct ? "executed well" : "poor execution"}`)),
          });
          updateIncident(incidentId, (i) => ({
            ...i,
            scene: {
              ...sc,
              pending: { ...sc.pending!, choice },
              metrics: applyAnswer(sc.metrics, action.focus, correct),
              answers: [...sc.answers, { questionId: qn.id, choice, correct, phase: phase.title, action: action.label }],
            },
          }));
        },

        continueScene: (incidentId) => {
          const s = get();
          const inc = s.incidents.find((i) => i.id === incidentId);
          const sc = inc?.scene;
          if (!inc || !sc?.pending) return;
          const phaseDone = [...sc.phaseDone, sc.pending.actionIndex];
          const phase = sc.phases[sc.phaseIndex];
          const phaseComplete = phaseDone.length >= Math.min(ACTIONS_PER_PHASE, phase.actions.length);
          const nextIndex = phaseComplete ? sc.phaseIndex + 1 : sc.phaseIndex;
          if (nextIndex < sc.phases.length) {
            updateIncident(incidentId, (i) => ({
              ...i,
              scene: { ...sc, pending: null, phaseIndex: nextIndex, phaseDone: phaseComplete ? [] : phaseDone },
            }));
            return;
          }
          const done = { ...sc, pending: null, phaseDone, status: "complete" as const, endedAt: s.clock };
          const g = sceneGrade(done);
          const type = incidentTypeById(inc.typeId);
          const outcome = done.victimLost
            ? "Incident stabilized, but a civilian was lost."
            : done.maydayTriggered
              ? "Incident stabilized after a Mayday. Expect a safety review."
              : g.pct >= 0.7
                ? "Incident stabilized. Textbook operation."
                : "Incident stabilized, with significant tactical errors.";
          let profile = s.profile;
          const notices = [...s.notices];
          if (g.grade === "F") {
            const r = penalize(profile, 6, `Failing performance on ${inc.number} (${g.correct}/${g.total}).`, "write-up");
            profile = r.profile;
            notices.push(...toNotices(r.events));
          }
          profile = {
            ...profile,
            xp: profile.xp + g.correct * 5,
            incidentsByRole: { ...profile.incidentsByRole, [sc.role]: profile.incidentsByRole[sc.role] + 1 },
            history: [
              {
                incidentId: inc.id,
                number: inc.number,
                typeLabel: type.short,
                role: sc.role,
                grade: g.grade,
                correct: g.correct,
                total: g.total,
                outcome,
                date: today(),
              },
              ...profile.history,
            ].slice(0, 2000),
          };
          profile = logActivity(profile, {
            kind: "incident",
            text: `${inc.number} ${type.short} at ${inc.address}: grade ${g.grade} (${g.correct}/${g.total}). ${outcome}`,
            context: inc.conditions,
          });
          set({
            profile,
            notices,
            // Back in service: next run within 60 s of clearing.
            playerCallAt: s.role && s.role !== "dispatcher" ? s.clock + randInt(20, 50) : null,
            incidents: s.incidents.map((i) => (i.id === incidentId ? { ...i, scene: { ...done, outcome }, closeAt: s.clock + 3 } : i)),
          });
        },

        leaveScene: (incidentId) => {
          const s = get();
          const inc = s.incidents.find((i) => i.id === incidentId);
          if (inc?.scene) {
            set({
              incidents: s.incidents.map((i) =>
                i.id === incidentId && i.scene
                  ? { ...i, scene: { ...i.scene, status: "abandoned", pending: null, endedAt: s.clock }, closeAt: i.closeAt ?? s.clock + 45 }
                  : i,
              ),
              profile: logActivity(s.profile, {
                kind: "left-scene",
                text: `Left ${inc.number} ${incidentTypeById(inc.typeId).short} before it ended (${inc.scene.answers.length} decisions made)`,
              }),
            });
          }
          toConsole("Left the field and took the CAD console");
        },

        takeConsole: () => toConsole("Went out of service and took the CAD console"),

        exitToMenu: () => {
          const s = get();
          set({
            role: null,
            seat: null,
            pendingSceneId: null,
            playerCallAt: null,
            dispatchQuestion: null,
            profile: s.role ? logActivity(flushDuty(s.profile), { kind: "session", text: "Ended tour" }) : s.profile,
          });
        },

        answerDispatchQuestion: (choice) => {
          const s = get();
          const dq = s.dispatchQuestion;
          if (!dq || dq.choice !== null) return;
          const qn = questionById(dq.questionId);
          if (!qn) return;
          const inc = s.incidents.find((i) => i.id === dq.incidentId);
          const { profile, events } = recordAnswer(s.profile, "dispatch", qn.answer === choice, {
            questionId: qn.id,
            context: `${inc?.number ?? "Dispatch"} · Pre-arrival`,
            text: qn.prompt,
          });
          set({ profile, notices: [...s.notices, ...toNotices(events)], dispatchQuestion: { ...dq, choice } });
        },

        closeDispatchQuestion: () => set({ dispatchQuestion: null }),

        answerDrill: (questionId, choice) => {
          const s = get();
          const qn = questionById(questionId);
          if (!qn) return false;
          const correct = qn.answer === choice;
          const { profile, events } = recordAnswer(s.profile, qn.level, correct, {
            questionId,
            context: "Practice exam",
            text: qn.prompt,
          });
          set({ profile, notices: [...s.notices, ...toNotices(events)] });
          return correct;
        },

        consumePendingScene: () => set({ pendingSceneId: null }),
        dismissNotice: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
        setName: (name) =>
          set((s) => {
            const next = name.trim() || "Probie";
            if (next === s.profile.name) return {};
            return { profile: logActivity({ ...s.profile, name: next }, { kind: "profile", text: `Renamed to ${next}` }) };
          }),
        resetCareer: () => set((s) => ({ profile: { ...emptyProfile(s.profile.name), id: s.profile.id } })),

        createProfile: (name) => {
          get().exitToMenu();
          const s = get();
          const fresh = emptyProfile(name.trim() || "Probie");
          set({ others: { ...s.others, [s.profile.id]: s.profile }, profile: fresh });
        },

        switchProfile: (id) => {
          const s = get();
          const target = s.others[id];
          if (!target || id === s.profile.id) return;
          get().exitToMenu();
          const current = get().profile;
          const others = { ...s.others, [current.id]: current };
          delete others[id];
          set({
            others,
            profile: logActivity(target, { kind: "profile", text: "Switched to this profile" }),
          });
        },

        deleteProfile: (id) =>
          set((s) => {
            if (id === s.profile.id) return {};
            const others = { ...s.others };
            delete others[id];
            return { others };
          }),
      };
    },
    {
      name: "first-due-career",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ profile: s.profile, others: s.others }),
      version: 2,
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as { profile?: Partial<Profile>; others?: Record<string, Partial<Profile>> };
        const profile = migrateProfile(p.profile ?? {});
        const others = Object.fromEntries(
          Object.entries(version < 2 ? {} : (p.others ?? {})).map(([k, v]) => [k, migrateProfile(v)]),
        );
        return { profile, others };
      },
    },
  ),
);

/** All profiles, active first. */
export const allProfiles = (s: GameState) => [s.profile, ...Object.values(s.others)];
