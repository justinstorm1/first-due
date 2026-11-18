import type { IncidentType, IncidentTypeId } from "@/game/types";

/**
 * Call types with a simplified run card (the SOG "plan") used to score dispatches.
 * Addresses are fictional locations on real-sounding local roads.
 */
export const INCIDENT_TYPES: IncidentType[] = [
  {
    id: "res-fire",
    label: "Structure Fire — Residential",
    short: "Res. Structure Fire",
    family: "fire",
    building: "house",
    priority: 1,
    plan: [
      { types: ["engine"], count: 3 },
      { types: ["ladder"], count: 1 },
      { types: ["rescue"], count: 1 },
      { types: ["chief"], count: 1 },
    ],
    calls: [
      [
        "911, what's the address of your emergency?",
        "There's smoke pouring out of the house next door — the upstairs windows are black!",
        "Is anyone inside?",
        "I think the older man who lives there is home, his car's in the driveway.",
      ],
      [
        "911, what's the address of your emergency?",
        "My kitchen is on fire, I tried to put it out and it's in the cabinets now!",
        "Are you out of the house?",
        "I'm on the front lawn with my kids. The smoke alarm is going crazy.",
      ],
    ],
    locations: [
      { address: "14 Hartshorne Ct", zone: 1, note: "2-story wood frame, Type V" },
      { address: "88 Thompson Ave", zone: 4, note: "Cape Cod, finished attic" },
      { address: "221 Kings Hwy", zone: 2, note: "Split-level, attached garage" },
      { address: "9 Brookdale Dr", zone: 3, note: "Lightweight-truss colonial, 2015" },
      { address: "47 Main St, Belford", zone: 7, note: "Older balloon-frame home" },
    ],
  },
  {
    id: "apt-fire",
    label: "Structure Fire — Garden Apartments",
    short: "Apartment Fire",
    family: "fire",
    building: "apartment",
    priority: 1,
    plan: [
      { types: ["engine"], count: 3 },
      { types: ["ladder"], count: 2 },
      { types: ["rescue"], count: 1 },
      { types: ["chief"], count: 1 },
    ],
    calls: [
      [
        "911, what's the address of your emergency?",
        "Building C at the garden apartments — there's fire coming out of a second-floor balcony!",
        "Are people still inside the building?",
        "People are banging on doors, I see someone at a third-floor window!",
      ],
      [
        "911, what's the address of your emergency?",
        "The hallway in my apartment building is full of smoke and I can't get down the stairs.",
        "What floor are you on?",
        "Third floor, apartment 3B. My door is closed but smoke is coming under it.",
      ],
    ],
    locations: [
      { address: "Village Green Apts, Bldg C, Route 35", zone: 8, note: "3-story garden apt, common cockloft" },
      { address: "Bayview Gardens, Bldg 4, Leonardville Rd", zone: 4, note: "24 units, open stairwell" },
      { address: "Twin Brooks Apts, Bldg 2, Harmony Rd", zone: 10, note: "Wood frame over podium" },
    ],
  },
  {
    id: "comm-fire",
    label: "Structure Fire — Commercial / Strip Mall",
    short: "Commercial Fire",
    family: "fire",
    building: "stripmall",
    priority: 1,
    plan: [
      { types: ["engine"], count: 3 },
      { types: ["ladder"], count: 2 },
      { types: ["rescue"], count: 1 },
      { types: ["chief"], count: 1 },
    ],
    calls: [
      [
        "911, what's the address of your emergency?",
        "The pizza place in the plaza on Route 36 — smoke is coming out of the roof!",
        "Is the business open?",
        "Yeah, they were open, customers are running out. The nail salon next door is filling up too.",
      ],
      [
        "911, what's the address of your emergency?",
        "I'm driving on 36 and there's flames behind the dry cleaner in the shopping center.",
        "Can you see which stores are affected?",
        "Back of the building, it's climbing up the wall toward the roof.",
      ],
    ],
    locations: [
      { address: "Bayshore Plaza, 1040 Route 36", zone: 4, note: "Strip mall, shared cockloft, rain roof" },
      { address: "Harmony Commons, 600 Route 35", zone: 2, note: "1-story ordinary construction, Type III" },
      { address: "Port Plaza, 377 Route 36", zone: 5, note: "Taxpayer with apartments above" },
    ],
  },
  {
    id: "veh-fire",
    label: "Vehicle Fire",
    short: "Vehicle Fire",
    family: "fire",
    building: "vehicle",
    priority: 2,
    plan: [{ types: ["engine"], count: 1 }],
    calls: [
      [
        "911, what's the address of your emergency?",
        "My car started smoking from under the hood and now I see flames.",
        "Is everyone out of the vehicle?",
        "Yes, we're on the shoulder. It's an SUV, I think it's a hybrid.",
      ],
    ],
    locations: [
      { address: "Route 36 EB at Laurel Ave", zone: 1, note: "Highway shoulder, live traffic" },
      { address: "Garden State Pkwy SB, MP 114", zone: 9, note: "Limited access highway" },
      { address: "Town Hall lot, Kings Hwy", zone: 2, note: "Parking lot, exposures nearby" },
    ],
  },
  {
    id: "mva-ent",
    label: "MVA with Entrapment",
    short: "MVA / Entrapment",
    family: "mva",
    building: "vehicle",
    priority: 1,
    plan: [
      { types: ["engine"], count: 1 },
      { types: ["rescue"], count: 1 },
      { types: ["chief"], count: 1 },
    ],
    calls: [
      [
        "911, what's the address of your emergency?",
        "Two cars hit head-on on Route 35 — the driver of the sedan can't get out, his door is smashed!",
        "Is he awake and talking?",
        "He's moaning, there's blood on his face. I smell gas.",
      ],
      [
        "911, what's the address of your emergency?",
        "A car went off the road into a pole. The woman inside says her legs are pinned.",
        "Are there any wires down?",
        "The pole is leaning, I can see a wire hanging but not touching the car.",
      ],
    ],
    locations: [
      { address: "Route 35 at Kings Hwy", zone: 2, note: "Divided highway intersection" },
      { address: "Navesink River Rd at Hartshorne Rd", zone: 1, note: "Winding rural road" },
      { address: "Newman Springs Rd at Swimming River Rd", zone: 3, note: "County road, heavy traffic" },
      { address: "Route 36 at Leonardville Rd", zone: 4, note: "State highway" },
    ],
  },
  {
    id: "alarm",
    label: "Fire Alarm Activation",
    short: "Alarm Activation",
    family: "alarm",
    building: "commercial",
    priority: 2,
    plan: [
      { types: ["engine"], count: 1 },
      { types: ["ladder"], count: 1 },
    ],
    calls: [
      [
        "911, this is the central station alarm company.",
        "We have a general fire alarm, waterflow zone, at the medical office building.",
        "Has the keyholder been notified?",
        "We're calling the keyholder now. No callback from the premises.",
      ],
      [
        "911, this is the central station alarm company.",
        "Smoke detector activation, second floor, at the elementary school.",
        "Is the building occupied?",
        "It's after hours, the custodian may be on site.",
      ],
    ],
    locations: [
      { address: "Middletown Medical Arts, 1 Kings Hwy", zone: 2, note: "Sprinklered, 3 stories" },
      { address: "Bayshore Elementary, Church St", zone: 7, note: "School, fully sprinklered" },
      { address: "Lincroft Corporate Ctr, Newman Springs Rd", zone: 3, note: "Office, FDC on side A" },
    ],
  },
  {
    id: "gas",
    label: "Gas Leak / Odor",
    short: "Gas Leak",
    family: "gas",
    building: "house",
    priority: 2,
    plan: [
      { types: ["engine"], count: 1 },
      { types: ["ladder", "rescue"], count: 1 },
    ],
    calls: [
      [
        "911, what's the address of your emergency?",
        "There's a really strong rotten-egg smell in my basement near the furnace.",
        "Are you still inside?",
        "Yes, I'm in the living room.",
      ],
      [
        "911, what's the address of your emergency?",
        "A landscaper just hit a gas line in the front yard — it's hissing loud!",
        "Is anyone hurt?",
        "No, but there's houses all around it.",
      ],
    ],
    locations: [
      { address: "35 Cherry Tree Farm Rd", zone: 10, note: "Natural gas service, basement" },
      { address: "12 Monmouth Ave, Port Monmouth", zone: 5, note: "Natural gas, street main" },
      { address: "160 Chapel Hill Rd", zone: 9, note: "Propane (LPG) tank on property" },
    ],
  },
  {
    id: "elevator",
    label: "Elevator Emergency",
    short: "Elevator Rescue",
    family: "technical",
    building: "commercial",
    priority: 3,
    plan: [{ types: ["rescue", "ladder"], count: 1 }],
    calls: [
      [
        "911, what's the address of your emergency?",
        "We're stuck in the elevator between floors, there's four of us.",
        "Is anyone hurt or having trouble breathing?",
        "No, but one lady is getting really anxious. The alarm button doesn't do anything.",
      ],
    ],
    locations: [
      { address: "Shadow Lake Village Clubhouse", zone: 3, note: "Senior community, 2 elevators" },
      { address: "Middletown Train Station Garage", zone: 2, note: "Parking garage elevator" },
      { address: "Riverview Professional Bldg, Route 35", zone: 8, note: "4-story office" },
    ],
  },
  {
    id: "brush",
    label: "Brush / Wildland Fire",
    short: "Brush Fire",
    family: "wildland",
    building: "woods",
    priority: 2,
    plan: [
      { types: ["brush"], count: 2 },
      { types: ["tanker"], count: 1 },
      { types: ["engine"], count: 1 },
    ],
    calls: [
      [
        "911, what's the address of your emergency?",
        "There's a fire in the woods behind the houses off Navesink River Road. It's spreading fast with this wind.",
        "Is it near any homes?",
        "It's maybe a couple hundred feet from the backyards.",
      ],
    ],
    locations: [
      { address: "Hartshorne Woods, Battery Loop trail", zone: 1, note: "Wooded park, steep slopes" },
      { address: "Tatum Park, Red Hill Rd", zone: 9, note: "Fields and woodland, no hydrants" },
      { address: "Poricy Park, Oak Hill Rd", zone: 10, note: "Wetland/woods interface" },
    ],
  },
  {
    id: "marine",
    label: "Boat Fire / Marine Emergency",
    short: "Boat Fire",
    family: "marine",
    building: "boat",
    priority: 1,
    plan: [
      { types: ["marine"], count: 1 },
      { types: ["engine"], count: 2 },
    ],
    calls: [
      [
        "911, what's the address of your emergency?",
        "A boat is on fire at the marina — it's tied up at the dock next to a bunch of other boats!",
        "Is anyone on board?",
        "The owner jumped onto the dock, I think he's burned on his arm.",
      ],
    ],
    locations: [
      { address: "Leonardo State Marina, Dock C", zone: 4, note: "Fuel dock adjacent, ~180 slips" },
      { address: "Port Monmouth Marina, Pews Creek", zone: 5, note: "Narrow creek, limited access" },
      { address: "Navesink River boat ramp", zone: 1, note: "Shallow tidal river" },
    ],
  },
];

export const incidentTypeById = (id: IncidentTypeId) =>
  INCIDENT_TYPES.find((t) => t.id === id) ?? INCIDENT_TYPES[0];
