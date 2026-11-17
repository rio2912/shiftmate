import { useState } from "react";
import { fmt12, fmtHMS } from "../utils/time";
import { REMINDER_TYPES } from "../hooks/useReminders.js";
import { BriefcaseIcon, PlayIcon } from "./Icons.jsx";

export const COMPACT_SIZE = { width: 170, height: 170 };
export const EXPANDED_SIZE = { width: 300, height: 230 };

const ExpandIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
);
const CollapseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
  </svg>
);

function getState(session, now) {
  if (!session) return null;
  const total = session.end - session.start;
  const left = session.end - now;
  const pct = Math.max(0, Math.min(100, ((now - session.start) / total) * 100));
  const state =
    now < session.start
      ? "upcoming"
      : left <= 0
      ? "done"
      : session.remind > 0 && left <= session.remind * 60000
      ? "soon"
      : "working";
  const time = state === "done" ? "Done! 🎉" : state === "upcoming" ? fmtHMS(session.start - now) : fmtHMS(left);
  return { pct, state, time };
}

/** Countdown shown inside the floating always-on-top window. Compact by default. */
export default function MiniWidget({ session, now, next, onStart, onResize }) {
  const [compact, setCompact] = useState(true);
  const info = getState(session, now);

  const toggle = () => {
    const nextCompact = !compact;
    setCompact(nextCompact);
    onResize(nextCompact ? COMPACT_SIZE : EXPANDED_SIZE);
  };

  const sizeBtn = (
    <button
      type="button"
      className="mini-size"
      onClick={toggle}
      title={compact ? "Expand" : "Make small"}
      aria-label={compact ? "Expand" : "Make small"}
    >
      {compact ? <ExpandIcon /> : <CollapseIcon />}
    </button>
  );

  // ---------- Compact circle ----------
  if (compact) {
    const R = 44;
    const C = 2 * Math.PI * R;
    const pct = info ? info.pct : 0;
    return (
      <div className={`mini circle ${info?.state || "idle"}`}>
        <svg className="mc-ring" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id="miniGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--accent-1)" />
              <stop offset="100%" stopColor="var(--accent-2)" />
            </linearGradient>
          </defs>
          <circle className="mc-disc" cx="50" cy="50" r="49" />
          <circle className="mc-track" cx="50" cy="50" r={R} />
          {info && (
            <circle
              className="mc-progress"
              cx="50"
              cy="50"
              r={R}
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct / 100)}
            />
          )}
        </svg>

        <div className="mc-center">
          {info ? (
            <>
              <BriefcaseIcon width={14} height={14} className="mc-icon" />
              <span className={`mc-time ${info.state}`}>{info.time}</span>
              <span className="mc-sub">
                {info.state === "upcoming" ? "until start" : `Leave ${fmt12(new Date(session.end))}`}
              </span>
            </>
          ) : (
            <button type="button" className="mc-start" onClick={onStart} aria-label="Start tracking now">
              <PlayIcon width={22} height={22} />
              <span>Start</span>
            </button>
          )}
        </div>

        {sizeBtn}
      </div>
    );
  }

  // ---------- Expanded card ----------
  return (
    <div className="mini">
      <div className="mini-head">
        <span className="mini-logo">
          <BriefcaseIcon width={14} height={14} />
        </span>
        <span>ShiftMate</span>
        <span className="mini-clock">{fmt12(new Date(now))}</span>
        {sizeBtn}
      </div>
      {info ? (
        <>
          <div className={`mini-time ${info.state}`}>{info.time}</div>
          <div className="mini-sub">
            {info.state === "upcoming" ? "until start" : <>Leave at <b>{fmt12(new Date(session.end))}</b></>}
          </div>
          <div className={`mini-bar ${info.state}`}>
            <div style={{ width: `${info.pct}%` }} />
          </div>
        </>
      ) : (
        <>
          <div className="mini-time muted">Not started</div>
          <button type="button" className="btn btn-primary mini-start" onClick={onStart}>
            <PlayIcon width={14} height={14} /> Start now
          </button>
        </>
      )}
      {next && (
        <div className="mini-next">
          {REMINDER_TYPES[next.type]?.emoji || "🔔"} {next.label} · {fmt12(new Date(`2000-01-01T${next.time}`))}
        </div>
      )}
    </div>
  );
}
