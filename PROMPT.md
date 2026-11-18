You are an expert mobile game developer, React Native/Expo engineer, and fire service instructional designer. Build a fully functional, highly immersive mobile simulation game, in this existing Expo project, that trains and tests firefighters, officers, and dispatchers on New Jersey Division of Fire Safety (NJDFS), IFSTA, and NFPA standards (Fire Fighter I/II, Fire Officer, Advanced Safety & Tactics, Chief Exams, and Dispatcher Training).

---

## 0. TECH STACK & PROJECT CONSTRAINTS (read first)
- **Project:** Existing Expo app, SDK 58 (`expo ~58`, React Native 0.88, React 19, TypeScript). Read `AGENTS.md` and `package.json` before writing code. Expo APIs change every SDK, so check the versioned docs at https://docs.expo.dev/versions/v58.0.0/ and https://docs.expo.dev/llms.txt instead of relying on memory.
- **Routing:** Expo Router. Every file in `src/app/` is a screen, and `_layout.tsx` files define navigators. Keep components, hooks, game logic, and data outside `src/app/` (for example `src/components/`, `src/game/`, `src/data/`, `src/store/`).
- **Styling:** **NativeWind** (Tailwind for React Native) using `className` on core RN components. Follow the current NativeWind install guide for this SDK (babel/metro config, `global.css`, `nativewind-env.d.ts`, Tailwind config). Define a dark emergency-services palette as theme tokens (CAD black/graphite surfaces, amber/red alert accents, radio-green status, monospace data readouts). Don't hardcode hex values in components.
- **Icons:** **Lucide** via `lucide-react-native` (needs `react-native-svg`). Use icons consistently: `Siren`, `Flame`, `Radio`, `Truck`, `ShieldAlert`, `HeartPulse`, `Gauge`, `Wind`, `Award`, `MapPin`, `Timer`, and so on. Style them through NativeWind (`cssInterop` or the current recommended approach) or with `color`/`size` props that come from theme tokens.
- **Installs:** Always `npx expo install <pkg>`. Never use bare npm/yarn add.
- **Animation & feel:** `react-native-reanimated` for transitions between CAD, menu, and on-scene views, and for metric bars ticking. `expo-haptics` for alerts, wrong answers, and Mayday tones. Optionally `expo-audio` for radio/tone-out sounds.
- **State:** One typed game store (Zustand or `useReducer` + context) that holds the career profile, the active incidents queue, apparatus status, the current role, and on-scene metrics. Keep game logic as pure TypeScript functions so it can be tested.
- **Persistence:** Save career progress, certificates, error rate, and write-ups locally (`expo-sqlite/kv-store` or another SDK-58-supported option; check the docs).
- **Timers:** Drive call arrivals, metric decay, and the 60-second auto-dispatch with a game clock that pauses when the app goes to the background (`AppState`).
- **Platforms:** Must run on iOS and Android, and render acceptably on web. Mobile-first layouts, safe areas respected, touch targets ≥ 44pt, and a usable CAD view on phone portrait (collapsible panels/tabs) as well as on tablet landscape (multi-pane).
- **Done means:** `npx expo lint` and `npx tsc --noEmit` pass, and the app launches in Expo Go or a dev build with no red-box errors.

---

## 1. CORE ARCHITECTURE & THEME
- **Setting / Jurisdiction:** A sprawling suburban/coastal town modeled on Middletown Township, NJ. Include realistic local station references (e.g., Station 1 Navesink, Station 4 Leonardo, Station 7 Belford), local target hazards (Route 36, garden apartments, marina/waterfront, commercial strip malls, wooded interface areas), and the resource constraints typical of a volunteer or combination career-volunteer department.
- **Visual Aesthetic:** A professional dark-mode emergency dispatch/CAD dashboard (inspired by Chief 360-style CAD software, but original in design) combined with rich text-and-visual event logs, built entirely with NativeWind and Lucide.
- **Progression & Scoring:** There is no traditional "win" state. Players earn official-style NJ digital **Certificates** and rank badges based on performance, shown in a Certificates/Profile screen as styled cards. Incorrect decisions on exams or tactical incidents lower your standing and raise your "error rate," and can lead to administrative write-ups or certificate revocation if metrics drop too low.

