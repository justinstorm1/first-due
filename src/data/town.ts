import type { CrewMember, FieldRole, Station, Unit, UnitType } from "@/game/types";

/**
 * Fictionalized Middletown Township, NJ. Station numbers, map positions and
 * apparatus assignments are invented for training play and do not reflect the
 * real department's run cards.
 */
export const STATIONS: Station[] = [
  { id: 1, name: "Navesink", x: 82, y: 32 },
  { id: 2, name: "Middletown Village", x: 52, y: 55 },
  { id: 3, name: "Lincroft", x: 30, y: 86 },
  { id: 4, name: "Leonardo", x: 68, y: 14 },
  { id: 5, name: "Port Monmouth", x: 26, y: 20 },
  { id: 6, name: "East Keansburg", x: 40, y: 12 },
  { id: 7, name: "Belford", x: 54, y: 9 },
  { id: 8, name: "River Plaza", x: 78, y: 74 },
  { id: 9, name: "Fairview", x: 58, y: 82 },
  { id: 10, name: "New Monmouth", x: 46, y: 34 },
];

export const stationById = (id: number) =>
  STATIONS.find((s) => s.id === id) ?? STATIONS[0];

const FIRST = [
  "Mike", "Dana", "Chris", "Pat", "Kevin", "Erin", "Joe", "Tara", "Rob", "Kim",
  "Sean", "Lisa", "Tom", "Megan", "Dave", "Nicole", "Brian", "Jess", "Matt", "Ana",
  "Steve", "Kelly", "Ray", "Gina", "Paul", "Amy", "Frank", "Lauren", "Greg", "Rosa",
];
const LAST = [
  "Murphy", "Caruso", "Walsh", "Romano", "Kelly", "DeLuca", "Brennan", "Russo",
  "O'Neill", "Esposito", "Byrne", "Santos", "Doyle", "Marino", "Keane", "Ferrara",
  "Quinn", "Lombardi", "Gallagher", "Ricci", "Hughes", "Costa", "Nolan", "Greco",
];

let nameSeed = 7;
function nextName() {
  nameSeed = (nameSeed * 31 + 17) % 9973;
  return `${FIRST[nameSeed % FIRST.length]} ${LAST[(nameSeed >> 3) % LAST.length]}`;
}

function crewFor(unitId: string, type: UnitType): CrewMember[] {
  const member = (rank: string, role: FieldRole, i: number): CrewMember => ({
    id: `${unitId}-${i}`,
    name: nextName(),
    rank,
    role,
  });
  if (type === "chief") {
    return [member(unitId === "car1" ? "Chief" : unitId === "car2" ? "Deputy Chief" : "Battalion Chief", "chief", 0)];
  }
  if (type === "brush" || type === "tanker" || type === "marine") {
    return [member("Lieutenant", "officer", 0), member("Firefighter", "ff", 1)];
  }
  return [
    member(type === "engine" ? "Captain" : "Lieutenant", "officer", 0),
    member("Firefighter", "ff", 1),
    member("Firefighter", "ff", 2),
  ];
}

type UnitSeed = [id: string, name: string, type: UnitType, stationId: number];

const UNIT_SEEDS: UnitSeed[] = [
  ["e1", "Engine 1", "engine", 1],
  ["e2", "Engine 2", "engine", 2],
  ["e3", "Engine 3", "engine", 3],
  ["e4", "Engine 4", "engine", 4],
  ["e5", "Engine 5", "engine", 5],
  ["e6", "Engine 6", "engine", 6],
  ["e7", "Engine 7", "engine", 7],
  ["e8", "Engine 8", "engine", 8],
  ["e9", "Engine 9", "engine", 9],
  ["e10", "Engine 10", "engine", 10],
  ["l2", "Ladder 2", "ladder", 2],
  ["l7", "Ladder 7", "ladder", 7],
  ["l8", "Ladder 8", "ladder", 8],
  ["r4", "Rescue 4", "rescue", 4],
  ["r10", "Rescue 10", "rescue", 10],
  ["t3", "Tanker 3", "tanker", 3],
  ["t9", "Tanker 9", "tanker", 9],
  ["b1", "Brush 1", "brush", 1],
  ["b3", "Brush 3", "brush", 3],
  ["b9", "Brush 9", "brush", 9],
  ["m4", "Marine 4", "marine", 4],
  ["m5", "Marine 5", "marine", 5],
  ["car1", "Car 1", "chief", 2],
  ["car2", "Car 2", "chief", 10],
  ["car3", "Car 3", "chief", 8],
];

export function createFleet(): Unit[] {
  nameSeed = 7;
  return UNIT_SEEDS.map(([id, name, type, stationId]) => ({
    id,
    name,
    type,
    stationId,
    status: "available",
    incidentId: null,
    statusUntil: 0,
    crew: crewFor(id, type),
  }));
}

export const UNIT_TYPE_LABEL: Record<UnitType, string> = {
  engine: "Engine",
  ladder: "Ladder",
  rescue: "Rescue",
  tanker: "Tanker",
  brush: "Brush",
  marine: "Marine",
  chief: "Chief",
};
