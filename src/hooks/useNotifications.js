import { useCallback, useState } from "react";

const supported = typeof window !== "undefined" && "Notification" in window;

/** Plays a short three-note chime using Web Audio (no sound files needed). */
export function chime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [660, 880, 990].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t0 = ctx.currentTime + i * 0.25;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.start(t0);
      osc.stop(t0 + 0.25);
    });
  } catch {
    /* audio not available */
  }
}

/** Desktop notification permission + sender. */
export default function useNotifications() {
  const [permission, setPermission] = useState(supported ? Notification.permission : "unsupported");

  const request = useCallback(async () => {
    if (!supported) return "unsupported";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const notify = useCallback((title, body) => {
    chime();
    if (supported && Notification.permission === "granted") {
      try {
        const n = new Notification(title, { body, requireInteraction: true, tag: "work-time" });
        n.onclick = () => {
          if (window.workTime) window.workTime.openMain();
          else window.focus();
        };
      } catch {
        /* ignore */
      }
    }
  }, []);

  return { permission, request, notify };
}
