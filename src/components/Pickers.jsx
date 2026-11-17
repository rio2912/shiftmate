import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { pad, toDateStr, nowTimeStr, todayStr, localDate } from "../utils/time";
import { CalendarIcon, ChevronIcon, ClockIcon, CloseIcon } from "./Icons.jsx";

/* ---------- shared popover ---------- */

// Popover rendered into <body> so cards (backdrop-filter) can't clip or cover it.
function usePopover(width, height) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const popRef = useRef(null);

  const place = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const gap = 8;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    const below = r.bottom + gap + height <= window.innerHeight;
    const top = below ? r.bottom + gap : Math.max(8, r.top - gap - height);
    setPos({ left, top, origin: below ? "top" : "bottom" });
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onDown = (e) => {
      if (!popRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.querySelector("button")?.focus();
      }
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const portal = (children, className) =>
    open && pos
      ? createPortal(
          <div
            ref={popRef}
            className={`picker-pop ${className} from-${pos.origin}`}
            style={{ left: pos.left, top: pos.top, width }}
            role="dialog"
          >
            {children}
          </div>,
          document.body
        )
      : null;

  return { open, setOpen, triggerRef, portal };
}

function Trigger({ id, triggerRef, open, onClick, onClear, icon, text, placeholder, compact, ariaLabel }) {
  return (
    <div className={`picker-field ${text ? "has-value" : ""}`} ref={triggerRef}>
      <button
        id={id}
        type="button"
        className={`picker-trigger ${compact ? "compact" : ""} ${open ? "open" : ""}`}
        onClick={onClick}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        {icon}
        <span className={text ? "" : "placeholder"}>{text || placeholder}</span>
        <ChevronIcon className="picker-chevron" width={16} height={16} />
      </button>
      {text && (
        <button type="button" className="picker-clear" onClick={onClear} aria-label="Clear" title="Clear">
          <CloseIcon width={14} height={14} />
        </button>
      )}
    </div>
  );
}

/* ---------- time picker ---------- */

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const parseTime = (v) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(v || "");
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return { h12: h % 12 || 12, m, pm: h >= 12 };
};
const buildTime = ({ h12, m, pm }) => `${pad((h12 % 12) + (pm ? 12 : 0))}:${pad(m)}`;
const timeText = (v) => {
  const t = parseTime(v);
  return t ? `${t.h12}:${pad(t.m)} ${t.pm ? "PM" : "AM"}` : "";
};

function Column({ items, selected, onPick, format, label }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current?.querySelector(".selected");
    if (el) ref.current.scrollTop = el.offsetTop - ref.current.clientHeight / 2 + el.clientHeight / 2;
  }, [selected]);
  return (
    <div className="tp-col" ref={ref} role="listbox" aria-label={label}>
      {items.map((it) => (
        <button
          key={it}
          type="button"
          role="option"
          aria-selected={it === selected}
          className={it === selected ? "selected" : ""}
          onClick={() => onPick(it)}
        >
          {format(it)}
        </button>
      ))}
    </div>
  );
}

