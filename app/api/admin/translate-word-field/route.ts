import { getServerAISettings } from "@/lib/server/aiSettings";
import {
  translateEnglishToJapaneseBatch,
  translateEnglishToJapanese,
  translateExampleToKorean,
  translateKoreanToJapaneseBatch,
  translateKoreanToJapanese,
  translateTranslationToEnglish,
} from "@/lib/server/deepl";
import { verifySessionUser } from "@/lib/server/sessionUser";

import { createTranslateWordFieldHandler } from "./translateWordField";

export const POST = createTranslateWordFieldHandler({
  getServerAISettings,
  translateExampleToKoreanWithDeepL: translateExampleToKorean,
  translateTranslationToEnglishWithDeepL: translateTranslationToEnglish,
  translateKoreanToJapaneseWithDeepL: translateKoreanToJapanese,
  translateEnglishToJapaneseWithDeepL: translateEnglishToJapanese,
  translateKoreanToJapaneseBatchWithDeepL: translateKoreanToJapaneseBatch,
  translateEnglishToJapaneseBatchWithDeepL: translateEnglishToJapaneseBatch,
  verifySessionUser,
});
