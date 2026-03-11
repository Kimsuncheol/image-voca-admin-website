import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { normalizeAISettings, type AISettings } from "@/lib/aiSettings";

export async function getServerAISettings(): Promise<AISettings> {
  try {
    const snap = await adminDb.doc("settings/ai").get();
    if (!snap.exists) return normalizeAISettings();
    return normalizeAISettings(snap.data() as Partial<AISettings>);
  } catch {
    return normalizeAISettings();
  }
}
