import type { FieldRole, SceneAction, SceneFamily } from "@/game/types";

export interface PhaseDef {
  key: string;
  title: string;
  /** Placeholders: {unit} {address} {note} {seat} */
  text: string;
  actions: Record<FieldRole, SceneAction[]>;
}

const a = (label: string, icon: SceneAction["icon"], topics: SceneAction["topics"], focus: SceneAction["focus"]): SceneAction =>
  ({ label, icon, topics, focus });

const FIRE: PhaseDef[] = [
  {
    key: "arrival",
    title: "Arrival & Size-Up",
    text: "{unit} pulls up to {address} ({note}). Thick, dark smoke is pushing from the eaves and a neighbor is waving you toward the front door. {seat}",
    actions: {
      ff: [a("Stretch the attack line", "droplets", ["hose", "water"], "fire"), a("Don SCBA & check air", "gauge", ["scba"], "air"), a("Throw a ground ladder", "ladder", ["ladders"], "safety")],
      officer: [a("Transmit initial report", "radio", ["sizeup"], "safety"), a("Complete a 360° walk-around", "eye", ["sizeup", "construction"], "safety"), a("Set up two-out / RIC", "users", ["ric", "safety"], "safety")],
      chief: [a("Assume command & set the CP", "megaphone", ["ics"], "safety"), a("Request additional alarm", "siren", ["strategy", "ics"], "morale"), a("Establish staging", "map", ["ics"], "safety")],
    },
  },
  {
    key: "attack",
    title: "Initial Attack",
    text: "Fire is venting from a window on side B. The front door is locked and heat is building inside. Water supply is coming from the hydrant down the block. {seat}",
    actions: {
      ff: [a("Advance & flow water", "droplets", ["hose", "behavior"], "fire"), a("Coordinate horizontal vent", "wind", ["ventilation"], "thermal"), a("Force the front door", "hammer", ["forcible"], "victim")],
      officer: [a("Choose the attack mode", "flame", ["behavior", "strategy"], "fire"), a("Control the flow path", "wind", ["ventilation"], "thermal"), a("Size the attack line", "droplets", ["hose", "water"], "fire")],
      chief: [a("Assign divisions & groups", "clipboard", ["ics"], "morale"), a("Decide offensive vs defensive", "shield", ["strategy"], "safety"), a("Assign a safety officer", "shield", ["safety"], "safety")],
    },
  },
  {
    key: "search",
    title: "Search & Rescue",
    text: "A neighbor reports an occupant may be trapped on the second floor (Division 2). Visibility is near zero and the smoke is getting darker and faster. {seat}",
    actions: {
      ff: [a("Primary search", "search", ["search"], "victim"), a("Read the smoke", "eye", ["behavior"], "thermal"), a("Manage your air", "gauge", ["scba"], "air")],
      officer: [a("Direct the search team", "search", ["search"], "victim"), a("Call for a PAR", "users", ["ric"], "safety"), a("Check structural stability", "building", ["construction"], "safety")],
      chief: [a("Position the RIC", "users", ["ric"], "safety"), a("Watch for collapse indicators", "alert", ["construction", "strategy"], "safety"), a("Conduct a PAR", "clipboard", ["ics", "ric"], "morale")],
    },
  },
  {
    key: "overhaul",
    title: "Overhaul & Termination",
    text: "The main body of fire is knocked down. Steam is lifting and crews are tired. Hidden fire may still be in the walls and ceilings, and the fire marshal is on the way. {seat}",
    actions: {
      ff: [a("Open up for extension", "hammer", ["overhaul"], "fire"), a("Keep SCBA on in overhaul", "gauge", ["overhaul", "scba"], "safety"), a("Preserve the area of origin", "search", ["investigation"], "morale")],
      officer: [a("Rotate crews to rehab", "heart", ["safety"], "morale"), a("Protect evidence", "search", ["investigation"], "morale"), a("Check for hidden fire", "thermometer", ["overhaul"], "fire")],
      chief: [a("Rehab & accountability", "heart", ["safety"], "morale"), a("Transfer or terminate command", "megaphone", ["ics"], "safety"), a("Schedule a post-incident analysis", "clipboard", ["strategy"], "morale")],
    },
  },
];

