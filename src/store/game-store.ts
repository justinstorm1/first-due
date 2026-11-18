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
  maydayPhase,
  penalize,
  pick,
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
  Unit,
} from "@/game/types";

/** Phases need this many resolved actions before advancing. */
export const ACTIONS_PER_PHASE = 2;

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

interface GameState {
  profile: Profile;
  role: Role | null;
  clock: number;
  incidents: Incident[];
  units: Unit[];
  log: LogEntry[];
  nextCallAt: number;
  autoDispatchAt: number | null;
  pendingSceneId: string | null;
  notices: Notice[];
  dispatchQuestion: DispatchQuestion | null;

  startSession: (role: Role) => string | null;
  tick: () => void;
  dispatchIncident: (incidentId: string, classifiedAs: IncidentTypeId, unitIds: string[]) => void;
  takeRole: (incidentId: string, unitId: string, crewId: string) => void;
  chooseAction: (incidentId: string, actionIndex: number) => void;
  answerScene: (incidentId: string, choice: number) => void;
  continueScene: (incidentId: string) => void;
  respondNow: () => string | null;
  returnToDispatch: () => void;
  exitToMenu: () => void;
  answerDispatchQuestion: (choice: number) => void;
  closeDispatchQuestion: () => void;
  consumePendingScene: () => void;
  dismissNotice: (id: string) => void;
  setName: (name: string) => void;
  resetCareer: () => void;
}

const randInt = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
const entry = (at: number, kind: LogKind, text: string): LogEntry => ({ id: uid(), at, kind, text });
const addLog = (log: LogEntry[], ...entries: LogEntry[]) => [...entries.reverse(), ...log].slice(0, 120);
const toNotices = (events: CareerEvent[]): Notice[] => events.map((e) => ({ id: uid(), kind: e.kind, text: e.text }));

/** Mark units as dispatched to an incident. */
function assignUnits(units: Unit[], unitIds: string[], incidentId: string, now: number): Unit[] {
  return units.map((u) =>
    unitIds.includes(u.id)
      ? { ...u, status: "dispatched", incidentId, statusUntil: now + 2 }
      : u,
  );
}

