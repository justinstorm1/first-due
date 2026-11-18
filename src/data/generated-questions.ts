import type { Question, Topic, Track } from "@/game/types";

/**
 * Procedurally generated question bank. Every answer is COMPUTED from a formula or looked up
 * from a fact table, so answers are correct by construction. Distractors are deterministic
 * (seeded by question id) so ids and choice order are stable across launches, which keeps
 * saved history valid.
 */

// ───────────── deterministic helpers ─────────────
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function build(
  id: string,
  level: Track,
  topic: Topic,
  prompt: string,
  correct: string,
  distractors: string[],
  explanation: string,
  reference: string,
): Question | null {
  const unique = [...new Set(distractors.filter((d) => d !== correct))].slice(0, 3);
  if (unique.length < 3) return null;
  const r = rng(hash(id));
  const choices = [correct, ...unique];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { id, level, topic, prompt, choices, answer: choices.indexOf(correct), explanation, reference };
}

/** Plausible numeric distractors around a correct value, formatted and unique. */
function numeric(id: string, value: number, fmt: (n: number) => string, step = 1): string[] {
  const r = rng(hash(id + "d"));
  const factors = [0.5, 0.67, 0.75, 0.8, 1.2, 1.25, 1.33, 1.5, 2];
  const out = new Set<string>();
  const correct = fmt(value);
  let guard = 0;
  while (out.size < 3 && guard++ < 60) {
    const f = factors[Math.floor(r() * factors.length)];
    let v = Math.round((value * f) / step) * step;
    if (v === value) v += step * (r() < 0.5 ? -2 : 2);
    if (v <= 0) continue;
    const s = fmt(v);
    if (s !== correct) out.add(s);
  }
  return [...out];
}

/** Distractors drawn from other answers in the same fact table. */
function fromPool(id: string, correct: string, pool: string[]) {
  const r = rng(hash(id + "p"));
  const others = [...new Set(pool.filter((x) => x !== correct))];
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  return others.slice(0, 3);
}

const out: Question[] = [];
const push = (q: Question | null) => {
  if (q) out.push(q);
};
const psi = (n: number) => `${n} psi`;
const gpm = (n: number) => `${n} gpm`;
const gal = (n: number) => `${n.toLocaleString("en-US")} gal`;

// ───────────── 1. Friction loss (FL = C × (Q/100)² × L/100) ─────────────
const HOSE: { name: string; key: string; c: number; flows: number[]; lengths: number[] }[] = [
  { name: "1½-inch", key: "150", c: 24, flows: [95, 100, 125, 150], lengths: [100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600] },
  { name: "1¾-inch", key: "175", c: 15.5, flows: [125, 150, 160, 175, 185, 200], lengths: [100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600] },
  { name: "2-inch", key: "200", c: 8, flows: [150, 175, 200, 225, 250], lengths: [100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600] },
  { name: "2½-inch", key: "250", c: 2, flows: [200, 250, 265, 300, 325], lengths: [100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600] },
  { name: "3-inch", key: "300", c: 0.8, flows: [300, 400, 500, 600], lengths: [200, 300, 400, 500, 600, 800] },
  { name: "4-inch LDH", key: "400", c: 0.2, flows: [500, 750, 1000], lengths: [300, 500, 600, 800, 1000, 1200] },
  { name: "5-inch LDH", key: "500", c: 0.08, flows: [500, 750, 1000, 1250, 1500], lengths: [300, 500, 600, 800, 1000, 1200] },
];
for (const h of HOSE) {
  for (const q of h.flows) {
    for (const l of h.lengths) {
      const fl = Math.round(h.c * (q / 100) ** 2 * (l / 100));
      if (fl < 2) continue;
      const id = `g-fl-${h.key}-${q}-${l}`;
      push(build(id, "ff2", "water",
        `Using FL = C × Q² × L (C = ${h.c} for ${h.name} hose), what is the friction loss in ${l} ft of ${h.name} hose flowing ${q} gpm?`,
        psi(fl), numeric(id, fl, psi),
        `Q = ${q}/100 = ${q / 100}, L = ${l}/100 = ${l / 100}. FL = ${h.c} × ${(q / 100) ** 2} × ${l / 100} ≈ ${fl} psi.`,
        "IFSTA Pumping Apparatus — Hydraulic calculations"));
    }
  }
}

