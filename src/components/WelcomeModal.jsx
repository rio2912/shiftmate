import { useState } from "react";

/** First-run popup: asks the user's name for the greeting. */
export default function WelcomeModal({ open, onSave }) {
  const [name, setName] = useState("");
  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    if (name.trim()) onSave(name.trim());
  };

  return (
    <div className="overlay">
      <form className="modal welcome-modal" role="dialog" aria-modal="true" aria-labelledby="welcomeTitle" onSubmit={submit}>
        <div className="modal-emoji">👋</div>
        <h2 id="welcomeTitle">Welcome to ShiftMate</h2>
        <p>What should we call you? We'll use it to greet you each day.</p>
        <input
          type="text"
          className="plain welcome-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          maxLength={40}
          autoFocus
        />
        <button type="submit" className="btn btn-primary btn-lg" disabled={!name.trim()}>
          Continue
        </button>
        <small className="welcome-hint">You can change this and your work policy anytime in Settings.</small>
      </form>
    </div>
  );
}
