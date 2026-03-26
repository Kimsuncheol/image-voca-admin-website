interface FetchNaverDictPayloadOptions {
  path: "/dict/types" | "/dict/search";
  searchParams?: URLSearchParams;
}

function getNaverDictBaseUrl(): string {
  const baseUrl = process.env.NAVER_DICT_API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("NAVER_DICT_API_BASE_URL is not configured.");
  }

  return baseUrl.replace(/\/+$/, "");
}

function buildNaverDictUrl(
  path: FetchNaverDictPayloadOptions["path"],
  searchParams?: URLSearchParams,
): string {
  const url = new URL(`${getNaverDictBaseUrl()}${path}`);

  if (searchParams) {
    url.search = searchParams.toString();
  }

  return url.toString();
}

export async function fetchNaverDictPayload({
  path,
  searchParams,
}: FetchNaverDictPayloadOptions): Promise<{ status: number; payload: unknown }> {
  const response = await fetch(buildNaverDictUrl(path, searchParams), {
    cache: "no-store",
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Failed to parse Naver Dict response.");
  }

  return {
    status: response.status,
    payload,
  };
}