// ───────────── 2. Pump discharge pressure (PDP = NP + FL + EP) ─────────────
const ATTACK: { label: string; key: string; np: number; q: number; c: number; hose: string }[] = [
  { label: "a fog nozzle (100 psi) flowing 150 gpm", key: "fog150", np: 100, q: 150, c: 15.5, hose: "1¾-inch" },
  { label: "a fog nozzle (100 psi) flowing 175 gpm", key: "fog175", np: 100, q: 175, c: 15.5, hose: "1¾-inch" },
  { label: "a low-pressure fog nozzle (75 psi) flowing 160 gpm", key: "lp160", np: 75, q: 160, c: 15.5, hose: "1¾-inch" },
  { label: "a 15/16-inch smooth bore (50 psi, ~185 gpm)", key: "sb1516", np: 50, q: 185, c: 15.5, hose: "1¾-inch" },
  { label: "a 1⅛-inch smooth bore (50 psi, ~265 gpm)", key: "sb118", np: 50, q: 265, c: 2, hose: "2½-inch" },
  { label: "a fog nozzle (100 psi) flowing 250 gpm", key: "fog250", np: 100, q: 250, c: 2, hose: "2½-inch" },
];
for (const a of ATTACK) {
  for (const l of [150, 200, 250, 300, 350, 400]) {
    for (const floor of [1, 2, 3, 4, 5, 6, 7]) {
      const fl = Math.round(a.c * (a.q / 100) ** 2 * (l / 100));
      const ep = (floor - 1) * 5;
      const pdp = a.np + fl + ep;
      const id = `g-pdp-${a.key}-${l}-${floor}`;
      const where = floor === 1 ? "on the ground floor" : `on floor ${floor}`;
      push(build(id, "officer", "water",
        `${l} ft of ${a.hose} line (C = ${a.c}) with ${a.label} is operating ${where}. Using 5 psi per floor above the first and ignoring appliance loss, what pump discharge pressure is required?`,
        psi(pdp), numeric(id, pdp, psi, 5),
        `PDP = NP ${a.np} + FL ${fl} + EP ${ep} = ${pdp} psi.`,
        "IFSTA Pumping Apparatus — Pump discharge pressure"));
    }
  }
}

// ───────────── 3. Smooth-bore flow (gpm = 29.7 × d² × √NP) ─────────────
const TIPS: [string, number][] = [
  ["7/8", 0.875], ["15/16", 0.9375], ["1", 1], ["1⅛", 1.125], ["1¼", 1.25],
  ["1⅜", 1.375], ["1½", 1.5], ["1¾", 1.75], ["2", 2],
];
for (const [label, d] of TIPS) {
  const nps = d <= 1.25 ? [40, 50, 60] : [70, 80, 90];
  for (const np of nps) {
    const flow = Math.round(29.7 * d * d * Math.sqrt(np));
    const id = `g-sb-${label}-${np}`;
    push(build(id, "ff2", "hose",
      `Using gpm = 29.7 × d² × √NP, approximately how much does a ${label}-inch smooth-bore tip flow at ${np} psi nozzle pressure?`,
      gpm(flow), numeric(id, flow, gpm),
      `29.7 × ${d}² × √${np} ≈ ${flow} gpm.`,
      "IFSTA Pumping Apparatus — Nozzle flow"));
  }
}

// ───────────── 4. Hydrant bonnet colors (NFPA 291) ─────────────
const HYD = ["Light blue (Class AA)", "Green (Class A)", "Orange (Class B)", "Red (Class C)"];
for (let f = 200; f <= 2500; f += 50) {
  const ans = f >= 1500 ? HYD[0] : f >= 1000 ? HYD[1] : f >= 500 ? HYD[2] : HYD[3];
  const id = `g-hyd-${f}`;
  push(build(id, "ff1", "water",
    `A hydrant flow-tests at ${f.toLocaleString("en-US")} gpm (rated at 20 psi residual). Under NFPA 291, what bonnet color should it have?`,
    ans, HYD.filter((x) => x !== ans),
    "AA (light blue) ≥1,500 gpm · A (green) 1,000–1,499 · B (orange) 500–999 · C (red) <500.",
    "NFPA 291"));
}

