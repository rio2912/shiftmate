import { localDate, nowTimeStr, weekdayName, workMinutesFor, fmtDuration, timeStrLabel } from "../utils/time";
import { groupDays } from "../utils/settings.js";
import { CoffeeIcon, BellIcon, PlayIcon } from "./Icons.jsx";
import { DatePicker, TimePicker } from "./Pickers.jsx";

const BREAK_OPTIONS = [
  { label: "None", value: "0" },
  { label: "15m", value: "15" },
  { label: "30m", value: "30" },
  { label: "45m", value: "45" },
  { label: "1h", value: "60" },
];

const REMIND_OPTIONS = [
  { label: "At end", value: "0" },
  { label: "5m", value: "5" },
  { label: "10m", value: "10" },
  { label: "15m", value: "15" },
  { label: "30m", value: "30" },
];

function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={String(value) === o.value}
          className={String(value) === o.value ? "active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function TimeForm({ values, onChange, onSubmit, tracking, settings, onOpenSettings }) {
  const set = (key) => (e) => onChange({ ...values, [key]: e.target.value });
  const setVal = (key) => (v) => onChange({ ...values, [key]: v });

  let dayBadge = null;
  if (values.date) {
    const d = localDate(values.date);
    const work = workMinutesFor(d.getDay(), settings);
    dayBadge =
      work === null ? (
        <span className="badge badge-danger">{weekdayName(d)} · Day off</span>
      ) : (
        <span className="badge">
          {weekdayName(d)} · {fmtDuration(work)}
        </span>
      );
  }

  return (
    <section className="card form-card">
      <div className="card-head">
        <h2>Plan your day</h2>
        {dayBadge}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        noValidate
      >
        <div className="grid-2">
          <div className="field">
            <label htmlFor="workDate">Date</label>
            <DatePicker
              id="workDate"
              value={values.date}
              onChange={setVal("date")}
              isOff={(d) => workMinutesFor(d.getDay(), settings) === null}
            />
          </div>

          <div className="field">
            <label htmlFor="startTime">
              Start time
              <button
                type="button"
                className="link-btn"
                onClick={() => onChange({ ...values, start: nowTimeStr() })}
              >
                Use now
              </button>
            </label>
            <TimePicker id="startTime" value={values.start} onChange={setVal("start")} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="breakMin">
            <span className="label-with-icon">
              <CoffeeIcon width={15} height={15} /> Break
            </span>
            <span className="label-aside">
              <input
                id="breakMin"
                className="mini-input"
                type="number"
                min="0"
                max={settings.maxBreak}
                step="1"
                value={values.breakMin}
                onChange={set("breakMin")}
                aria-label="Custom break in minutes"
              />
              min
            </span>
          </label>
          <Segmented label="Break" options={BREAK_OPTIONS} value={values.breakMin} onChange={setVal("breakMin")} />
        </div>

        <div className="field">
          <label>
            <span className="label-with-icon">
              <BellIcon width={15} height={15} /> Remind me before leaving
            </span>
          </label>
          <Segmented label="Reminder" options={REMIND_OPTIONS} value={values.remind} onChange={setVal("remind")} />
        </div>

        <button type="submit" className="btn btn-primary btn-lg">
          <PlayIcon width={16} height={16} />
          {tracking ? "Update & keep tracking" : "Calculate & start tracking"}
        </button>
      </form>

      <button type="button" className="rules" onClick={onOpenSettings} title="Change your work policy in Settings">
        {groupDays(settings).map((g) => (
          <div key={g.from}>
            <span>{g.label}</span>
            <strong>{g.minutes === null ? "Off" : `${+(g.minutes / 60).toFixed(2)} hrs`}</strong>
          </div>
        ))}
        <div>
          <span>Earliest</span>
          <strong>{timeStrLabel(settings.earliestStart)}</strong>
        </div>
      </button>
    </section>
  );
}
