import { useEffect, useRef, useState } from "react";
import useNow from "./hooks/useNow.js";
import { REMINDER_TYPES } from "./hooks/useReminders.js";
import { BriefcaseIcon, PlayIcon } from "./components/Icons.jsx";
import { fmt12, fmtHMS } from "./utils/time.js";
import { isWorkDay, readSettings, widgetDims } from "./utils/settings.js";

// Same keys the main window writes to (both windows share storage)
const SESSION_KEY = "workTimeCalc.session.v1";
const THEME_KEY = "workTimeCalc.theme";
const REMINDERS_KEY = "workTimeCalc.reminders.v1";

const read = (key, fallback = null) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const readTheme = () => {
  try {
    return localStorage.getItem(THEME_KEY) || "dark";
  } catch {
    return "dark";
  }
};

const PAD = 4; // room for the drop shadow

/** Outline + progress track for the chosen shape, in window pixels. */
function ShapeRing({ shape, W, H, sw, pct, showProgress }) {
  const inset = PAD + sw / 2 + 3;
  const progress = { className: "w-progress", pathLength: 100, strokeDasharray: 100, strokeDashoffset: 100 - pct, style: { strokeWidth: sw } };
  const track = { className: "w-track", style: { strokeWidth: sw } };
  if (shape === "circle") {
    const c = W / 2;
    const rot = `rotate(-90 ${c} ${c})`; // progress starts at 12 o'clock
    return (
      <>
        <circle className="w-disc" cx={c} cy={c} r={c - PAD} />
        <circle {...track} cx={c} cy={c} r={c - inset} />
        {showProgress && <circle {...progress} cx={c} cy={c} r={c - inset} transform={rot} />}
      </>
    );
  }
  const outerR = shape === "pill" ? (H - 2 * PAD) / 2 : (W - 2 * PAD) * 0.24;
  const innerR = Math.max(2, outerR - (inset - PAD));
  const rect = { x: inset, y: inset, width: W - 2 * inset, height: H - 2 * inset, rx: innerR };
  return (
    <>
      <rect className="w-disc" x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} rx={outerR} />
      <rect {...track} {...rect} />
      {showProgress && <rect {...progress} {...rect} />}
    </>
  );
}

/** The round always-on-top timer window of the desktop app. */
export default function WidgetApp() {
  const now = useNow(1000);
  const [session, setSession] = useState(() => read(SESSION_KEY));
  const [reminders, setReminders] = useState(() => read(REMINDERS_KEY, []));
  const [theme, setTheme] = useState(readTheme);
  const [settings, setSettings] = useState(readSettings);
  const [starting, setStarting] = useState(false);
  const startTimer = useRef(null);

  // Stay in sync with the main window
  useEffect(() => {
    const sync = () => {
      setSession(read(SESSION_KEY));
      setReminders(read(REMINDERS_KEY, []));
      setTheme(readTheme());
      setSettings(readSettings());
    };
    window.addEventListener("storage", sync);
    const id = setInterval(sync, 3000); // fallback
    return () => {
      window.removeEventListener("storage", sync);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.body.className = "widget-body";
  }, [theme]);

  const api = window.workTime;

  // Shape & size come from Settings; resize the window to match
  const shape = settings.widgetShape;
  const { width: W, height: H } = widgetDims(shape, settings.widgetSize);
  const k = settings.widgetSize / 150; // text/button scale
  const sw = Math.max(5, Math.round(Math.min(W, H) * (shape === "pill" ? 0.075 : 0.055)));
  useEffect(() => {
    api?.setWidgetSize?.(W, H);
  }, [W, H]);

  // A new session arrived from the main window: stop showing "Starting…"
  useEffect(() => {
    setStarting(false);
    clearTimeout(startTimer.current);
  }, [session?.start]);
  useEffect(() => () => clearTimeout(startTimer.current), []);

  const start = (e) => {
    e.stopPropagation();
    if (starting || !api) return; // ignore double clicks
    setStarting(true);
    api.quickStart();
    // Main window may refuse (e.g. a day off) — allow another try after a moment
    startTimer.current = setTimeout(() => setStarting(false), 4000);
  };

  // Status
  let state = "idle";
  let pct = 0;
  let time = "";
  if (session) {
    const total = session.end - session.start;
    const left = session.end - now;
    pct = Math.max(0, Math.min(100, ((now - session.start) / total) * 100));
    state =
      now < session.start
        ? "upcoming"
        : left <= 0
        ? "done"
        : session.remind > 0 && left <= session.remind * 60000
        ? "soon"
        : "working";
    time = state === "upcoming" ? fmtHMS(session.start - now) : fmtHMS(left);
  }
  // No session, or the day is over: offer Start again
  const showStart = !session || state === "done";

  const d = new Date(now);
  const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const next = !isWorkDay(settings, d.getDay()) ? null : reminders.find((r) => r.enabled && r.time > hhmm);

  return (
    <div
      className={`widget shape-${shape} ${showStart ? "idle" : state}`}
      style={{ "--k": k }}
      onDoubleClick={() => api?.openMain()}
      title="Drag to move · double-click to open"
    >
      <svg className="w-ring" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <linearGradient id="wGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-1)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <ShapeRing shape={shape} W={W} H={H} sw={sw} pct={pct} showProgress={!showStart} />
      </svg>

      <div className="w-center">
        {!showStart ? (
          <>
            <span className="w-main">
              <BriefcaseIcon width={Math.round(13 * k)} height={Math.round(13 * k)} className="w-icon" />
              <span className="w-time">{time}</span>
            </span>
            <span className="w-meta">
              <span className="w-sub">
                {state === "upcoming" ? "until start" : `Leave ${fmt12(new Date(session.end))}`}
              </span>
              {next && (
                <span className="w-next">
                  {REMINDER_TYPES[next.type]?.emoji || "🔔"} {fmt12(new Date(`2000-01-01T${next.time}`))}
                </span>
              )}
            </span>
          </>
        ) : (
          <button
            type="button"
            className={`w-start no-drag ${starting ? "starting" : ""}`}
            onClick={start}
            onDoubleClick={(e) => e.stopPropagation()}
            disabled={starting}
            title="Start tracking now"
          >
            <PlayIcon width={Math.round(20 * k)} height={Math.round(20 * k)} />
            <span>{starting ? "Starting…" : "Start"}</span>
          </button>
        )}
      </div>

      <div className="w-actions no-drag">
        <button type="button" onClick={() => api?.openMain()} title="Open ShiftMate" aria-label="Open ShiftMate">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
          </svg>
        </button>
        <button type="button" onClick={() => api?.hideWidget()} title="Hide floating timer" aria-label="Hide floating timer">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
