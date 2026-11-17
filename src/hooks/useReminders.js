import { useCallback, useEffect, useRef, useState } from "react";
import { localDate, toDateStr } from "../utils/time.js";
import { DEFAULT_SETTINGS, isWorkDay } from "../utils/settings.js";

const LIST_KEY = "workTimeCalc.reminders.v1";
const FIRED_KEY = "workTimeCalc.remindersFired.v1";

export const REMINDER_TYPES = {
  tea: { emoji: "☕", label: "Tea break" },
  lunch: { emoji: "🍽️", label: "Lunch break" },
  meeting: { emoji: "👥", label: "Meeting" },
  water: { emoji: "💧", label: "Drink water" },
  custom: { emoji: "🔔", label: "Reminder" },
};

const DEFAULT_REMINDERS = [
  { id: "tea-1", time: "11:00", label: "Tea break", type: "tea", enabled: true },
  { id: "lunch", time: "13:00", label: "Lunch break", type: "lunch", enabled: true },
  { id: "tea-2", time: "16:00", label: "Tea break", type: "tea", enabled: true },
];

function read(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage not available */
  }
}

const byTime = (a, b) => a.time.localeCompare(b.time);

/**
 * Daily reminders (tea, lunch, meetings, anything custom).
 * They fire once per day at their time on working days (from settings) while the app is open.
 */
export default function useReminders(now, onFire, settings = DEFAULT_SETTINGS) {
  const [reminders, setReminders] = useState(() =>
    read(LIST_KEY, DEFAULT_REMINDERS)
      .filter((r) => /^\d{2}:\d{2}$/.test(r.time))
      .sort(byTime)
  );
  const firedRef = useRef(read(FIRED_KEY, { date: "", ids: [] }));

  useEffect(() => write(LIST_KEY, reminders), [reminders]);

  // Fire any reminder whose time arrived within the last minute
  useEffect(() => {
    const today = new Date(now);
    if (!isWorkDay(settings, today.getDay())) return; // day off
    const dateStr = toDateStr(today);
    if (firedRef.current.date !== dateStr) firedRef.current = { date: dateStr, ids: [] };

    for (const r of reminders) {
      if (!r.enabled || firedRef.current.ids.includes(r.id)) continue;
      const at = localDate(dateStr, r.time).getTime();
      if (now >= at && now - at < 60000) {
        firedRef.current.ids.push(r.id);
        write(FIRED_KEY, firedRef.current);
        onFire(r);
      }
    }
  }, [now, reminders, onFire, settings]);

  const add = useCallback((r) => {
    const item = { id: `r-${Date.now()}`, enabled: true, ...r };
    setReminders((list) => [...list, item].sort(byTime));
  }, []);

  const update = useCallback((id, changes) => {
    // A new time may be later today, so let it fire again
    const fired = firedRef.current;
    if (changes.time && fired.ids.includes(id)) {
      fired.ids = fired.ids.filter((x) => x !== id);
      write(FIRED_KEY, fired);
    }
    setReminders((list) => list.map((r) => (r.id === id ? { ...r, ...changes } : r)).sort(byTime));
  }, []);

  const remove = useCallback((id) => setReminders((list) => list.filter((r) => r.id !== id)), []);

  const toggle = useCallback(
    (id) => setReminders((list) => list.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))),
    []
  );

  // Next enabled reminder later today
  const nowTime = new Date(now);
  const hhmm = `${String(nowTime.getHours()).padStart(2, "0")}:${String(nowTime.getMinutes()).padStart(2, "0")}`;
  const next = !isWorkDay(settings, nowTime.getDay()) ? null : reminders.find((r) => r.enabled && r.time > hhmm) || null;

  return { reminders, add, update, remove, toggle, next };
}