const VEHICLE_FIRE: PhaseDef[] = [
  {
    key: "approach",
    title: "Approach & Positioning",
    text: "{unit} arrives at {address} ({note}). An SUV is fully involved in the engine compartment, flames are rolling under the windshield, and traffic is slowing to look. {seat}",
    actions: {
      ff: [a("Approach at a 45° angle", "car", ["mva"], "safety"), a("Full PPE & SCBA", "gauge", ["scba", "safety"], "air"), a("Stretch the attack line", "droplets", ["hose"], "fire")],
      officer: [a("Position apparatus to block", "truck", ["mva", "safety"], "safety"), a("Size-up: fuel type & hazards", "eye", ["hazmat", "sizeup"], "safety"), a("Assign the line & the irons", "users", ["leadership", "hose"], "fire")],
      chief: [a("Traffic incident management", "alert", ["mva", "safety"], "safety"), a("Coordinate with PD", "users", ["ics"], "morale"), a("Hazmat runoff concerns", "droplets", ["hazmat"], "safety")],
    },
  },
  {
    key: "extinguish",
    title: "Extinguishment",
    text: "The tires are burning, a strut just vented with a bang, and fuel is starting to run toward the storm drain. {seat}",
    actions: {
      ff: [a("Knock down the fire", "droplets", ["hose", "behavior"], "fire"), a("Stay clear of bumpers & struts", "shield", ["mva", "safety"], "safety"), a("Foam the fuel spill", "droplets", ["hose", "hazmat"], "fire")],
      officer: [a("Control the runoff", "droplets", ["hazmat"], "safety"), a("Check for an EV / hybrid battery", "zap", ["hazmat", "mva"], "safety"), a("Crew positioning", "users", ["safety"], "safety")],
      chief: [a("Request a hazmat/DEP notification", "radio", ["hazmat"], "safety"), a("Monitor crew safety", "shield", ["safety"], "safety"), a("Resource check", "truck", ["strategy"], "morale")],
    },
  },
  {
    key: "overhaul",
    title: "Overhaul & Clear",
    text: "Fire's out. The engine compartment is still steaming and the hood is jammed shut. {seat}",
    actions: {
      ff: [a("Force the hood & overhaul", "hammer", ["forcible", "overhaul"], "fire"), a("Keep SCBA on in overhaul", "gauge", ["overhaul", "scba"], "safety"), a("Note the area of origin", "search", ["investigation"], "morale")],
      officer: [a("Origin & cause notes", "search", ["investigation"], "morale"), a("Release to PD / tow", "check", ["ics"], "morale"), a("Crew rehab", "heart", ["safety"], "morale")],
      chief: [a("Terminate command", "megaphone", ["ics"], "morale"), a("Clear the roadway", "truck", ["mva"], "safety"), a("Review for the PIA", "clipboard", ["strategy"], "morale")],
    },
  },
];