// ───────────── 5. Water weight & volume ─────────────
for (const g of [250, 300, 500, 750, 1000, 1250, 1500, 2000, 2500, 3000, 3500, 4000]) {
  const lb = Math.round((g * 8.34) / 10) * 10;
  const id = `g-wt-${g}`;
  push(build(id, "ff1", "water",
    `Water weighs about 8.34 lb per gallon. Approximately how much does ${gal(g)} of water weigh?`,
    `${lb.toLocaleString("en-US")} lb`, numeric(id, lb, (n) => `${n.toLocaleString("en-US")} lb`, 10),
    `${g} × 8.34 ≈ ${lb.toLocaleString("en-US")} lb. Tank weight matters for apparatus and floor loads.`,
    "IFSTA Essentials — Water supply"));
}
for (const L of [8, 10, 12, 14, 16]) {
  for (const W of [6, 8, 10]) {
    for (const H of [2, 3, 4]) {
      const g2 = Math.round(L * W * H * 7.48);
      const id = `g-tank-${L}-${W}-${H}`;
      push(build(id, "ff2", "water",
        `A portable tank measures ${L} ft × ${W} ft × ${H} ft. Using 7.48 gal per cubic foot, approximately how many gallons does it hold when full?`,
        gal(g2), numeric(id, g2, gal, 10),
        `${L} × ${W} × ${H} = ${L * W * H} ft³ × 7.48 ≈ ${g2} gal.`,
        "IFSTA Essentials — Water supply"));
    }
  }
}
for (const tank of [500, 750, 1000, 1250, 1500]) {
  for (const q of [95, 125, 150, 185, 200, 250]) {
    const min = Math.round((tank / q) * 10) / 10;
    const id = `g-dur-${tank}-${q}`;
    push(build(id, "ff1", "water",
      `An engine with a ${gal(tank)} booster tank is supplying one line flowing ${q} gpm. Assuming the whole tank is usable, about how long until it runs dry?`,
      `${min} min`, numeric(id, min, (n) => `${Math.round(n * 10) / 10} min`, 0.5),
      `${tank} ÷ ${q} ≈ ${min} minutes. Establish a sustained water supply early.`,
      "IFSTA Essentials — Water supply"));
  }
}

// ───────────── 5b. Relay / supply pumping (PDP = FL + 20 psi residual) ─────────────
for (const [name, key, c, flows] of [["5-inch", "5", 0.08, [500, 750, 1000, 1250, 1500]], ["4-inch", "4", 0.2, [500, 750, 1000]]] as const) {
  for (const q of flows) {
    for (const l of [500, 750, 1000, 1250, 1500, 1750, 2000]) {
      const fl = Math.round(c * (q / 100) ** 2 * (l / 100));
      const pdp = fl + 20;
      const id = `g-relay-${key}-${q}-${l}`;
      push(build(id, "officer", "water",
        `In a relay, the supply engine pumps ${q} gpm through ${l} ft of ${name} LDH (C = ${c}) to an attack engine. Maintaining 20 psi residual at the attack engine's intake, what discharge pressure is needed (level ground)?`,
        psi(pdp), numeric(id, pdp, psi, 5),
        `FL = ${c} × ${(q / 100) ** 2} × ${l / 100} ≈ ${fl} psi, + 20 psi residual = ${pdp} psi.`,
        "IFSTA Pumping Apparatus — Relay pumping"));
    }
  }
}

// ───────────── 5c. Water used ─────────────
for (const q of [95, 125, 150, 175, 200, 250, 300, 500]) {
  for (const min of [5, 8, 10, 12, 15, 20, 25, 30]) {
    const used = q * min;
    const id = `g-used-${q}-${min}`;
    push(build(id, "ff1", "water",
      `A line flows ${q} gpm for ${min} minutes. How much water was applied?`,
      gal(used), numeric(id, used, gal, 25),
      `${q} gpm × ${min} min = ${used.toLocaleString("en-US")} gal.`,
      "IFSTA Essentials — Water supply"));
  }
}

// ───────────── 6. Elevation pressure ─────────────
for (let h = 10; h <= 150; h += 5) {
  const ep = h / 2;
  const id = `g-ep-${h}`;
  push(build(id, "ff2", "water",
    `The nozzle is ${h} ft above the pump. Using the fireground rule of 0.5 psi per foot, how much elevation pressure must be added?`,
    psi(ep), numeric(id, ep, psi, 2.5),
    `${h} ft × 0.5 psi/ft = ${ep} psi (precisely 0.434 psi/ft).`,
    "IFSTA Hydraulics — Elevation pressure"));
}

