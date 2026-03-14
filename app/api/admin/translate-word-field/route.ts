import { getServerAISettings } from "@/lib/server/aiSettings";
import {
  translateExampleToKorean,
  translateTranslationToEnglish,
} from "@/lib/server/deepl";
import {
  translateExampleToKoreanWithGoogle,
  translateTranslationToEnglishWithGoogle,
} from "@/lib/server/googleTranslate";
import { verifySessionUser } from "@/lib/server/sessionUser";

import { createTranslateWordFieldHandler } from "./translateWordField";

export const POST = createTranslateWordFieldHandler({
  getServerAISettings,
  translateExampleToKoreanWithDeepL: translateExampleToKorean,
  translateTranslationToEnglishWithDeepL: translateTranslationToEnglish,
  translateExampleToKoreanWithGoogle,
  translateTranslationToEnglishWithGoogle,
  verifySessionUser,
});
