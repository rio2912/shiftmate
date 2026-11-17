import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import TimeForm from "./components/TimeForm.jsx";
import ResultPanel from "./components/ResultPanel.jsx";
import RemindersCard from "./components/RemindersCard.jsx";
import MiniWidget from "./components/MiniWidget.jsx";
import Toasts from "./components/Toasts.jsx";
import TimeUpModal from "./components/TimeUpModal.jsx";
import WelcomeModal from "./components/WelcomeModal.jsx";
import SettingsPage from "./components/SettingsPage.jsx";
import { BriefcaseIcon, GearIcon, MoonIcon, PipIcon, PlayIcon, SunIcon } from "./components/Icons.jsx";
import useNow from "./hooks/useNow.js";
import useNotifications from "./hooks/useNotifications.js";
import useReminders, { REMINDER_TYPES } from "./hooks/useReminders.js";
import usePip from "./hooks/usePip.js";
import useSettings from "./hooks/useSettings.js";
import { readSettings, workDaysLabel } from "./utils/settings.js";
import {
  buildSession,
  fmt12,
  fmtHMS,
  nowTimeStr,
  toDateStr,
  toTimeStr,
  todayStr,
} from "./utils/time.js";

const STORAGE_KEY = "workTimeCalc.session.v1";
const THEME_KEY = "workTimeCalc.theme";

function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return s && s.end ? s : null;
  } catch {
    return null;
  }
}

function formFromSession(s, settings) {
  if (!s)
    return {
      date: todayStr(),
      start: nowTimeStr(),
      breakMin: String(settings.defaultBreak),
      remind: String(settings.defaultRemind),
    };
  const d = new Date(s.start);
  return { date: toDateStr(d), start: toTimeStr(d), breakMin: String(s.breakMin), remind: String(s.remind) };
}

let toastId = 0;

// Present when running as the desktop app (see electron/preload.cjs)
const desktop = typeof window !== "undefined" ? window.workTime : undefined;