// ───────────── 7. Ground ladder placement (1:4 rule) ─────────────
for (const len of [12, 14, 16, 20, 24, 28, 32, 35, 40, 45, 50]) {
  const base = len / 4;
  const id = `g-lad-${len}`;
  push(build(id, "ff1", "ladders",
    `A ground ladder is raised to a working length of ${len} ft. Using the 1:4 ratio, about how far should the butt be from the building?`,
    `${base} ft`, numeric(id, base, (n) => `${n} ft`, 0.5),
    `Working length ÷ 4 = ${base} ft, giving roughly a 75° climbing angle.`,
    "IFSTA Essentials — Ground Ladders"));
}

// ───────────── 8. Tanker shuttle capability ─────────────
for (const cap of [1500, 2000, 2500, 3000, 3500, 4000]) {
  for (const cyc of [5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20, 24]) {
    const flow = Math.round((0.9 * cap) / cyc / 10) * 10;
    const id = `g-tnk-${cap}-${cyc}`;
    push(build(id, "officer", "water",
      `A ${gal(cap)} tanker (90% usable) has a complete shuttle cycle time of ${cyc} minutes. About what continuous flow can it sustain?`,
      gpm(flow), numeric(id, flow, gpm, 10),
      `(0.9 × ${cap}) ÷ ${cyc} ≈ ${flow} gpm.`,
      "IFSTA Water Supply — Tanker shuttle operations"));
  }
}

// ───────────── 9. NFA fire-flow formula ─────────────
for (let L = 20; L <= 120; L += 10) {
  for (let W = 20; W <= 80; W += 10) {
    for (const inv of [25, 50, 75, 100]) {
      const flow = Math.round(((L * W) / 3) * (inv / 100) / 10) * 10;
      const id = `g-nfa-${L}-${W}-${inv}`;
      push(build(id, "officer", "strategy",
        `A one-story ${L} ft × ${W} ft occupancy is ${inv}% involved. Using the NFA formula (L × W ÷ 3 × % involvement), what is the estimated required fire flow?`,
        gpm(flow), numeric(id, flow, gpm, 10),
        `(${L} × ${W}) ÷ 3 = ${Math.round((L * W) / 3)} gpm at full involvement × ${inv}% ≈ ${flow} gpm.`,
        "National Fire Academy fire-flow formula"));
    }
  }
}

// ───────────── 10. Foam concentrate ─────────────
for (const pct of [0.5, 1, 3, 6]) {
  for (const sol of [100, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000]) {
    const conc = Math.round(sol * (pct / 100) * 10) / 10;
    const id = `g-foam-${pct}-${sol}`;
    push(build(id, "ff2", "hose",
      `How much foam concentrate is needed to make ${gal(sol)} of foam solution at ${pct}%?`,
      `${conc} gal`, numeric(id, conc, (n) => `${Math.round(n * 10) / 10} gal`, pct < 1 ? 0.5 : 1),
      `${sol} × ${pct}% = ${conc} gal of concentrate.`,
      "IFSTA Essentials — Foam"));
  }
}

// ───────────── 11. Temperature conversions ─────────────
for (let c = 50; c <= 1200; c += 50) {
  const f = Math.round((c * 9) / 5 + 32);
  const id = `g-c2f-${c}`;
  push(build(id, "ff1", "behavior",
    `Fire behavior: convert ${c}°C to Fahrenheit (F = C × 9/5 + 32).`,
    `${f}°F`, numeric(id, f, (n) => `${n}°F`, 10),
    `${c} × 1.8 + 32 = ${f}°F.`, "IFSTA Essentials — Fire Behavior"));
}
for (let f = 200; f <= 2200; f += 100) {
  const c = Math.round(((f - 32) * 5) / 9);
  const id = `g-f2c-${f}`;
  push(build(id, "ff1", "behavior",
    `Fire behavior: convert ${f}°F to Celsius (C = (F − 32) × 5/9).`,
    `${c}°C`, numeric(id, c, (n) => `${n}°C`, 5),
    `(${f} − 32) × 5/9 ≈ ${c}°C.`, "IFSTA Essentials — Fire Behavior"));
}

