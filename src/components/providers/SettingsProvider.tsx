'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, type SettingsPatch, type UserSettings } from '@/lib/settings';
import { applyTheme } from '@/lib/theme';
import { updateSettings } from '@/server/actions/settings.actions';

interface SettingsContextValue {
  settings: UserSettings;
  /** Ändert sofort in der Oberfläche und speichert im Hintergrund (UI-Plan 7.5.6: kein Speichern-Knopf) */
  update: (patch: SettingsPatch) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  update: () => {},
});

export function SettingsProvider({
  initial,
  children,
}: {
  initial: UserSettings;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState(initial);

  // Das Cookie ist nur ein Zwischenspeicher pro Browser; maßgeblich ist die gespeicherte Einstellung
  useEffect(() => {
    if (!document.documentElement.classList.contains(initial.theme)) applyTheme(initial.theme);
  }, [initial.theme]);

  const update = useCallback((patch: SettingsPatch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    if (patch.theme) applyTheme(patch.theme);
    void updateSettings(patch);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

/** Sprache für Kartennamen, getrennt von der Oberflächensprache */
export function useCardLanguage() {
  return useContext(SettingsContext).settings.cardLanguage;
}