const FIELD_TYPES: Record<FieldRole, IncidentTypeId[]> = {
  ff: INCIDENT_TYPES.map((t) => t.id),
  officer: INCIDENT_TYPES.map((t) => t.id),
  chief: INCIDENT_TYPES.filter((t) => t.plan.some((r) => r.types.includes("chief"))).map((t) => t.id),
};

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      /** AI-dispatch a new incident and put the player on a responding unit. */
      const createFieldIncident = (role: FieldRole): string | null => {
        const s = get();
        const now = s.clock;
        const incident = createIncident(now, pick(FIELD_TYPES[role]));
        let unitIds = recommendUnits(incident, s.units);
        let units = s.units;
        const fits = (u: Unit) => u.crew.some((c) => c.role === role);
        let mine = units.find((u) => unitIds.includes(u.id) && fits(u));
        if (!mine) {
          // Everyone is busy: pull the nearest qualified unit off its current assignment.
          mine = [...units]
            .filter(fits)
            .sort((x, y) => travelSeconds(x, incident.zone) - travelSeconds(y, incident.zone))[0];
          unitIds = [...unitIds, mine.id];
        }
        units = assignUnits(units, unitIds, incident.id, now);
        const person = mine.crew.find((c) => c.role === role)!;
        const scene = createScene(incident, role, mine, { name: s.profile.name, rank: person.rank }, now);
        const type = incidentTypeById(incident.typeId);
        const dispatched: Incident = {
          ...incident,
          status: "active",
          units: unitIds,
          dispatch: evaluateDispatch(incident, incident.typeId, unitIds, units, now, "ai"),
          scene,
        };
        set({
          units,
          incidents: [dispatched, ...s.incidents.filter((i) => i.status !== "closed").slice(0, 12)],
          autoDispatchAt: null,
          log: addLog(
            s.log,
            entry(now, "call", `${incident.number} ${type.short} — ${incident.address}`),
            entry(now, "ai", `AI Dispatch: ${unitIds.map((id) => units.find((u) => u.id === id)?.name).join(", ")} assigned`),
            entry(now, "radio", `You're riding ${mine.name} as ${person.rank} ${s.profile.name}.`),
          ),
        });
        return dispatched.id;
      };

      const updateIncident = (id: string, fn: (i: Incident) => Incident) =>
        set((s) => ({ incidents: s.incidents.map((i) => (i.id === id ? fn(i) : i)) }));

      return {
        profile: emptyProfile(),
        role: null,
        clock: 0,
        incidents: [],
        units: createFleet(),
        log: [],
        nextCallAt: 3,
        autoDispatchAt: null,
        pendingSceneId: null,
        notices: [],
        dispatchQuestion: null,

        startSession: (role) => {
          set({
            role,
            clock: 0,
            incidents: [],
            units: createFleet(),
            log: [entry(0, "system", role === "dispatcher" ? "You have the CAD console. Tour begins." : "AI Dispatcher has the console.")],
            nextCallAt: role === "dispatcher" ? 3 : 40,
            autoDispatchAt: null,
            pendingSceneId: null,
            dispatchQuestion: null,
          });
          if (role === "dispatcher") return null;
          return createFieldIncident(role);
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

          // Pending calls: AI dispatch or delay penalty
          incidents = incidents.map((i) => {
            if (i.status !== "pending") return i;
            if (ai && now - i.createdAt >= 4) {
              const ids = recommendUnits(i, units);
              units = assignUnits(units, ids, i.id, now);
              const names = ids.map((id) => units.find((u) => u.id === id)?.name).join(", ");
              log = addLog(
                log,
                entry(now, "ai", ids.length ? `AI Dispatch: ${incidentTypeById(i.typeId).short} → ${names}` : `AI Dispatch: no units available for ${i.number}, requesting mutual aid`),
              );
              return {
                ...i,
                status: "active",
                units: ids,
                dispatch: evaluateDispatch(i, i.typeId, ids, units, now, "ai"),
                closeAt: ids.length ? null : now + 60,
              };
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
            nextCallAt = now + (ai ? randInt(35, 70) : randInt(22, 48));
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
              const phases = [...sc.phases.slice(0, at), phase, ...sc.phases.slice(at)];
              next = {
                ...next,
                phases,
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

          // Auto-dispatch loop for field roles
          set({ clock: now, units, incidents, log, profile, notices, nextCallAt });
          if (ai && s.autoDispatchAt !== null && now >= s.autoDispatchAt) {
            const id = createFieldIncident(s.role as FieldRole);
            set({ pendingSceneId: id });
          }
        },

        dispatchIncident: (incidentId, classifiedAs, unitIds) => {
          const s = get();
          const inc = s.incidents.find((i) => i.id === incidentId);
          if (!inc || inc.status !== "pending") return;
          const now = s.clock;
          const units = assignUnits(s.units, unitIds, incidentId, now);
          const ev = evaluateDispatch(inc, classifiedAs, unitIds, units, now, "player");
          let { profile } = s;
          let events: CareerEvent[] = [];
          let r = recordAnswer(profile, "dispatch", ev.classificationCorrect);
          profile = r.profile;
          events = events.concat(r.events);
          r = recordAnswer(profile, "dispatch", ev.missing.length === 0);
          profile = r.profile;
          events = events.concat(r.events);
          const type = incidentTypeById(inc.typeId);
          const names = unitIds.map((id) => units.find((u) => u.id === id)?.name).join(", ");
          const verdict =
            ev.classificationCorrect && ev.missing.length === 0
              ? "Run card correct."
              : `${ev.classificationCorrect ? "" : `Misclassified — actual: ${type.short}. `}${ev.missing.length ? `Short: ${ev.missing.join(", ")}.` : ""}`;
          const wantQuestion = Math.random() < 0.6;
          set({
            units,
            profile,
            notices: [...s.notices, ...toNotices(events)],
            incidents: s.incidents.map((i) =>
              i.id === incidentId ? { ...i, status: "active", units: unitIds, dispatch: ev } : i,
            ),
            log: addLog(
              s.log,
              entry(now, "dispatch", `${inc.number} dispatched: ${names}`),
              entry(now, ev.classificationCorrect && !ev.missing.length ? "system" : "alert", `CAD review: ${verdict}`),
            ),
            dispatchQuestion: wantQuestion
              ? { incidentId, questionId: pickQuestion("dispatcher", ["dispatch", "gas", "ems", "mayday", "marine", "wildland", "mva", "systems"], []).id, choice: null }
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
            autoDispatchAt: null,
            incidents: s.incidents.map((i) => (i.id === incidentId ? { ...i, scene, closeAt: null } : i)),
            log: addLog(
              s.log,
              entry(s.clock, "system", `You took the seat of ${person.rank} ${person.name} on ${unit.name}. AI Dispatcher has the console.`),
            ),
          });
        },

        chooseAction: (incidentId, actionIndex) => {
          const inc = get().incidents.find((i) => i.id === incidentId);
          const sc = inc?.scene;
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
          if (!sc?.pending || sc.pending.choice !== null) return;
          const qn = questionById(sc.pending.questionId);
          if (!qn) return;
          const correct = qn.answer === choice;
          const phase = sc.phases[sc.phaseIndex];
          const action = phase.actions[sc.pending.actionIndex];
          const { profile, events } = recordAnswer(s.profile, qn.level, correct);
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
          // Scene complete
          const done = { ...sc, pending: null, phaseDone, status: "complete" as const, endedAt: s.clock };
          const g = sceneGrade(done);
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
                typeLabel: incidentTypeById(inc.typeId).short,
                role: sc.role,
                grade: g.grade,
                correct: g.correct,
                total: g.total,
                outcome,
                date: today(),
              },
              ...profile.history,
            ].slice(0, 30),
          };
          set({
            profile,
            notices,
            autoDispatchAt: s.role && s.role !== "dispatcher" ? s.clock + randInt(20, 55) : null,
            incidents: s.incidents.map((i) =>
              i.id === incidentId ? { ...i, scene: { ...done, outcome }, closeAt: s.clock + 3 } : i,
            ),
          });
        },

        respondNow: () => {
          const role = get().role;
          if (!role || role === "dispatcher") return null;
          return createFieldIncident(role);
        },

        returnToDispatch: () =>
          set((s) => ({
            role: "dispatcher",
            autoDispatchAt: null,
            pendingSceneId: null,
            log: addLog(s.log, entry(s.clock, "system", "You're back in the CAD chair. AI Dispatcher released.")),
          })),

        exitToMenu: () => set({ role: null, autoDispatchAt: null, pendingSceneId: null, dispatchQuestion: null }),

        answerDispatchQuestion: (choice) => {
          const s = get();
          const dq = s.dispatchQuestion;
          if (!dq || dq.choice !== null) return;
          const qn = questionById(dq.questionId);
          if (!qn) return;
          const { profile, events } = recordAnswer(s.profile, "dispatch", qn.answer === choice);
          set({ profile, notices: [...s.notices, ...toNotices(events)], dispatchQuestion: { ...dq, choice } });
        },

        closeDispatchQuestion: () => set({ dispatchQuestion: null }),
        consumePendingScene: () => set({ pendingSceneId: null }),
        dismissNotice: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
        setName: (name) => set((s) => ({ profile: { ...s.profile, name: name.trim() || "Probie" } })),
        resetCareer: () => set({ profile: emptyProfile() }),
      };
    },
    {
      name: "first-due-career",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ profile: s.profile }),
      version: 1,
    },
  ),
);
