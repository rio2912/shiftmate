// ---------- Company policy & profile (user-editable on the Settings page) ----------
export const SETTINGS_KEY = "workTimeCalc.settings.v1";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Display order: Monday first
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const DEFAULT_SETTINGS = {
  name: "",
  company: "",
  // Work minutes per weekday (index 0 = Sunday); null = day off
  days: [null, 480, 480, 480, 480, 480, 390],
  earliestStart: "09:30",
  maxBreak: 240,
  defaultBreak: 30,
  defaultRemind: 15,
  // Floating timer look
  widgetShape: "circle", // "circle" | "square" | "pill"
  widgetSize: 150, // px (height for the pill)
};

export const WIDGET_SHAPES = ["circle", "square", "pill"];
export const WIDGET_SIZE_MIN = 110;
export const WIDGET_SIZE_MAX = 220;

/** Window size of the floating timer for a shape + size. */
export function widgetDims(shape, size) {
  if (shape === "pill") return { width: Math.round(size * 2.1), height: Math.round(size * 0.62) };
  return { width: size, height: size };
}

/** Fills in anything missing/invalid so older or hand-edited data never breaks the app. */
export function normalizeSettings(raw) {
  const s = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === "object" ? raw : {}) };
  const days = Array.isArray(s.days) && s.days.length === 7 ? s.days : DEFAULT_SETTINGS.days;
  s.days = days.map((m) => {
    const n = Math.round(Number(m));
    return m === null || !Number.isFinite(n) || n <= 0 ? null : Math.min(n, 24 * 60);
  });
  s.name = String(s.name || "").slice(0, 40);
  s.company = String(s.company || "").slice(0, 60);
  if (!/^\d{2}:\d{2}$/.test(s.earliestStart)) s.earliestStart = DEFAULT_SETTINGS.earliestStart;
  const num = (v, d, max) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= 0 && n <= max ? n : d;
  };
  s.maxBreak = num(s.maxBreak, DEFAULT_SETTINGS.maxBreak, 600);
  s.defaultBreak = Math.min(num(s.defaultBreak, DEFAULT_SETTINGS.defaultBreak, 600), s.maxBreak);
  s.defaultRemind = num(s.defaultRemind, DEFAULT_SETTINGS.defaultRemind, 240);
  if (!WIDGET_SHAPES.includes(s.widgetShape)) s.widgetShape = DEFAULT_SETTINGS.widgetShape;
  const ws = Math.round(Number(s.widgetSize));
  s.widgetSize = Number.isFinite(ws) ? Math.max(WIDGET_SIZE_MIN, Math.min(WIDGET_SIZE_MAX, ws)) : DEFAULT_SETTINGS.widgetSize;
  return s;
}

export function readSettings() {
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY)));
  } catch {
    return normalizeSettings(null);
  }
}

export function writeSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* storage not available */
  }
}

export const isWorkDay = (settings, day) => settings.days[day] !== null;

/** "Mon – Fri, Sat" style summary of working days. */
export function workDaysLabel(settings) {
  return groupDays(settings)
    .filter((g) => g.minutes !== null)
    .map((g) => g.label)
    .join(", ") || "no days";
}

/** Consecutive days (Mon-first) with the same hours, e.g. [{label:"Mon – Fri", minutes:480}, ...] */
export function groupDays(settings) {
  const groups = [];
  for (const d of WEEK_ORDER) {
    const m = settings.days[d];
    const last = groups[groups.length - 1];
    if (last && last.minutes === m) last.to = d;
    else groups.push({ from: d, to: d, minutes: m });
  }
  return groups.map((g) => ({
    ...g,
    label: g.from === g.to ? DAY_SHORT[g.from] : `${DAY_SHORT[g.from]} – ${DAY_SHORT[g.to]}`,
  }));
}
