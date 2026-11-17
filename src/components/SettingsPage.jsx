import { useState } from "react";
import {
  DAY_NAMES,
  DEFAULT_SETTINGS,
  WEEK_ORDER,
  WIDGET_SIZE_MAX,
  WIDGET_SIZE_MIN,
  normalizeSettings,
  widgetDims,
} from "../utils/settings.js";
import { fmtDuration, timeStrLabel } from "../utils/time";
import { TimePicker } from "./Pickers.jsx";
import { BellIcon, BriefcaseIcon, ChevronIcon, ClockIcon, CoffeeIcon, PipIcon } from "./Icons.jsx";

const DEFAULT_DAY_MIN = 480;

const SHAPES = [
  { id: "circle", label: "Circle", icon: <circle cx="20" cy="14" r="11" /> },
  { id: "square", label: "Rounded square", icon: <rect x="9" y="3" width="22" height="22" rx="6" /> },
  { id: "pill", label: "Pill", icon: <rect x="3" y="7" width="34" height="14" rx="7" /> },
];

function NumberField({ value, onChange, min = 0, max, suffix, label, width = 72 }) {
  return (
    <span className="num-field">
      <input
        type="number"
        className="plain"
        style={{ width }}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        aria-label={label}
      />
      {suffix && <em>{suffix}</em>}
    </span>
  );
}

/** Collapsible block: only one is open at a time (see openId in SettingsPage). */
function Section({ id, openId, onToggle, icon, title, summary, children }) {
  const open = openId === id;
  return (
    <section className={`card acc ${open ? "open" : ""}`}>
      <button
        type="button"
        className="acc-head"
        onClick={() => onToggle(id)}
        aria-expanded={open}
        aria-controls={`acc-${id}`}
        title={open ? "Collapse" : "Expand"}
      >
        <span className="acc-title">
          {icon}
          {title}
        </span>
        {summary && <span className="badge acc-summary">{summary}</span>}
        <span className="acc-toggle">
          <ChevronIcon width={18} height={18} />
        </span>
      </button>
      {open && (
        <div className="acc-body" id={`acc-${id}`}>
          {children}
        </div>
      )}
    </section>
  );
}

