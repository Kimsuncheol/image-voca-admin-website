import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./config";

export interface AISettings {
  imageModel: "nano-banana2" | "gpt-image-1";
  enrichModel: "gemini" | "chatgpt";
}

const SETTINGS_DOC = doc(db, "settings", "ai");

export async function getAISettings(): Promise<AISettings> {
  const snap = await getDoc(SETTINGS_DOC);
  if (!snap.exists()) {
    return { imageModel: "nano-banana2", enrichModel: "gemini" };
  }
  return snap.data() as AISettings;
}

export async function saveAISettings(settings: AISettings): Promise<void> {
  await setDoc(SETTINGS_DOC, settings);
}