const MVA: PhaseDef[] = [
  {
    key: "scene",
    title: "Scene Safety & Blocking",
    text: "{unit} arrives at {address} ({note}). Two vehicles are heavily damaged, one driver is pinned, fluids are leaking, and traffic is still moving past. {seat}",
    actions: {
      ff: [a("Stabilize the vehicle", "wrench", ["extrication"], "safety"), a("Pull a protective line", "droplets", ["hose", "mva"], "safety"), a("Set up traffic protection", "alert", ["mva", "safety"], "safety")],
      officer: [a("Position for blocking", "truck", ["mva", "safety"], "safety"), a("Size-up & triage", "activity", ["ems", "sizeup"], "victim"), a("Hazard control", "zap", ["hazmat", "safety"], "safety")],
      chief: [a("Unified command with PD/EMS", "users", ["ics"], "morale"), a("Traffic incident management", "alert", ["mva", "safety"], "safety"), a("Request additional resources", "radio", ["strategy", "ics"], "victim")],
    },
  },
  {
    key: "extricate",
    title: "Extrication",
    text: "The driver is conscious and pinned by the dashboard. The airbags didn't deploy. Glass is everywhere and the patient is getting worse. {seat}",
    actions: {
      ff: [a("Mind the airbags", "alert", ["extrication"], "safety"), a("Gain access & cut", "wrench", ["extrication"], "victim"), a("Patient care", "heart", ["ems"], "victim")],
      officer: [a("Plan the extrication", "clipboard", ["extrication"], "victim"), a("Crew safety check", "shield", ["safety", "extrication"], "safety"), a("Patient priority", "heart", ["ems"], "victim")],
      chief: [a("Monitor the clock (golden hour)", "timer", ["ems", "strategy"], "victim"), a("Coordinate the medevac LZ", "map", ["ics"], "victim"), a("Ensure crew safety", "shield", ["safety"], "safety")],
    },
  },
  {
    key: "clear",
    title: "Patient Transfer & Cleanup",
    text: "The patient is out and packaged. Fluids are still pooled on the roadway and police want to reopen lanes. {seat}",
    actions: {
      ff: [a("Contain the fluid spill", "droplets", ["hazmat"], "safety"), a("Hand off the patient", "heart", ["ems"], "victim"), a("Pick up equipment safely", "truck", ["mva", "safety"], "safety")],
      officer: [a("Hazmat absorbent / notify", "droplets", ["hazmat"], "safety"), a("Release the scene", "check", ["ics", "mva"], "morale"), a("Crew debrief", "users", ["leadership"], "morale")],
      chief: [a("Terminate unified command", "megaphone", ["ics"], "morale"), a("Notify DEP of the spill", "droplets", ["hazmat"], "safety"), a("Review for the PIA", "clipboard", ["strategy"], "morale")],
    },
  },
];

const WILDLAND: PhaseDef[] = [
  {
    key: "size",
    title: "Wildland Size-Up",
    text: "{unit} reaches {address} ({note}). Fire is running uphill through the brush with a 15 mph wind pushing it toward the backyards. {seat}",
    actions: {
      ff: [a("Confirm LCES", "eye", ["wildland"], "safety"), a("Fill & check the brush unit", "droplets", ["water"], "fire"), a("PPE & hydration", "heart", ["safety"], "morale")],
      officer: [a("Post lookouts / LCES", "eye", ["wildland"], "safety"), a("Plan the anchor point", "map", ["wildland"], "fire"), a("Request a tanker shuttle", "truck", ["water"], "fire")],
      chief: [a("Structure triage", "home", ["wildland"], "victim"), a("Evacuation coordination", "users", ["ics"], "victim"), a("Establish divisions", "clipboard", ["ics"], "safety")],
    },
  },
  {
    key: "attack",
    title: "Flanking Attack",
    text: "The left flank is building and the head is about 150 feet from a fence line and a shed. {seat}",
    actions: {
      ff: [a("Work from the anchor", "trees", ["wildland"], "fire"), a("Protect the shed exposure", "home", ["hose", "wildland"], "victim"), a("Watch your escape route", "eye", ["wildland", "safety"], "safety")],
      officer: [a("Flank attack plan", "trees", ["wildland"], "fire"), a("Structure protection", "home", ["wildland"], "victim"), a("Crew accountability", "users", ["ric", "safety"], "safety")],
      chief: [a("Allocate resources to the head", "truck", ["strategy", "wildland"], "fire"), a("Weather watch", "wind", ["wildland"], "safety"), a("Request mutual aid", "radio", ["strategy"], "fire")],
    },
  },
  {
    key: "mopup",
    title: "Mop-Up",
    text: "Forward spread has stopped. Hot spots are smoldering along the perimeter and stumps are still burning. {seat}",
    actions: {
      ff: [a("Cold-trail the edge", "search", ["wildland", "overhaul"], "fire"), a("Rehab & hydrate", "heart", ["safety"], "morale"), a("Check the burned area safely", "eye", ["wildland"], "safety")],
      officer: [a("Mop-up assignments", "clipboard", ["wildland", "overhaul"], "fire"), a("Crew rehab", "heart", ["safety"], "morale"), a("Cause & origin notes", "search", ["investigation"], "morale")],
      chief: [a("Demobilize resources", "truck", ["ics"], "morale"), a("Re-burn watch plan", "eye", ["wildland"], "fire"), a("Post-incident review", "clipboard", ["strategy"], "morale")],
    },
  },
];

