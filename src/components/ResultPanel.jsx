import { fmt12, fmtDuration, fmtHMS, fmtDateLong } from "../utils/time";
import { BellIcon, BellOffIcon, BriefcaseIcon, CoffeeIcon, DoorIcon, PipIcon, ResetIcon } from "./Icons.jsx";
import { REMINDER_TYPES } from "../hooks/useReminders.js";

const R = 112;
const CIRC = 2 * Math.PI * R;

function Ring({ pct, statusClass, children }) {
  return (
    <div className={`ring ${statusClass}`}>
      <svg viewBox="0 0 260 260" aria-hidden="true">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-1)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <circle className="ring-track" cx="130" cy="130" r={R} />
        <circle
          className="ring-bar"
          cx="130"
          cy="130"
          r={R}
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - pct / 100)}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

function NotificationBox({ permission, onEnable }) {
  if (permission === "granted") {
    return (
      <div className="notif on">
        <BellIcon width={16} height={16} />
        <span>Desktop reminders are on — keep this tab open.</span>
      </div>
    );
  }
  if (permission === "default") {
    return (
      <div className="notif off">
        <BellOffIcon width={16} height={16} />
        <span>Get a desktop reminder even when this window is hidden.</span>
        <button type="button" className="btn btn-soft btn-sm" onClick={onEnable}>
          Enable
        </button>
      </div>
    );
  }
  return (
    <div className="notif off">
      <BellOffIcon width={16} height={16} />
      <span>
        {permission === "denied"
          ? "Notifications are blocked in browser settings — you'll still get an on-screen alert and sound."
          : "Desktop notifications aren't supported here — you'll get an on-screen alert and sound."}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="card result-card empty">
      <div className="ring idle">
        <svg viewBox="0 0 260 260" aria-hidden="true">
          <circle className="ring-track dashed" cx="130" cy="130" r={R} />
        </svg>
        <div className="ring-center">
          <div className="ring-time muted">Ready</div>
          <div className="ring-sub">waiting to start</div>
        </div>
      </div>
      <h3>When can I leave?</h3>
      <p>Pick your start time and break, then hit <b>Calculate</b>. The countdown stays on screen and you'll get a reminder before it's time to go.</p>
    </section>
  );
}

export default function ResultPanel({ session, now, next, permission, onEnableNotifications, onReset, onPopOut, popOutOpen }) {
  if (!session) return <EmptyState />;

  const start = new Date(session.start);
  const end = new Date(session.end);
  const total = session.end - session.start;
  const left = session.end - now;
  const elapsed = Math.max(0, Math.min(total, now - session.start));

  let status, statusClass, countdown, sub, pct;
  if (now < session.start) {
    status = "Not started";
    statusClass = "upcoming";
    countdown = fmtHMS(session.start - now);
    sub = "until you start";
    pct = 0;
  } else if (left <= 0) {
    const over = Math.floor(-left / 60000);
    status = "Day complete";
    statusClass = "done";
    countdown = "Done!";
    const sameDay = new Date(now).toDateString() === end.toDateString();
    sub = !sameDay ? "work day completed" : over > 0 ? `+${fmtDuration(over)} overtime` : "time to go home";
    pct = 100;
  } else {
    const soon = session.remind > 0 && left <= session.remind * 60000;
    status = soon ? "Almost there" : "In progress";
    statusClass = soon ? "soon" : "working";
    countdown = fmtHMS(left);
    sub = "left to go";
    pct = (elapsed / total) * 100;
  }
  pct = Math.max(0, Math.min(100, pct));

  return (
    <section className="card result-card">
      <div className="card-head">
        <div>
          <div className="eyebrow">You can leave at</div>
          <div className="leave-time">{fmt12(end)}</div>
        </div>
        <span className={`pill ${statusClass}`}>
          <i className="dot" />
          {status}
        </span>
      </div>

      <div className="result-main">
      <Ring pct={pct} statusClass={statusClass}>
        <div className="ring-time">{countdown}</div>
        <div className="ring-sub">{sub}</div>
        <div className="ring-pct">{Math.floor(pct)}%</div>
      </Ring>

      <ol className="timeline">
        <li className={now >= session.start ? "reached" : ""}>
          <span className="t-icon"><BriefcaseIcon width={15} height={15} /></span>
          <span className="t-label">Start</span>
          <span className="t-time">{fmt12(start)}</span>
        </li>
        <li className={now >= session.start ? "reached" : ""}>
          <span className="t-icon"><CoffeeIcon width={15} height={15} /></span>
          <span className="t-label">Break</span>
          <span className="t-time">{session.breakMin ? fmtDuration(session.breakMin) : "None"}</span>
        </li>
        <li className={left <= 0 ? "reached" : ""}>
          <span className="t-icon"><DoorIcon width={15} height={15} /></span>
          <span className="t-label">Leave</span>
          <span className="t-time">{fmt12(end)}</span>
        </li>
      </ol>
      </div>

      <div className="stats">
        <div>
          <span>Date</span>
          <strong>{fmtDateLong(start)}</strong>
        </div>
        <div>
          <span>Work hours</span>
          <strong>{fmtDuration(session.workMin)}</strong>
        </div>
        <div>
          <span>Time spent</span>
          <strong>{fmtDuration(Math.floor(elapsed / 60000))}</strong>
        </div>
      </div>

      {next && (
        <div className="next-reminder">
          <span className="nr-emoji">{REMINDER_TYPES[next.type]?.emoji || "🔔"}</span>
          <span>
            Next: <b>{next.label}</b> at {fmt12(new Date(`2000-01-01T${next.time}`))}
          </span>
        </div>
      )}

      <NotificationBox permission={permission} onEnable={onEnableNotifications} />

      <div className="result-actions">
        <button type="button" className="btn btn-ghost" onClick={onPopOut}>
          <PipIcon width={16} height={16} /> {popOutOpen ? "Hide floating timer" : "Floating timer"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onReset}>
          <ResetIcon width={16} height={16} /> Reset
        </button>
      </div>
    </section>
  );
}
