"use client";

import { useMemo } from "react";

import { useAuth } from "@/context/AuthContext";
import { getEffectiveAdminPermissions } from "@/lib/adminPermissions";
import { useAISettings } from "@/lib/hooks/useAISettings";

export function useAdminPermissions() {
  const { user, loading } = useAuth();

  const permissions = useMemo(
    () => getEffectiveAdminPermissions(user),
    [user],
  );

  return {
    user,
    permissions,
    loading,
  };
}

export function useAdminAIAccess() {
  const { user, loading: authLoading } = useAuth();
  const { settings, loading: aiSettingsLoading } = useAISettings();
  const permissions = useMemo(
    () => getEffectiveAdminPermissions(user),
    [user],
  );

  const canUseImageGeneration =
    settings.imageGenerationEnabled && permissions.imageGeneration;
  const canUseExampleTranslationGeneration =
    settings.enrichGenerationEnabled &&
    permissions.exampleTranslationGeneration;

  return {
    user,
    permissions,
    settings,
    loading: authLoading || aiSettingsLoading,
    canUseImageGeneration,
    canUseExampleTranslationGeneration,
    imageGenerationBlockedBySettings: !settings.imageGenerationEnabled,
    imageGenerationBlockedByPermissions:
      settings.imageGenerationEnabled && !permissions.imageGeneration,
    exampleTranslationBlockedBySettings: !settings.enrichGenerationEnabled,
    exampleTranslationBlockedByPermissions:
      settings.enrichGenerationEnabled &&
      !permissions.exampleTranslationGeneration,
  };
}