const MARINE: PhaseDef[] = [
  {
    key: "arrival",
    title: "Marina Arrival",
    text: "{unit} arrives at {address} ({note}). A 30-foot cabin cruiser is burning at the slip, with flames lapping the boats on either side. {seat}",
    actions: {
      ff: [a("Stretch a line down the dock", "droplets", ["hose", "marine"], "fire"), a("Check bilge vapor hazards", "alert", ["marine"], "safety"), a("Treat the burned owner", "heart", ["ems"], "victim")],
      officer: [a("Exposure protection plan", "anchor", ["marine"], "fire"), a("Dock & fuel hazards", "alert", ["marine", "hazmat"], "safety"), a("Size-up report", "radio", ["sizeup"], "safety")],
      chief: [a("Unified command with USCG/State Police", "users", ["ics"], "morale"), a("Water-side resources", "anchor", ["marine", "strategy"], "fire"), a("Isolation distance", "map", ["hazmat"], "safety")],
    },
  },
  {
    key: "attack",
    title: "Fire Attack & Exposures",
    text: "Fuel is burning on the water's surface near the stern. The adjacent sailboat's lines are smoking. {seat}",
    actions: {
      ff: [a("Apply foam", "droplets", ["hose"], "fire"), a("Cut the adjacent boat loose", "anchor", ["marine"], "victim"), a("Avoid sinking the vessel", "droplets", ["marine"], "safety")],
      officer: [a("Foam operations", "droplets", ["hose"], "fire"), a("Protect the fuel dock", "anchor", ["marine"], "safety"), a("Crew on the floating dock", "shield", ["safety"], "safety")],
      chief: [a("Containment boom / DEP", "droplets", ["hazmat"], "safety"), a("Request a fireboat", "radio", ["strategy"], "fire"), a("Media & public info", "megaphone", ["ics"], "morale")],
    },
  },
  {
    key: "overhaul",
    title: "Overhaul & Pollution Control",
    text: "The fire is out. The hull is listing and a sheen of fuel is drifting toward the channel. {seat}",
    actions: {
      ff: [a("Overhaul compartments", "hammer", ["overhaul"], "fire"), a("Deploy absorbent pads", "droplets", ["hazmat"], "safety"), a("Preserve evidence", "search", ["investigation"], "morale")],
      officer: [a("Hazmat notification", "droplets", ["hazmat"], "safety"), a("Origin & cause", "search", ["investigation"], "morale"), a("Release units", "check", ["ics"], "morale")],
      chief: [a("Transfer to USCG / DEP", "megaphone", ["ics"], "safety"), a("Scene security", "shield", ["safety"], "safety"), a("PIA notes", "clipboard", ["strategy"], "morale")],
    },
  },
];

