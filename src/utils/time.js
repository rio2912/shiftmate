import { DAY_NAMES, DEFAULT_SETTINGS, workDaysLabel } from "./settings.js";

// Work rules come from the user's settings (company policy); see utils/settings.js

export const pad = (n) => String(n).padStart(2, "0");

export const todayStr = () => toDateStr(new Date());
export const nowTimeStr = () => toTimeStr(new Date());
export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTimeStr = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Builds a Date in LOCAL time (avoids the UTC shift of new Date("YYYY-MM-DD")). */
export function localDate(dateStr, timeStr = "00:00") {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

/** Work minutes for a weekday (0 = Sunday). Returns null for non-working days. */
export function workMinutesFor(day, settings = DEFAULT_SETTINGS) {
  return settings.days[day] ?? null;
}

/** "9:30" style 12h label for an "HH:MM" string. */
export const timeStrLabel = (t) => fmt12(localDate("2000-01-01", t));

export function fmt12(date) {
  let h = date.getHours();
  const m = date.getMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad(m)} ${ap}`;
}

export function fmtDuration(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function fmtHMS(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export const fmtDateLong = (d) =>
  d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export const weekdayName = (d) => d.toLocaleDateString(undefined, { weekday: "long" });

/**
 * Validates the form and builds a session.
 * Returns { error } or { session }.
 */
export function buildSession({ date, start, breakMin, remind }, settings = DEFAULT_SETTINGS) {
  if (!date || !start || breakMin === "") {
    return { error: ["Missing details", "Please fill in the date, start time and break."] };
  }
  const brk = Number(breakMin);
  if (!Number.isFinite(brk) || brk < 0 || brk > settings.maxBreak) {
    return { error: ["Check your break", `Break must be between 0 and ${settings.maxBreak} minutes.`] };
  }
  const startDate = localDate(date, start);
  const workMin = workMinutesFor(startDate.getDay(), settings);
  if (workMin === null) {
    return {
      error: [`${DAY_NAMES[startDate.getDay()]} is off`, `Pick a working day (${workDaysLabel(settings)}).`],
    };
  }
  if (startDate < localDate(date, settings.earliestStart)) {
    return { error: ["Too early", `Start time can't be earlier than ${timeStrLabel(settings.earliestStart)}.`] };
  }

  const startMs = startDate.getTime();
  const endMs = startMs + (workMin + brk) * 60000;
  const remindMin = Number(remind);
  const now = Date.now();

  return {
    session: {
      start: startMs,
      end: endMs,
      workMin,
      breakMin: brk,
      remind: remindMin,
      // don't fire reminders that are already in the past
      remindFired: remindMin > 0 && now >= endMs - remindMin * 60000,
      endFired: now >= endMs,
    },
  };
}
