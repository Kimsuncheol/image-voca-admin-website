import { JWT } from "google-auth-library";

export type GoogleTranslateSourceLang = "en" | "ko";
export type GoogleTranslateTargetLang = "en" | "ko";

interface GoogleTranslateResponseTranslation {
  translatedText?: string;
}

interface GoogleTranslateResponse {
  translations?: GoogleTranslateResponseTranslation[];
  error?: {
    message?: string;
  };
}

interface TranslateWithGoogleArgs {
  text: string;
  sourceLang: GoogleTranslateSourceLang;
  targetLang: GoogleTranslateTargetLang;
  accessToken?: string;
  fetchImpl?: typeof fetch;
  getAccessToken?: () => Promise<string>;
  projectId?: string;
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getGoogleTranslateProjectId(projectId?: string): string {
  const resolvedProjectId = projectId || process.env.FIREBASE_ADMIN_PROJECT_ID;
  if (!resolvedProjectId) {
    throw new Error("Google Translate is not configured.");
  }

  return resolvedProjectId;
}

function getGoogleTranslateUrl(projectId?: string): string {
  const resolvedProjectId = getGoogleTranslateProjectId(projectId);
  return `https://translation.googleapis.com/v3/projects/${resolvedProjectId}/locations/global:translateText`;
}

async function parseGoogleTranslateError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as GoogleTranslateResponse;
    if (hasText(payload.error?.message)) {
      return payload.error.message.trim();
    }
  } catch {
    // Ignore JSON parsing errors and fall back to the status text.
  }

  return response.statusText || "Google Translate failed.";
}

export async function getFirebaseAdminGoogleAccessToken(): Promise<string> {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Google Translate is not configured.");
  }

  const authClient = new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/cloud-translation"],
  });
  const accessToken = await authClient.authorize();

  if (!hasText(accessToken.access_token)) {
    throw new Error("Google Translate is not configured.");
  }

  return accessToken.access_token;
}

export async function translateWithGoogleTranslate({
  text,
  sourceLang,
  targetLang,
  accessToken,
  fetchImpl = fetch,
  getAccessToken = getFirebaseAdminGoogleAccessToken,
  projectId,
}: TranslateWithGoogleArgs): Promise<string> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error("Text is required for Google Translate.");
  }

  const resolvedAccessToken = accessToken || (await getAccessToken());
  if (!resolvedAccessToken) {
    throw new Error("Google Translate is not configured.");
  }

  const response = await fetchImpl(getGoogleTranslateUrl(projectId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resolvedAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [trimmedText],
      mimeType: "text/plain",
      sourceLanguageCode: sourceLang,
      targetLanguageCode: targetLang,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseGoogleTranslateError(response));
  }

  const payload = (await response.json()) as GoogleTranslateResponse;
  const translatedText = payload.translations?.[0]?.translatedText?.trim();
  if (!translatedText) {
    throw new Error("Google Translate returned an empty translation.");
  }

  return translatedText;
}

export function translateExampleToKoreanWithGoogle(
  example: string,
  options?: Omit<TranslateWithGoogleArgs, "text" | "sourceLang" | "targetLang">,
) {
  return translateWithGoogleTranslate({
    text: example,
    sourceLang: "en",
    targetLang: "ko",
    ...options,
  });
}

export function translateTranslationToEnglishWithGoogle(
  translation: string,
  options?: Omit<TranslateWithGoogleArgs, "text" | "sourceLang" | "targetLang">,
) {
  return translateWithGoogleTranslate({
    text: translation,
    sourceLang: "ko",
    targetLang: "en",
    ...options,
  });
}