export default function App() {
  const now = useNow(1000);
  const { permission, request, notify } = useNotifications();

  const [settings, saveSettings] = useSettings();
  const [view, setView] = useState("home"); // "home" | "settings"
  const [session, setSession] = useState(loadSession);
  const [form, setForm] = useState(() => formFromSession(loadSession(), readSettings()));
  const [toasts, setToasts] = useState([]);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved) return saved;
    } catch {
      /* ignore */
    }
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  const pip = usePip(theme);
  const [widgetOn, setWidgetOn] = useState(false);

  // Desktop app: track whether the round floating timer is showing
  useEffect(() => {
    if (!desktop) return;
    desktop.widgetVisible().then(setWidgetOn);
    return desktop.onWidgetState(setWidgetOn);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toast = useCallback((title, message, type = "info", ms = 4500) => {
    const id = ++toastId;
    setToasts((list) => [...list, { id, title, message, type }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), ms);
  }, []);

  // ---- Daily reminders (tea, lunch, custom) ----
  const onReminder = useCallback(
    (r) => {
      const emoji = REMINDER_TYPES[r.type]?.emoji || "🔔";
      const msg = `It's ${fmt12(new Date())} — ${r.label}.`;
      notify(`${emoji} ${r.label}`, msg);
      toast(`${emoji} ${r.label}`, msg, "info", 15000);
    },
    [notify, toast]
  );
  const reminders = useReminders(now, onReminder, settings);

  // Persist session so the countdown survives refresh / reopening
  useEffect(() => {
    try {
      if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage not available */
    }
  }, [session]);

  // End-of-day reminder + notification, and the tab title
  useEffect(() => {
    if (!session) {
      document.title = "ShiftMate";
      return;
    }
    const left = session.end - now;

    if (now < session.start) {
      document.title = "ShiftMate";
    } else if (left <= 0) {
      document.title = "✅ Time to go! — ShiftMate";
    } else {
      document.title = `${fmtHMS(left)} left — ShiftMate`;
    }

    if (left <= 0 && !session.endFired) {
      setSession((s) => ({ ...s, endFired: true, remindFired: true }));
      notify("Time's up! 🎉", "Your work day is complete. Have a good evening!");
      setShowTimeUp(true);
    } else if (left > 0 && session.remind > 0 && left <= session.remind * 60000 && !session.remindFired) {
      setSession((s) => ({ ...s, remindFired: true }));
      const msg = `${session.remind} minutes left — you can leave at ${fmt12(new Date(session.end))}.`;
      notify("Almost done ⏳", msg);
      toast("Almost done ⏳", msg, "warn", 10000);
    }
  }, [now, session, notify, toast]);

  const startWith = (values, { fromWidget = false } = {}) => {
    const { error, session: next } = buildSession(values, settings);
    if (error) {
      toast(error[0], error[1], "error");
      if (fromWidget) notify(error[0], error[1]); // main window may be hidden
      return false;
    }
    setSession(next);
    setShowTimeUp(false);
    toast("All set", `You can leave at ${fmt12(new Date(next.end))}.`, "success");
    if (permission === "default") {
      request().then((p) => {
        if (p === "granted") toast("Notifications on", "You'll get desktop reminders.", "success");
      });
    }
    return true;
  };

  const handleSubmit = () => startWith(form);

  // One-click start: today, from the current time (never earlier than the earliest start)
  const lastQuickStart = useRef(0);
  const quickStart = (opts) => {
    // Ignore repeats (double clicks, or a session that's already running)
    if (Date.now() - lastQuickStart.current < 1500) return;
    if (session && Date.now() < session.end) return;
    lastQuickStart.current = Date.now();

    let start = nowTimeStr();
    if (start < settings.earliestStart) start = settings.earliestStart;
    const values = { ...form, date: todayStr(), start };
    setForm(values);
    startWith(values, opts);
  };

  // The floating timer's Start button asks the main window to start
  const quickStartRef = useRef(quickStart);
  quickStartRef.current = quickStart;
  useEffect(() => {
    if (!desktop) return;
    return desktop.onQuickStart(() => quickStartRef.current({ fromWidget: true }));
  }, []);

  const handleSaveSettings = (next) => {
    saveSettings(next);
    // New defaults show up right away when no day is being tracked
    if (!session) setForm((f) => ({ ...f, breakMin: String(next.defaultBreak), remind: String(next.defaultRemind) }));
    setView("home");
    toast("Settings saved", "Your work policy has been updated.", "success");
  };

  const handleReset = () => {
    setSession(null);
    setShowTimeUp(false);
    setForm(formFromSession(null, settings));
  };

  const floatingOpen = desktop ? widgetOn : !!pip.pipWindow;
  const toggleFloating = () => {
    if (desktop) desktop.toggleWidget();
    else if (pip.pipWindow) pip.close();
    else openPip();
  };

  const openPip = async () => {
    if (!pip.supported) {
      toast("Pop-out not available", "Use Chrome or Edge to get the always-on-top mini window.", "error", 6000);
      return;
    }
    try {
      await pip.open();
    } catch {
      toast("Couldn't open the mini window", "Please try clicking the button again.", "error");
    }
  };

  const nowDate = new Date(now);
  const hour = nowDate.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const running = session && now < session.end;

  // Reminders are managed on the Settings page
  const remindersCard = (
    <RemindersCard
      reminders={reminders.reminders}
      next={reminders.next}
      workDays={workDaysLabel(settings)}
      onAdd={(r) => {
        reminders.add(r);
        toast("Reminder added", `${r.label} at ${fmt12(new Date(`2000-01-01T${r.time}`))}.`, "success");
      }}
      onUpdate={(id, r) => {
        reminders.update(id, r);
        toast("Reminder updated", `${r.label} at ${fmt12(new Date(`2000-01-01T${r.time}`))}.`, "success");
      }}
      onRemove={reminders.remove}
      onToggle={reminders.toggle}
      onError={(t, m) => toast(t, m, "error")}
    />
  );

  return (
    <div className="app">      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />

      <header className="topbar">
        <div className="brand">
          <div className="logo">
            <BriefcaseIcon width={20} height={20} />
          </div>
          <div>
            <h1>ShiftMate</h1>
            <p>
              {greeting}
              {settings.name ? `, ${settings.name}` : ""} 👋
              {settings.company && <span className="brand-company">{settings.company}</span>}
            </p>
          </div>
        </div>

        <div className="topbar-right">
          {!running && (
            <button type="button" className="btn btn-primary btn-start" onClick={() => quickStart()} title="Start tracking from now">
              <PlayIcon width={13} height={13} /> Start
            </button>
          )}
          <div className="live-clock" title="Current time">
            <span className="live-dot" />
            {nowDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" })}
          </div>
          <button
            type="button"
            className={`icon-btn ${floatingOpen ? "active" : ""}`}
            onClick={toggleFloating}
            aria-label={floatingOpen ? "Hide floating timer" : "Show floating timer (stays on top)"}
            title={floatingOpen ? "Hide floating timer" : "Floating timer — always on top"}
          >
            <PipIcon />
          </button>
          <button
            type="button"
            className={`icon-btn ${view === "settings" ? "active" : ""}`}
            onClick={() => setView((v) => (v === "settings" ? "home" : "settings"))}
            aria-label="Settings"
            title="Settings — your name and work policy"
          >
            <GearIcon />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {view === "settings" ? (
        <SettingsPage
          settings={settings}
          onSave={handleSaveSettings}
          onApplyNow={(patch) => saveSettings((s) => ({ ...s, ...patch }))}
          onClose={() => setView("home")}
          onError={(t, m) => toast(t, m, "error")}
          remindersCard={remindersCard}
          activeReminders={reminders.reminders.filter((r) => r.enabled).length}
        />
      ) : (
      <main className="layout">
        <div className="col">
          <TimeForm
            values={form}
            onChange={setForm}
            onSubmit={handleSubmit}
            tracking={!!session}
            settings={settings}
            onOpenSettings={() => setView("settings")}
          />

        </div>
        <div className="col col-sticky">
          <ResultPanel
            session={session}
            now={now}
            next={reminders.next}
            permission={permission}
            onEnableNotifications={request}
            onReset={handleReset}
            onPopOut={toggleFloating}
            popOutOpen={floatingOpen}
          />
        </div>
      </main>
      )}

      <footer>Powered by ShiftMate</footer>

      <Toasts toasts={toasts} />
      <TimeUpModal open={showTimeUp} onClose={() => setShowTimeUp(false)} />
      <WelcomeModal
        open={!settings.name}
        onSave={(name) => {
          saveSettings((s) => ({ ...s, name }));
          toast(`Hi ${name}!`, "Set your company work hours anytime from the ⚙ Settings button.", "success", 7000);
        }}
      />

      {!desktop &&
        pip.pipWindow &&
        createPortal(
          <MiniWidget session={session} now={now} next={reminders.next} onStart={() => quickStart()} onResize={pip.resize} />,
          pip.pipWindow.document.body
        )}
    </div>
  );
}
