"use client";

import { useEffect, useState } from "react";
import { DEFAULT_AI_SETTINGS, type AISettings } from "@/lib/aiSettings";
import { getAISettings } from "@/lib/firebase/settings";

export function useAISettings(): {
  settings: AISettings;
  loading: boolean;
} {
  const [settings, setSettings] = useState<AISettings | null>(null);

  useEffect(() => {
    let active = true;

    getAISettings()
      .then((nextSettings) => {
        if (active) {
          setSettings(nextSettings);
        }
      })
      .catch(() => {
        if (active) {
          setSettings(DEFAULT_AI_SETTINGS);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return {
    settings: settings ?? DEFAULT_AI_SETTINGS,
    loading: settings === null,
  };
}