---

## 2. GAME MODES (selected from the Main Menu)
1. **Dispatcher Mode:** A full CAD interface where 911 calls drop in. You take in the details, classify the incident (MVA with entrapment, Structure Fire, Alarm Activation, Gas Leak, Elevator Emergency, etc.), and dispatch the right Middletown apparatus according to standard operating guidelines (SOGs).
2. **Fire Fighter I & II Mode:** Step into the boots of a suppression firefighter on scene. Life-sim-style event cards present an unfolding emergency and force immediate tactical decisions based on NJ State / IFSTA Fire Fighter I/II exam content (ventilation, hose deployment, SCBA air management, search & rescue).
3. **Fire Officer Mode:** Manage company-level fireground operations (RIC deployment, 3-sides size-up, tactical priorities, transitional attack) based on NFPA 1021 / NJ Fire Officer standards.
4. **Advanced Tactics & Safety / Chief Exam Mode:** High-stakes command of multi-alarm incidents, resource staging, Mayday operations, and command staff decisions.

Suggested route structure (adjust as needed):
- `src/app/_layout.tsx`: root Stack, theme, and store provider
- `src/app/index.tsx`: Main Menu
- `src/app/dispatch.tsx`: CAD view
- `src/app/scene/[incidentId].tsx`: on-scene action screen
- `src/app/debrief/[incidentId].tsx`: performance review
- `src/app/profile.tsx`: certificates, badges, write-ups, error rate

---

## 3. CORE GAMEPLAY & DYNAMIC ROLE-SWITCHING
- **Dispatch loop & resource management:** In Dispatcher mode, calls arrive fast enough to overlap. You must track town resources (apparatus availability, station coverage) the way a real municipal dispatcher does. Each unit has a status (Available, Dispatched, En Route, On Scene, Returning, Out of Service).
- **"Play Role" transition:**
  - Each active call in Dispatcher mode shows a **"Personnel Responding"** panel. Tapping **"Play Role"** on any responding unit takes you out of the dispatch chair and onto the incident as that Firefighter, Officer, or Chief.
  - When you switch to an on-scene role, an **AI Dispatcher automatically takes over** incoming town traffic, using simple SOG-based rules and visibly logging its decisions.
  - On scene, the screen becomes a life-sim-style action view: the incident is shown visually (illustrated scene card or layered views/images), with status meters for Air Supply, Thermal Stress, Scene Safety, Victim Status, and Company Morale that tick down or fluctuate. Tap into action menus (bottom sheets) to resolve problems, and every action triggers a rigorous scenario-based exam question.
- **Returning to Dispatch / auto-dispatch loop:**
  - When an on-scene call ends, show a debrief. If you are still in an operational role instead of switching back to Dispatch, you are **automatically dispatched to a new incident within 60 seconds**, with a visible countdown.
  - You can switch back to the Dispatcher role at any time between calls.

---

## 4. OUTPUT REQUIREMENTS
- Implement the game as a well-structured, multi-file Expo Router app in this repo (not a single HTML file). Use typed models (`Incident`, `Apparatus`, `Station`, `Question`, `CareerProfile`, `Certificate`).
- Include a robust internal database of realistic multiple-choice exam questions as typed TS/JSON in `src/data/`, organized by certification level and topic (building construction types, hydrant capacities/flow, ICS command structure, rapid intervention, fire behavior, SCBA, ventilation, hazmat awareness, dispatch protocols). Each question includes an explanation and a reference (IFSTA chapter / NFPA standard).
- Make transitions between the Main Menu, CAD view, on-scene action screens, and debriefs smooth and native-feeling.
- Use only original art and UI. Don't copy branding, logos, or screenshots from Chief 360, BitLife, or other commercial products.
- When finished, list the packages installed, the config files changed for NativeWind, and brief instructions for running the app (`npx expo start`, plus whether a dev build is needed).

Generate the complete, production-ready implementation now.
