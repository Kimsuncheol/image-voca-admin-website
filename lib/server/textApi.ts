// const TEXT_API_BASE_URL = "http://127.0.0.1:8000"
const TEXT_API_BASE_URL = process.env.TEXT_API_BASE_URL

export function buildTextApiUrl(path: `/text/${string}`): string {
  return `${TEXT_API_BASE_URL}${path}`;
}

export function buildTextApiRootUrl(path: "/analyze"): string {
  return `${TEXT_API_BASE_URL}${path}`;
}

export function buildVocabApiUrl(path: `/v1/${string}`): string {
  return `${TEXT_API_BASE_URL}${path}`;
}