const GAS: PhaseDef[] = [
  {
    key: "approach",
    title: "Approach & Evacuate",
    text: "{unit} arrives at {address} ({note}). You can smell gas from the street and a family is standing in the doorway. {seat}",
    actions: {
      ff: [a("Meter from the outside in", "gauge", ["gas"], "safety"), a("Eliminate ignition sources", "zap", ["gas"], "safety"), a("Evacuate occupants", "users", ["gas", "safety"], "victim")],
      officer: [a("Approach plan (upwind)", "wind", ["hazmat", "gas"], "safety"), a("Evacuation zone", "map", ["gas"], "victim"), a("Notify the utility", "radio", ["gas", "dispatch"], "safety")],
      chief: [a("Isolation & evacuation", "map", ["hazmat"], "victim"), a("Establish command", "megaphone", ["ics"], "safety"), a("Utility liaison", "users", ["ics"], "morale")],
    },
  },
  {
    key: "control",
    title: "Meter & Ventilate",
    text: "Readings are rising near the basement stairs. A pilot light is still lit somewhere below. {seat}",
    actions: {
      ff: [a("Ventilate safely", "wind", ["ventilation", "gas"], "safety"), a("Stand by with a charged line", "droplets", ["hose"], "safety"), a("Check the low areas", "search", ["gas"], "safety")],
      officer: [a("Interpret meter readings", "gauge", ["gas", "hazmat"], "safety"), a("Ventilation strategy", "wind", ["ventilation"], "safety"), a("Protective line", "droplets", ["hose"], "safety")],
      chief: [a("Hazmat zone control", "shield", ["hazmat"], "safety"), a("Escalation triggers", "alert", ["strategy"], "safety"), a("Public notification", "megaphone", ["ics"], "morale")],
    },
  },
  {
    key: "handoff",
    title: "Utility Hand-Off",
    text: "The utility crew has arrived to shut down the service. Readings are falling. {seat}",
    actions: {
      ff: [a("Re-meter the structure", "gauge", ["gas"], "safety"), a("Pick up equipment", "truck", ["safety"], "morale"), a("Brief the occupants", "users", ["gas"], "morale")],
      officer: [a("Turn over to the utility", "check", ["ics", "gas"], "morale"), a("Document readings", "file", ["gas"], "morale"), a("Company debrief", "users", ["leadership"], "morale")],
      chief: [a("Terminate command", "megaphone", ["ics"], "morale"), a("Return units to service", "truck", ["dispatch"], "morale"), a("Review the response", "clipboard", ["strategy"], "morale")],
    },
  },
];

const ALARM: PhaseDef[] = [
  {
    key: "investigate",
    title: "Investigate the Alarm",
    text: "{unit} arrives at {address} ({note}). The alarm is sounding but nothing is showing from the outside. The keyholder is 20 minutes out. {seat}",
    actions: {
      ff: [a("Check the FACP / annunciator", "clipboard", ["systems"], "safety"), a("Locate the FDC", "droplets", ["systems"], "safety"), a("Carry tools & SCBA", "gauge", ["scba"], "air")],
      officer: [a("Investigate the zone", "search", ["systems"], "safety"), a("Pre-plan review", "file", ["construction", "systems"], "safety"), a("Decide on forcible entry", "hammer", ["forcible"], "safety")],
      chief: [a("Assign the investigation", "clipboard", ["ics"], "safety"), a("Hold or release units", "truck", ["dispatch", "strategy"], "morale"), a("Occupancy hazards", "building", ["construction"], "safety")],
    },
  },
  {
    key: "cause",
    title: "Find the Cause",
    text: "Water is flowing from a sprinkler head on the second floor. A light haze in the area smells like an overheated motor. {seat}",
    actions: {
      ff: [a("Check the control valve", "wrench", ["systems"], "safety"), a("Salvage covers", "shield", ["overhaul"], "morale"), a("Check for extension", "thermometer", ["overhaul", "behavior"], "fire")],
      officer: [a("Shut down the system properly", "wrench", ["systems"], "safety"), a("Salvage operations", "shield", ["overhaul"], "morale"), a("Fire watch decision", "eye", ["systems"], "safety")],
      chief: [a("Notify the fire official", "file", ["systems"], "morale"), a("Impairment procedures", "alert", ["systems"], "safety"), a("Release extra units", "truck", ["strategy"], "morale")],
    },
  },
  {
    key: "restore",
    title: "Restore & Return",
    text: "The cause is found and controlled. The building owner is asking when the system will be back in service. {seat}",
    actions: {
      ff: [a("Replace the head / restore", "wrench", ["systems"], "safety"), a("Pick up salvage", "shield", ["overhaul"], "morale"), a("Report to the officer", "radio", ["ics"], "morale")],
      officer: [a("Owner notification", "users", ["systems"], "morale"), a("Return to service", "check", ["ics"], "morale"), a("NFIRS report", "file", ["investigation"], "morale")],
      chief: [a("Terminate command", "megaphone", ["ics"], "morale"), a("Fire prevention referral", "file", ["systems"], "morale"), a("Return units", "truck", ["dispatch"], "morale")],
    },
  },
];

