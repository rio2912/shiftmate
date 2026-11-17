import { useCallback, useEffect, useState } from "react";
import { COMPACT_SIZE } from "../components/MiniWidget.jsx";

/**
 * Opens a small always-on-top window (Document Picture-in-Picture).
 * It floats above every other app, so the countdown is visible on all screens.
 * Supported in Chrome and Edge 116+.
 */
export default function usePip(theme) {
  const supported = typeof window !== "undefined" && "documentPictureInPicture" in window;
  const [pipWindow, setPipWindow] = useState(null);

  const open = useCallback(async () => {
    if (!supported) return false;
    if (pipWindow) {
      pipWindow.focus();
      return true;
    }
    const win = await window.documentPictureInPicture.requestWindow(COMPACT_SIZE);

    // Copy the app's styles into the floating window
    for (const sheet of document.styleSheets) {
      try {
        const css = [...sheet.cssRules].map((r) => r.cssText).join("\n");
        const style = win.document.createElement("style");
        style.textContent = css;
        win.document.head.appendChild(style);
      } catch {
        if (sheet.href) {
          const link = win.document.createElement("link");
          link.rel = "stylesheet";
          link.href = sheet.href;
          win.document.head.appendChild(link);
        }
      }
    }
    win.document.title = "ShiftMate";
    win.document.body.className = "pip-body";
    win.addEventListener("pagehide", () => setPipWindow(null));
    setPipWindow(win);
    return true;
  }, [supported, pipWindow]);

  const close = useCallback(() => pipWindow?.close(), [pipWindow]);

  // Resize the floating window (inner size); must be called from a click inside it
  const resize = useCallback(
    ({ width, height }) => {
      if (!pipWindow) return;
      const dw = pipWindow.outerWidth - pipWindow.innerWidth;
      const dh = pipWindow.outerHeight - pipWindow.innerHeight;
      try {
        pipWindow.resizeTo(width + dw, height + dh);
      } catch {
        /* resizing not allowed */
      }
    },
    [pipWindow]
  );

  // Keep the floating window's theme in sync
  useEffect(() => {
    if (pipWindow) pipWindow.document.documentElement.dataset.theme = theme;
  }, [pipWindow, theme]);

  return { supported, pipWindow, open, close, resize };
}
