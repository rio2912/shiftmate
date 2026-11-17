import { fmt12 } from "../utils/time";

export default function TimeUpModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-emoji">🎉</div>
        <h2>Time's up!</h2>
        <p>
          It's {fmt12(new Date())}. Your work day is complete — have a great evening!
        </p>
        <button type="button" className="btn btn-primary btn-lg" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
