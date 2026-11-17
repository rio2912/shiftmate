import { useCallback, useEffect, useState } from "react";
import { SETTINGS_KEY, normalizeSettings, readSettings, writeSettings } from "../utils/settings.js";

/** Company policy + profile, saved locally and kept in sync across windows. */
export default function useSettings() {
  const [settings, setSettings] = useState(readSettings);

  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key || e.key === SETTINGS_KEY) setSettings(readSettings());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const save = useCallback((next) => {
    setSettings((prev) => {
      const s = normalizeSettings(typeof next === "function" ? next(prev) : next);
      writeSettings(s);
      return s;
    });
  }, []);

  return [settings, save];
}