// ───────────── 12. SCBA air management ─────────────
for (const [rated, liters] of [[30, 1200], [45, 1800], [60, 2400]] as const) {
  for (const rate of [40, 50, 60, 75, 90, 100]) {
    const full = Math.round(liters / rate);
    const id1 = `g-air-${liters}-${rate}`;
    push(build(id1, "ff1", "scba",
      `A "${rated}-minute" cylinder holds about ${liters} L of air. A firefighter working hard breathes ${rate} L/min. About how long will the full cylinder last?`,
      `${full} min`, numeric(id1, full, (n) => `${n} min`),
      `${liters} ÷ ${rate} ≈ ${full} min. Rated duration assumes 40 L/min; real work time is often much shorter.`,
      "NIOSH 42 CFR 84 / IFSTA Essentials — SCBA"));
    const toAlarm = Math.round((liters * 0.67) / rate);
    const id2 = `g-airalarm-${liters}-${rate}`;
    push(build(id2, "ff1", "scba",
      `Same ${liters} L cylinder, breathing ${rate} L/min. The low-air alarm sounds at 33% remaining. About how many minutes from a full cylinder until the alarm?`,
      `${toAlarm} min`, numeric(id2, toAlarm, (n) => `${n} min`),
      `67% of ${liters} = ${Math.round(liters * 0.67)} L ÷ ${rate} ≈ ${toAlarm} min. Plan your exit before this point.`,
      "NFPA 1981 / NFPA 1404"));
  }
}

