import { useState } from "react";
import { fmt12 } from "../utils/time";
import { REMINDER_TYPES } from "../hooks/useReminders.js";
import { PencilIcon, PlusIcon, TrashIcon } from "./Icons.jsx";
import { TimePicker } from "./Pickers.jsx";

const timeLabel = (t) => fmt12(new Date(`2000-01-01T${t}`));

export default function RemindersCard({ reminders, next, workDays, onAdd, onUpdate, onRemove, onToggle, onError }) {
  const [type, setType] = useState("tea");
  const [time, setTime] = useState("");
  const [label, setLabel] = useState("");
  const [editingId, setEditingId] = useState(null);

  const resetForm = () => {
    setEditingId(null);
    setType("tea");
    setTime("");
    setLabel("");
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setType(REMINDER_TYPES[r.type] ? r.type : "custom");
    setTime(r.time);
    setLabel(r.label);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!time) {
      onError("Pick a time", "Choose when the reminder should go off.");
      return;
    }
    const data = { time, type, label: label.trim() || REMINDER_TYPES[type].label };
    if (editingId) onUpdate(editingId, data);
    else onAdd(data);
    resetForm();
  };

  const remove = (id) => {
    if (id === editingId) resetForm();
    onRemove(id);
  };

  return (
    <section className="card reminders-card">
      <div className="card-head">
        <h2>Reminders</h2>
        <span className="badge">{reminders.filter((r) => r.enabled).length} active</span>
      </div>

      {reminders.length === 0 ? (
        <p className="r-empty">No reminders yet — add a tea break or anything you like below.</p>
      ) : (
        <ul className="r-list">
          {reminders.map((r) => (
            <li
              key={r.id}
              className={`r-item ${r.enabled ? "" : "off"} ${next?.id === r.id ? "next" : ""} ${
                editingId === r.id ? "editing" : ""
              }`}
            >
              <span className={`r-emoji t-${r.type}`}>{REMINDER_TYPES[r.type]?.emoji || "🔔"}</span>
              <div className="r-text">
                <strong>{r.label}</strong>
                <span>
                  {timeLabel(r.time)}
                  {next?.id === r.id && <em className="r-next">Next</em>}
                </span>
              </div>
              <button
                type="button"
                className={`switch ${r.enabled ? "on" : ""}`}
                role="switch"
                aria-checked={r.enabled}
                aria-label={`${r.enabled ? "Turn off" : "Turn on"} ${r.label}`}
                onClick={() => onToggle(r.id)}
              >
                <i />
              </button>
              <button
                type="button"
                className="r-icon-btn r-edit"
                aria-label={`Edit ${r.label}`}
                title="Edit"
                onClick={() => (editingId === r.id ? resetForm() : startEdit(r))}
              >
                <PencilIcon width={15} height={15} />
              </button>
              <button
                type="button"
                className="r-icon-btn r-delete"
                aria-label={`Delete ${r.label}`}
                title="Delete"
                onClick={() => remove(r.id)}
              >
                <TrashIcon width={15} height={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="r-add" onSubmit={submit}>
        {editingId && <p className="r-editing-note">Editing reminder — change it below and press Save.</p>}
        <div className="r-types" role="radiogroup" aria-label="Reminder type">
          {Object.entries(REMINDER_TYPES).map(([key, t]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={type === key}
              className={type === key ? "active" : ""}
              title={t.label}
              onClick={() => setType(key)}
            >
              <span>{t.emoji}</span>
              {t.label.split(" ")[0]}
            </button>
          ))}
        </div>
        <div className={`r-inputs ${editingId ? "editing" : ""}`}>
          <TimePicker value={time} onChange={setTime} placeholder="Time" compact ariaLabel="Reminder time" />
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={REMINDER_TYPES[type].label}
            aria-label="Reminder message"
            className="plain"
            maxLength={60}
          />
          {editingId && (
            <button type="button" className="btn btn-ghost r-add-btn" onClick={resetForm}>
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary r-add-btn"
            aria-label={editingId ? "Save reminder" : "Add reminder"}
          >
            {editingId ? (
              "Save"
            ) : (
              <>
                <PlusIcon width={16} height={16} /> Add
              </>
            )}
          </button>
        </div>
      </form>
      <p className="r-note">Reminders repeat every working day ({workDays}) while this app is open.</p>
    </section>
  );
}
