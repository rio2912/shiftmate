const ICONS = { success: "✓", error: "!", warn: "⏳", info: "i" };

export default function Toasts({ toasts }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="toast-icon">{ICONS[t.type] || ICONS.info}</span>
          <div>
            <b>{t.title}</b>
            <span>{t.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