// ───────────── 13. 24-hour time (dispatch) ─────────────
const fmt12 = (h: number, m: number) => `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
const fmt24 = (h: number, m: number) => `${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}`;
for (let h = 0; h < 24; h++) {
  for (const m of [5, 10, 20, 25, 35, 40, 50, 55]) {
    const id = `g-t24-${h}-${m}`;
    const ans = fmt24(h, m);
    push(build(id, "dispatch", "dispatch",
      `CAD logs use 24-hour time. A call is received at ${fmt12(h, m)}. How is it logged?`,
      ans, [fmt24((h + 12) % 24, m), fmt24(h, (m + 30) % 60), fmt24((h + 2) % 24, m), fmt24((h + 11) % 24, m)],
      `${fmt12(h, m)} = ${ans} hours.`, "Telecommunicator fundamentals"));
    const id2 = `g-t12-${h}-${m}`;
    const ans2 = fmt12(h, m);
    push(build(id2, "dispatch", "dispatch",
      `A unit marks on scene at ${fmt24(h, m)} hours. What is that in 12-hour time?`,
      ans2, [fmt12((h + 12) % 24, m), fmt12((h + 2) % 24, m), fmt12(h, (m + 30) % 60), fmt12((h + 10) % 24, m)],
      `${fmt24(h, m)} hours = ${ans2}.`, "Telecommunicator fundamentals"));
  }
}

// ───────────── 14. Phonetic alphabet (dispatch) ─────────────
const NATO = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliett", "Kilo", "Lima", "Mike", "November", "Oscar", "Papa", "Quebec", "Romeo", "Sierra", "Tango", "Uniform", "Victor", "Whiskey", "X-ray", "Yankee", "Zulu"];
NATO.forEach((word, i) => {
  const letter = String.fromCharCode(65 + i);
  const id = `g-nato-${letter}`;
  push(build(id, "dispatch", "dispatch",
    `Reading back a plate on the radio, which ICAO/NATO phonetic word is used for the letter "${letter}"?`,
    word, fromPool(id, word, NATO), `${letter} = ${word}.`, "ICAO / APCO radio procedures"));
});

// ───────────── 15. Fact tables (answer ↔ prompt, distractors from the table) ─────────────
type Fact = [prompt: string, answer: string];
function factSet(prefix: string, level: Track, topic: Topic, stem: (p: string) => string, facts: Fact[], explain: (p: string, a: string) => string, reference: string) {
  const answers = facts.map((f) => f[1]);
  facts.forEach(([p, a], i) => {
    const id = `g-${prefix}-${i}`;
    push(build(id, level, topic, stem(p), a, fromPool(id, a, answers), explain(p, a), reference));
  });
}

const FIRE_CLASSES: Fact[] = [
  ["burning wood pallets", "Class A"], ["a smoldering mattress", "Class A"], ["burning paper records", "Class A"],
  ["a pile of burning tires", "Class A"], ["burning hay bales", "Class A"], ["burning cotton clothing", "Class A"],
  ["a plastic trash can fire", "Class A"], ["burning cardboard boxes", "Class A"],
  ["a gasoline spill fire", "Class B"], ["burning diesel fuel", "Class B"], ["a propane cylinder leak on fire", "Class B"],
  ["burning lacquer thinner", "Class B"], ["burning kerosene", "Class B"], ["a natural gas fire at a meter", "Class B"],
  ["a burning motor oil spill", "Class B"], ["burning acetone", "Class B"],
  ["an energized electrical panel fire", "Class C"], ["a burning energized transformer", "Class C"],
  ["an energized computer server fire", "Class C"], ["a plugged-in space heater on fire", "Class C"],
  ["burning magnesium shavings", "Class D"], ["burning titanium powder", "Class D"], ["a sodium metal fire", "Class D"],
  ["burning lithium metal", "Class D"], ["burning zirconium", "Class D"],
  ["a commercial deep-fryer fire", "Class K"], ["burning vegetable oil in a restaurant fryer", "Class K"],
  ["burning animal fat in a commercial kitchen", "Class K"],
];
factSet("cls", "ff1", "extinguishers", (p) => `What class of fire is ${p}?`, FIRE_CLASSES,
  (p, a) => `${p[0].toUpperCase() + p.slice(1)} is ${a}. A: ordinary combustibles · B: flammable liquids/gases · C: energized electrical · D: combustible metals · K: cooking oils/fats.`,
  "NFPA 10 / IFSTA Essentials — Portable Extinguishers");

const DOT: Fact[] = [
  ["Gasoline", "Class 3 — Flammable liquids"], ["Diesel fuel", "Class 3 — Flammable liquids"], ["Acetone", "Class 3 — Flammable liquids"],
  ["Ethanol", "Class 3 — Flammable liquids"], ["Propane", "Class 2 — Gases"], ["Chlorine", "Class 2 — Gases"],
  ["Anhydrous ammonia", "Class 2 — Gases"], ["Acetylene", "Class 2 — Gases"], ["Compressed nitrogen", "Class 2 — Gases"],
  ["Dynamite", "Class 1 — Explosives"], ["Consumer fireworks", "Class 1 — Explosives"], ["Blasting caps", "Class 1 — Explosives"],
  ["Magnesium powder", "Class 4 — Flammable solids"], ["Sodium metal", "Class 4 — Flammable solids"], ["Matches (strike-anywhere)", "Class 4 — Flammable solids"],
  ["Ammonium nitrate fertilizer", "Class 5 — Oxidizers & organic peroxides"], ["Calcium hypochlorite (pool chlorine)", "Class 5 — Oxidizers & organic peroxides"],
  ["Benzoyl peroxide", "Class 5 — Oxidizers & organic peroxides"],
  ["Pesticides (toxic)", "Class 6 — Toxic & infectious substances"], ["Regulated medical waste", "Class 6 — Toxic & infectious substances"],
  ["Cyanide salts", "Class 6 — Toxic & infectious substances"],
  ["Uranium hexafluoride", "Class 7 — Radioactive materials"], ["Medical isotopes", "Class 7 — Radioactive materials"],
  ["Sulfuric acid", "Class 8 — Corrosives"], ["Sodium hydroxide", "Class 8 — Corrosives"], ["Hydrochloric acid", "Class 8 — Corrosives"],
  ["Lithium-ion batteries", "Class 9 — Miscellaneous"], ["Dry ice", "Class 9 — Miscellaneous"], ["Asbestos", "Class 9 — Miscellaneous"],
];
factSet("dot", "ff1", "hazmat", (p) => `Under the DOT hazard class system, ${p} is shipped as:`, DOT,
  (p, a) => `${p} → ${a}.`, "DOT/PHMSA ERG — Hazard classes");

const NFPA704: Fact[] = [];
const SEV = ["Minimal hazard", "Slight hazard", "Moderate hazard", "Serious hazard", "Severe hazard"];
for (const [color, kind] of [["blue", "health"], ["red", "flammability"], ["yellow", "instability"]] as const) {
  SEV.forEach((s, n) => NFPA704.push([`${n} in the ${color} (${kind}) quadrant`, `${s} (${kind})`]));
}
factSet("704", "ff1", "hazmat", (p) => `On an NFPA 704 diamond, a ${p} indicates:`, NFPA704,
  (_p, a) => `${a}. Ratings run from 0 (minimal) to 4 (severe).`, "NFPA 704");

const CONSTRUCTION: Fact[] = [
  ["a high-rise with concrete-encased steel and concrete floors", "Type I — Fire-resistive"],
  ["a hospital with protected steel frame and rated assemblies", "Type I — Fire-resistive"],
  ["a big-box store with unprotected steel bar joists and metal deck", "Type II — Noncombustible"],
  ["a metal pole barn-style warehouse with steel frame", "Type II — Noncombustible"],
  ["a main-street store with brick bearing walls and wood floor joists", "Type III — Ordinary"],
  ["a strip mall with masonry walls and a wood-truss roof", "Type III — Ordinary"],
  ["an old mill with massive timber columns and thick plank floors", "Type IV — Heavy timber"],
  ["a church with large laminated wood arches and heavy plank roof", "Type IV — Heavy timber"],
  ["a wood-frame colonial home", "Type V — Wood frame"],
  ["a garden apartment of lightweight wood frame", "Type V — Wood frame"],
  ["a modern townhouse with engineered I-joists", "Type V — Wood frame"],
];
factSet("con", "ff1", "construction", (p) => `Which construction type best describes ${p}?`, CONSTRUCTION,
  (_p, a) => `${a}.`, "NFPA 220 / IFSTA Building Construction");

const STANDARDS: Fact[] = [
  ["Fire Fighter professional qualifications", "NFPA 1001"], ["Fire Apparatus Driver/Operator qualifications", "NFPA 1002"],
  ["Technical Rescue personnel qualifications", "NFPA 1006"], ["Fire Officer professional qualifications", "NFPA 1021"],
  ["Incident Management personnel qualifications", "NFPA 1026"], ["Fire Inspector & Plan Examiner qualifications", "NFPA 1031"],
  ["Fire Investigator qualifications", "NFPA 1033"], ["Fire & Life Safety Educator / PIO qualifications", "NFPA 1035"],
  ["Fire & Emergency Services Instructor qualifications", "NFPA 1041"], ["Public Safety Telecommunications personnel qualifications", "NFPA 1061"],
  ["Emergency Vehicle Technician qualifications", "NFPA 1071"], ["Hazardous Materials/WMD responder qualifications", "NFPA 1072"],
  ["Traffic Control Incident Management qualifications", "NFPA 1091"], ["Live fire training evolutions", "NFPA 1403"],
  ["Training for fire service rapid intervention crews", "NFPA 1407"], ["Fire department occupational safety & health program", "NFPA 1500"],
  ["Fire department Safety Officer", "NFPA 1521"], ["Emergency services incident management system", "NFPA 1561"],
  ["Comprehensive occupational medical program for fire departments", "NFPA 1582"], ["Rehabilitation process for members during emergency operations", "NFPA 1584"],
  ["Deployment standard for career fire departments", "NFPA 1710"], ["Deployment standard for volunteer fire departments", "NFPA 1720"],
  ["Care & maintenance of structural protective ensembles", "NFPA 1851"], ["Care & maintenance of SCBA", "NFPA 1852"],
  ["Automotive fire apparatus design", "NFPA 1901"], ["In-service fire apparatus inspection, maintenance & retirement", "NFPA 1911"],
  ["In-service ground ladder use, maintenance & service testing", "NFPA 1932"], ["Fire hose care, use, inspection & service testing", "NFPA 1962"],
  ["Structural & proximity firefighting protective ensembles", "NFPA 1971"], ["Open-circuit SCBA for emergency services", "NFPA 1981"],
  ["Personal Alert Safety Systems (PASS)", "NFPA 1982"], ["Portable fire extinguishers", "NFPA 10"],
  ["Installation of sprinkler systems", "NFPA 13"], ["Sprinklers in one- and two-family dwellings", "NFPA 13D"],
  ["Sprinklers in low-rise residential occupancies", "NFPA 13R"], ["Standpipe and hose systems", "NFPA 14"],
  ["Stationary fire pumps", "NFPA 20"], ["Inspection, testing & maintenance of water-based systems", "NFPA 25"],
  ["Flammable and Combustible Liquids Code", "NFPA 30"], ["National Fuel Gas Code", "NFPA 54"], ["Liquefied Petroleum Gas Code", "NFPA 58"],
  ["National Electrical Code", "NFPA 70"], ["National Fire Alarm and Signaling Code", "NFPA 72"], ["Fire doors and other opening protectives", "NFPA 80"],
  ["Smoke control systems", "NFPA 92"], ["Life Safety Code", "NFPA 101"], ["Types of building construction", "NFPA 220"],
  ["Fire flow testing and marking of hydrants", "NFPA 291"], ["Hazard identification diamond", "NFPA 704"], ["Guide for fire and explosion investigations", "NFPA 921"],
];
const NOTE = " Several of these long-standing numbers are being consolidated into newer combined standards (e.g., NFPA 1010, 1550, 1970), but the legacy numbers remain widely referenced.";
factSet("std", "chief", "standards", (p) => `Which NFPA document covers: ${p}?`, STANDARDS, (p, a) => `${p} → ${a}.${NOTE}`, "NFPA document list");
factSet("stdr", "chief", "standards", (p) => `What does ${p} cover?`, STANDARDS.map(([a, b]) => [b, a] as Fact), (p, a) => `${p} → ${a}.${NOTE}`, "NFPA document list");

const ICS: Fact[] = [
  ["Advises the IC on hazards and can stop unsafe acts", "Safety Officer"], ["Point of contact for assisting and cooperating agencies", "Liaison Officer"],
  ["Releases incident information to the media and public", "Public Information Officer"], ["Directs all tactical operations", "Operations Section Chief"],
  ["Tracks resources, situation status and develops the IAP", "Planning Section Chief"], ["Provides facilities, services and materials", "Logistics Section Chief"],
  ["Tracks costs, time and claims", "Finance/Administration Section Chief"], ["Supervises a geographic area such as a floor", "Division Supervisor"],
  ["Supervises a functional assignment such as ventilation", "Group Supervisor"], ["Manages uncommitted resources awaiting assignment", "Staging Area Manager"],
  ["Overall authority and responsibility for the incident", "Incident Commander"], ["Established when span of control is exceeded across divisions/groups", "Branch Director"],
];
factSet("ics", "officer", "ics", (p) => `In ICS, which position: ${p.charAt(0).toLowerCase() + p.slice(1)}?`, ICS, (p, a) => `${a}: ${p}.`, "NIMS ICS-100/200");

const ERG: Fact[] = [
  ["Yellow-bordered pages", "Index by 4-digit UN/NA ID number"], ["Blue-bordered pages", "Index by material name"],
  ["Orange-bordered pages", "Response guides (potential hazards, public safety, emergency response)"],
  ["Green-bordered pages", "Initial isolation & protective action distances"], ["White pages at the front", "How to use the guide, placard tables, rail car & trailer ID"],
];
factSet("erg", "ff1", "hazmat", (p) => `In the Emergency Response Guidebook, what are the ${p.toLowerCase()} used for?`, ERG, (p, a) => `${p}: ${a}.`, "DOT/PHMSA ERG");

// ───────────── 16. START triage scenarios ─────────────
const START_TAGS = ["Green — Minor", "Yellow — Delayed", "Red — Immediate", "Black — Expectant/Deceased"];
{
  let n = 0;
  const add = (desc: string, tag: string, why: string) => {
    const id = `g-start-${n++}`;
    push(build(id, "ff2", "ems", `START triage: ${desc} Which tag?`, tag, START_TAGS.filter((t) => t !== tag), why, "START triage"));
  };
  for (const rr of [8, 12, 16, 20, 24, 28, 32, 36, 40, 44]) {
    for (const perf of ["radial pulse present, cap refill 1 second", "no radial pulse", "radial pulse present, cap refill 3 seconds"]) {
      for (const mental of ["follows simple commands", "cannot follow simple commands"]) {
        const tag = rr > 30 || perf !== "radial pulse present, cap refill 1 second" || mental !== "follows simple commands" ? START_TAGS[2] : START_TAGS[1];
        const why = rr > 30 ? "Respirations over 30 → Immediate." : perf !== "radial pulse present, cap refill 1 second" ? "Poor perfusion (no radial pulse or cap refill > 2 s) → Immediate." : mental !== "follows simple commands" ? "Cannot follow simple commands → Immediate." : "Non-ambulatory but RR ≤ 30, good perfusion, follows commands → Delayed.";
        add(`A non-ambulatory patient is breathing ${rr}/min, ${perf}, and ${mental}.`, tag, why);
      }
    }
  }
  add("A patient is not breathing and does not begin breathing after the airway is repositioned.", START_TAGS[3], "No breathing after airway repositioning → Expectant/Deceased.");
  add("A patient is not breathing but begins breathing after the airway is repositioned.", START_TAGS[2], "Breathing only after repositioning → Immediate.");
  add("A patient with a deformed forearm walks to the designated area when directed.", START_TAGS[0], "Able to walk → Minor.");
  add("A patient with facial lacerations walks to the treatment area on command.", START_TAGS[0], "Able to walk → Minor.");
}

export const GENERATED_QUESTIONS = out;
