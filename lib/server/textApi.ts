const TEXT_API_BASE_URL =
  "https://parenthesesgenerationremoval.onrender.com";

export function buildTextApiUrl(path: `/text/${string}`): string {
  return `${TEXT_API_BASE_URL}${path}`;
}
