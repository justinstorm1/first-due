import type { Escalation, IncidentTypeId } from "@/game/types";

/**
 * Scenario updates that can arrive after a call is dispatched. The CAD marks the call
 * "UPDATED" and the dispatcher must add the newly required apparatus before the deadline.
 */
export const ESCALATIONS: Partial<Record<IncidentTypeId, { chance: number; options: Escalation[] }>> = {
  alarm: {
    chance: 0.55,
    options: [
      { toType: "comm-fire", text: "First engine on scene: smoke showing from the roof on side C. We have a working fire. Fill out the box with a full commercial assignment." },
      { toType: "comm-fire", text: "Ladder on scene: heavy smoke in the 2nd-floor corridor and a sprinkler flowing. Confirmed fire. Upgrade to a structure fire assignment." },
    ],
  },
  gas: {
    chance: 0.35,
    options: [
      { toType: "res-fire", text: "Engine on scene: the gas ignited. Fire in the basement, possible occupant trapped. Upgrade to a residential structure fire." },
    ],
  },
  co: {
    chance: 0.35,
    options: [
      { extra: [{ types: ["engine"], count: 1 }, { types: ["rescue"], count: 1 }], text: "Engine on scene: two occupants unconscious, CO at 400 ppm. Send an additional engine and the rescue for patient removal." },
    ],
  },
  "veh-fire": {
    chance: 0.35,
    options: [
      { toType: "res-fire", text: "Engine on scene: fire has extended from the car into the attached garage. Upgrade to a residential structure fire." },
    ],
  },
  "mva-ent": {
    chance: 0.35,
    options: [
      { extra: [{ types: ["engine"], count: 1 }, { types: ["rescue", "ladder"], count: 1 }], text: "Rescue on scene: two vehicles, two entrapped, fuel leaking. Send an additional engine and another rescue or ladder." },
    ],
  },
  brush: {
    chance: 0.4,
    options: [
      { extra: [{ types: ["brush"], count: 1 }, { types: ["tanker"], count: 1 }, { types: ["engine"], count: 1 }], text: "Brush unit: fire jumped the trail and is running toward homes. Request another brush unit, a tanker, and an engine for structure protection." },
    ],
  },
  "res-fire": {
    chance: 0.35,
    options: [
      { extra: [{ types: ["engine"], count: 2 }, { types: ["ladder"], count: 1 }], text: "Command: fire through the roof, extending to exposure B. Strike a 2nd alarm: two engines and a ladder." },
    ],
  },
  "apt-fire": {
    chance: 0.4,
    options: [
      { extra: [{ types: ["engine"], count: 2 }, { types: ["ladder"], count: 1 }, { types: ["chief"], count: 1 }], text: "Command: fire in the cockloft running the length of the building. 2nd alarm: two engines, a ladder, and another chief officer." },
    ],
  },
  "comm-fire": {
    chance: 0.3,
    options: [
      { extra: [{ types: ["engine"], count: 2 }, { types: ["tanker"], count: 1 }], text: "Command: hydrant pressure is poor on Route 36. Send two engines and a tanker for water supply." },
    ],
  },
  marine: {
    chance: 0.4,
    options: [
      { extra: [{ types: ["marine"], count: 1 }, { types: ["engine"], count: 1 }], text: "Marine unit: fire spread to the adjacent sailboat. Send another marine unit and an engine to the dock." },
    ],
  },
  elevator: {
    chance: 0.25,
    options: [
      { extra: [{ types: ["engine"], count: 1 }], text: "Rescue on scene: occupant in the car is in cardiac arrest. Send the closest engine for CPR assist." },
    ],
  },
};

/** Seconds the dispatcher has to fill an update before it counts as missed. */
export const UPDATE_WINDOW = 75;