/** Settings page: profile + company work policy. Changes apply when saved. */
export default function SettingsPage({ settings, onSave, onApplyNow, onClose, onError, remindersCard, activeReminders = 0 }) {
  const [draft, setDraft] = useState(settings);
  const [openId, setOpenId] = useState("profile");
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const toggle = (id) => setOpenId((cur) => (cur === id ? null : id));
  // Floating timer look is applied immediately so you can see it on screen
  const applyNow = (patch) => {
    set(patch);
    onApplyNow(patch);
  };
  const dims = widgetDims(draft.widgetShape, draft.widgetSize);
  const shapeLabel = SHAPES.find((s) => s.id === draft.widgetShape)?.label;

  const setDay = (day, minutes) => set({ days: draft.days.map((m, i) => (i === day ? minutes : m)) });
  const setDayPart = (day, part, v) => {
    const cur = draft.days[day] ?? 0;
    const h = part === "h" ? Math.max(0, Math.min(23, Number(v) || 0)) : Math.floor(cur / 60);
    const m = part === "m" ? Math.max(0, Math.min(59, Number(v) || 0)) : cur % 60;
    setDay(day, h * 60 + m);
  };
  // Copy Monday's hours to every other working weekday
  const copyMonday = () => {
    const mon = draft.days[1];
    set({ days: draft.days.map((m, i) => (i >= 2 && i <= 5 ? mon : m)) });
  };

  // Show the error and open the block that needs fixing
  const fail = (section, title, msg) => {
    setOpenId(section);
    onError(title, msg);
  };

  const save = () => {
    const workDays = draft.days.filter((m) => m !== null);
    if (!draft.name.trim()) return fail("profile", "Name needed", "Enter your name for the greeting.");
    if (workDays.length === 0) return fail("schedule", "No working days", "Turn on at least one working day.");
    if (draft.days.some((m) => m !== null && m <= 0))
      return fail("schedule", "Check work hours", "Every working day needs more than 0 hours. Turn the day off instead.");
    if (draft.maxBreak === "" || draft.defaultBreak === "" || draft.defaultRemind === "")
      return fail("rules", "Missing values", "Fill in the break and reminder minutes.");
    if (draft.defaultBreak > draft.maxBreak)
      return fail("rules", "Check your break", "The default break can't be longer than the maximum break.");
    if (!draft.earliestStart) return fail("rules", "Earliest start needed", "Pick the earliest time you can start.");
    onSave(normalizeSettings(draft));
  };

  const close = () => {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    onClose();
  };

  const weekTotal = draft.days.reduce((a, m) => a + (m || 0), 0);
  const section = { openId, onToggle: toggle };

  return (
    <div className="settings-page">
      <div className="settings-head">
        <button type="button" className="btn btn-sm settings-back" onClick={close}>
          ← Back
        </button>
        <h2>Settings</h2>
        <span className="settings-head-spacer" aria-hidden="true" />
      </div>

      <Section {...section} id="profile" title="Profile" summary={[draft.name, draft.company].filter(Boolean).join(" · ")}>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="setName">Your name</label>
            <input
              id="setName"
              className="plain"
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              maxLength={40}
              placeholder="Your name"
            />
          </div>
          <div className="field">
            <label htmlFor="setCompany">Company (optional)</label>
            <input
              id="setCompany"
              className="plain"
              value={draft.company}
              onChange={(e) => set({ company: e.target.value })}
              maxLength={60}
              placeholder="Company name"
            />
          </div>
        </div>
      </Section>

      <Section
        {...section}
        id="schedule"
        icon={<BriefcaseIcon width={18} height={18} />}
        title="Work schedule"
        summary={`${fmtDuration(weekTotal)} / week`}
      >
        <p className="settings-hint">Set the working hours your company expects each day. Turn a day off for weekends or holidays.</p>
        <ul className="day-list">
          {WEEK_ORDER.map((day) => {
            const m = draft.days[day];
            const on = m !== null;
            return (
              <li key={day} className={on ? "" : "off"}>
                <strong>{DAY_NAMES[day]}</strong>
                <button
                  type="button"
                  className={`switch ${on ? "on" : ""}`}
                  role="switch"
                  aria-checked={on}
                  aria-label={`${DAY_NAMES[day]} is a working day`}
                  onClick={() => setDay(day, on ? null : DEFAULT_DAY_MIN)}
                >
                  <i />
                </button>
                {on ? (
                  <span className="day-hours">
                    <NumberField label={`${DAY_NAMES[day]} hours`} value={Math.floor(m / 60)} max={23} suffix="hr" width={60} onChange={(v) => setDayPart(day, "h", v)} />
                    <NumberField label={`${DAY_NAMES[day]} minutes`} value={m % 60} max={59} suffix="min" width={60} onChange={(v) => setDayPart(day, "m", v)} />
                  </span>
                ) : (
                  <span className="day-off">Day off</span>
                )}
              </li>
            );
          })}
        </ul>
        {draft.days[1] !== null && (
          <button type="button" className="link-btn settings-copy" onClick={copyMonday}>
            Copy Monday's hours to Tue – Fri
          </button>
        )}
      </Section>

      <Section
        {...section}
        id="reminders"
        icon={<BellIcon width={18} height={18} />}
        title="Reminders"
        summary={`${activeReminders} active`}
      >
        <div className="settings-reminders">{remindersCard}</div>
        <p className="settings-hint acc-note">Reminder changes are saved right away — no need to press Save.</p>
      </Section>

      <Section
        {...section}
        id="widget"
        icon={<PipIcon width={18} height={18} />}
        title="Floating timer"
        summary={`${shapeLabel} · ${draft.widgetSize}px`}
      >
        <div className="settings-rows">
          <div className="settings-row">
            <div>
              <strong>Shape</strong>
              <span>How the always-on-top timer looks.</span>
            </div>
            <div className="shape-picker" role="radiogroup" aria-label="Floating timer shape">
              {SHAPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={draft.widgetShape === s.id}
                  className={draft.widgetShape === s.id ? "active" : ""}
                  onClick={() => applyNow({ widgetShape: s.id })}
                >
                  <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true">
                    {s.icon}
                  </svg>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-row">
            <div>
              <strong>Size</strong>
              <span>
                {draft.widgetShape === "pill" ? "Height" : "Width and height"} of the timer — window is {dims.width} × {dims.height} px.
              </span>
            </div>
            <div className="size-slider">
              <span>Small</span>
              <input
                type="range"
                min={WIDGET_SIZE_MIN}
                max={WIDGET_SIZE_MAX}
                step={5}
                value={draft.widgetSize}
                onChange={(e) => applyNow({ widgetSize: Number(e.target.value) })}
                aria-label="Floating timer size"
              />
              <span>Large</span>
              <strong>{draft.widgetSize}px</strong>
            </div>
          </div>
        </div>
        <div className="widget-foot">
          <p className="settings-hint acc-note">Changes show on the floating timer right away — no need to press Save.</p>
          {(draft.widgetShape !== DEFAULT_SETTINGS.widgetShape || draft.widgetSize !== DEFAULT_SETTINGS.widgetSize) && (
            <button
              type="button"
              className="link-btn"
              onClick={() => applyNow({ widgetShape: DEFAULT_SETTINGS.widgetShape, widgetSize: DEFAULT_SETTINGS.widgetSize })}
            >
              Reset look
            </button>
          )}
        </div>
      </Section>

      <Section
        {...section}
        id="rules"
        icon={<ClockIcon width={18} height={18} />}
        title="Rules & defaults"
        summary={`Earliest ${timeStrLabel(draft.earliestStart || settings.earliestStart)}`}
      >
        <div className="settings-rows">
          <div className="settings-row">
            <div>
              <strong>Earliest start time</strong>
              <span>Start times before this aren't allowed. Quick Start uses this if you begin earlier.</span>
            </div>
            <div style={{ width: 170 }}>
              <TimePicker value={draft.earliestStart} onChange={(v) => set({ earliestStart: v })} compact ariaLabel="Earliest start time" />
            </div>
          </div>
          <div className="settings-row">
            <div>
              <strong>
                <span className="label-with-icon">
                  <CoffeeIcon width={14} height={14} /> Default break
                </span>
              </strong>
              <span>Added on top of the work hours. Used for new days.</span>
            </div>
            <NumberField label="Default break minutes" value={draft.defaultBreak} max={600} suffix="min" onChange={(v) => set({ defaultBreak: v })} />
          </div>
          <div className="settings-row">
            <div>
              <strong>Maximum break</strong>
              <span>The longest break you can enter.</span>
            </div>
            <NumberField label="Maximum break minutes" value={draft.maxBreak} max={600} suffix="min" onChange={(v) => set({ maxBreak: v })} />
          </div>
          <div className="settings-row">
            <div>
              <strong>Remind me before leaving</strong>
              <span>Default heads-up before your day ends. 0 = at the end.</span>
            </div>
            <NumberField label="Default reminder minutes" value={draft.defaultRemind} max={240} suffix="min" onChange={(v) => set({ defaultRemind: v })} />
          </div>
        </div>
      </Section>

      <div className="settings-foot">
        <button
          type="button"
          className="btn btn-sm settings-back"
          onClick={() =>
            setDraft({
              ...DEFAULT_SETTINGS,
              name: draft.name,
              company: draft.company,
              widgetShape: draft.widgetShape,
              widgetSize: draft.widgetSize,
            })
          }
        >
          Reset policy to defaults
        </button>
        <span className="settings-hint">Changes apply to the next day you start or update.</span>
        <button type="button" className="btn btn-primary btn-sm settings-save" onClick={save} disabled={!dirty}>
          Save changes
        </button>
      </div>
    </div>
  );
}
