import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import type { AISettings } from "@/lib/firebase/settings";

const DEFAULT_SETTINGS: AISettings = {
  imageModel: "nano-banana2",
  enrichModel: "gemini",
};

export async function getServerAISettings(): Promise<AISettings> {
  try {
    const snap = await adminDb.doc("settings/ai").get();
    if (!snap.exists) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<AISettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