const TECHNICAL: PhaseDef[] = [
  {
    key: "locate",
    title: "Locate & Communicate",
    text: "{unit} arrives at {address} ({note}). The car is stopped between the 2nd and 3rd floors with four occupants inside, and one of them is panicking. {seat}",
    actions: {
      ff: [a("Talk to the occupants", "users", ["elevator"], "victim"), a("Find the machine room", "search", ["elevator"], "safety"), a("Medical check by voice", "heart", ["ems"], "victim")],
      officer: [a("Elevator rescue plan", "clipboard", ["elevator"], "safety"), a("Call the elevator mechanic", "radio", ["elevator", "dispatch"], "morale"), a("Assess urgency", "activity", ["ems"], "victim")],
      chief: [a("Assign the rescue group", "clipboard", ["ics"], "safety"), a("Liability & safety", "shield", ["safety"], "safety"), a("Resource check", "truck", ["strategy"], "morale")],
    },
  },
  {
    key: "lockout",
    title: "Lockout & Access",
    text: "You're in the machine room. The car is about 3 feet below the landing. {seat}",
    actions: {
      ff: [a("Lock out main power", "zap", ["elevator", "safety"], "safety"), a("Use the hoistway key", "wrench", ["elevator"], "victim"), a("Fall protection", "shield", ["safety"], "safety")],
      officer: [a("Verify lockout / tagout", "zap", ["elevator"], "safety"), a("Choose the removal method", "wrench", ["elevator"], "victim"), a("Crew safety briefing", "shield", ["safety"], "safety")],
      chief: [a("Approve the rescue method", "check", ["elevator"], "safety"), a("Scene safety", "shield", ["safety"], "safety"), a("Building management liaison", "users", ["ics"], "morale")],
    },
  },
  {
    key: "remove",
    title: "Remove Occupants",
    text: "The doors are open. Occupants need help stepping up to the landing, and the anxious woman says she feels dizzy. {seat}",
    actions: {
      ff: [a("Assist occupants out", "users", ["elevator"], "victim"), a("Evaluate the dizzy patient", "heart", ["ems"], "victim"), a("Secure the hoistway", "shield", ["elevator", "safety"], "safety")],
      officer: [a("EMS hand-off", "heart", ["ems"], "victim"), a("Leave the elevator out of service", "alert", ["elevator"], "safety"), a("Company debrief", "users", ["leadership"], "morale")],
      chief: [a("Terminate command", "megaphone", ["ics"], "morale"), a("Code enforcement referral", "file", ["systems"], "morale"), a("Return units", "truck", ["dispatch"], "morale")],
    },
  },
];

export const MAYDAY_PHASE: PhaseDef = {
  key: "mayday",
  title: "MAYDAY",
  text: "\"MAYDAY, MAYDAY, MAYDAY\" — a member of {unit} is disoriented and low on air in heavy smoke. The radio is jammed with traffic. Everything depends on the next minute.",
  actions: {
    ff: [a("Transmit LUNAR", "radio", ["mayday"], "safety"), a("Activate PASS & conserve air", "gauge", ["mayday", "scba"], "air"), a("Attempt self-rescue", "search", ["mayday", "search"], "safety")],
    officer: [a("Clear the radio / emergency traffic", "radio", ["mayday"], "safety"), a("Deploy RIC", "users", ["ric", "mayday"], "safety"), a("Keep water on the fire", "droplets", ["mayday", "strategy"], "fire")],
    chief: [a("Acknowledge & take control", "megaphone", ["mayday"], "safety"), a("Deploy RIC & request another", "users", ["ric", "mayday"], "safety"), a("Conduct a PAR", "clipboard", ["ric"], "morale")],
  },
};

export { VEHICLE_FIRE };

export const PHASES_BY_FAMILY: Record<SceneFamily, PhaseDef[]> = {
  fire: FIRE,
  mva: MVA,
  wildland: WILDLAND,
  marine: MARINE,
  gas: GAS,
  alarm: ALARM,
  technical: TECHNICAL,
};

export const SEAT_LINE: Record<FieldRole, string> = {
  ff: "Your officer is looking to you for the next move.",
  officer: "Your crew is waiting for your orders.",
  chief: "Every company on the radio is waiting for command.",
};