export function TimePicker({ id, value, onChange, placeholder = "Select time", compact, ariaLabel }) {
  const pop = usePopover(260, 318);
  const t = parseTime(value) || parseTime(nowTimeStr());
  const set = (patch) => onChange(buildTime({ ...t, ...patch }));

  return (
    <>
      <Trigger
        id={id}
        triggerRef={pop.triggerRef}
        open={pop.open}
        onClick={() => pop.setOpen((o) => !o)}
        icon={compact ? null : <ClockIcon className="picker-icon" />}
        text={timeText(value)}
        placeholder={placeholder}
        compact={compact}
        ariaLabel={ariaLabel}
        onClear={() => {
          onChange("");
          pop.setOpen(false);
        }}
      />
      {pop.portal(
        <>
          <div className="tp-head">
            <span>
              {t.h12}:{pad(t.m)}
            </span>
            <div className="tp-ampm" role="radiogroup" aria-label="AM or PM">
              {["AM", "PM"].map((x) => (
                <button
                  key={x}
                  type="button"
                  role="radio"
                  aria-checked={t.pm === (x === "PM")}
                  className={t.pm === (x === "PM") ? "active" : ""}
                  onClick={() => set({ pm: x === "PM" })}
                >
                  {x}
                </button>
              ))}
            </div>
          </div>
          <div className="tp-cols">
            <div className="tp-col-wrap">
              <small>Hour</small>
              <Column label="Hour" items={HOURS} selected={t.h12} onPick={(h12) => set({ h12 })} format={String} />
            </div>
            <div className="tp-col-wrap">
              <small>Minute</small>
              <Column label="Minute" items={MINUTES} selected={t.m} onPick={(m) => set({ m })} format={pad} />
            </div>
          </div>
          <div className="picker-foot">
            <div className="picker-foot-left">
              <button type="button" className="picker-link" onClick={() => onChange(nowTimeStr())}>
                Now
              </button>
              {value && (
                <button
                  type="button"
                  className="picker-link danger"
                  onClick={() => {
                    onChange("");
                    pop.setOpen(false);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            <button
              type="button"
              className="picker-done"
              onClick={() => {
                if (!parseTime(value)) onChange(buildTime(t));
                pop.setOpen(false);
              }}
            >
              Done
            </button>
          </div>
        </>,
        "tp-pop"
      )}
    </>
  );
}

/* ---------- date picker ---------- */

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function DatePicker({ id, value, onChange, placeholder = "Select date", isOff = (d) => d.getDay() === 0 }) {
  const pop = usePopover(292, 352);
  const selected = value ? localDate(value) : null;
  const [view, setView] = useState(() => {
    const d = selected || new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Jump the calendar to the selected month each time it opens
  useEffect(() => {
    if (pop.open) {
      const d = selected || new Date();
      setView(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [pop.open]);

  const today = todayStr();
  const lead = (view.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1)),
  ];
  const shift = (n) => setView(new Date(view.getFullYear(), view.getMonth() + n, 1));
  const pick = (d) => {
    onChange(toDateStr(d));
    pop.setOpen(false);
  };

  const text = selected
    ? selected.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <>
      <Trigger
        id={id}
        triggerRef={pop.triggerRef}
        open={pop.open}
        onClick={() => pop.setOpen((o) => !o)}
        icon={<CalendarIcon className="picker-icon" />}
        text={text}
        placeholder={placeholder}
        onClear={() => {
          onChange("");
          pop.setOpen(false);
        }}
      />
      {pop.portal(
        <>
          <div className="dp-head">
            <button type="button" className="dp-nav" onClick={() => shift(-1)} aria-label="Previous month">
              <ChevronIcon width={16} height={16} style={{ transform: "rotate(90deg)" }} />
            </button>
            <strong>{view.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong>
            <button type="button" className="dp-nav" onClick={() => shift(1)} aria-label="Next month">
              <ChevronIcon width={16} height={16} style={{ transform: "rotate(-90deg)" }} />
            </button>
          </div>
          <div className="dp-grid">
            {WEEKDAYS.map((w, i) => (
              <span key={w} className={`dp-wd ${isOff(new Date(2024, 0, 1 + i)) ? "off" : ""}`}>
                {w}
              </span>
            ))}
            {cells.map((d, i) => {
              if (!d) return <span key={`e${i}`} />;
              const s = toDateStr(d);
              const cls = [
                s === value && "selected",
                s === today && "today",
                isOff(d) && "off",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button key={s} type="button" className={cls} onClick={() => pick(d)} aria-label={d.toDateString()}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="picker-foot">
            <div className="picker-foot-left">
              <button type="button" className="picker-link" onClick={() => pick(new Date())}>
                Today
              </button>
              {value && (
                <button
                  type="button"
                  className="picker-link danger"
                  onClick={() => {
                    onChange("");
                    pop.setOpen(false);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            <button type="button" className="picker-done" onClick={() => pop.setOpen(false)}>
              Close
            </button>
          </div>
        </>,
        "dp-pop"
      )}
    </>
  );
}
