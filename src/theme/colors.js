// Design tokens shared by tailwind.config.js (className) and TS code (icon colors).
// CommonJS so the Tailwind config can require it.
const colors = {
  bg: "#07090D",
  surface: "#0D1117",
  panel: "#131A23",
  raised: "#1A2330",
  line: "#253142",
  ink: "#E6EDF5",
  muted: "#93A1B3",
  dim: "#5E6B7D",
  alert: "#FF453A",
  amber: "#FFB020",
  radio: "#30D17A",
  info: "#4DA3FF",
  fire: "#FF6A1A",
  smoke: "#3A3F47",
};

module.exports = { colors };
