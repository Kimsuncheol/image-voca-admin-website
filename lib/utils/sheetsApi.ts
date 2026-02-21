import { parseRowArrays, type ParseResult } from './csvParser';

/** Extracts spreadsheet ID and optional gid from a Google Sheets URL. */
function extractSheetInfo(url: string): { id: string; gid?: string } | null {
  const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const gidMatch = url.match(/[?&#]gid=(\d+)/);
  return { id: match[1], gid: gidMatch?.[1] };
}

/**
 * Converts a 2-D string array from the Sheets API values response into a ParseResult.
 * Reuses the same header-detection and schema-validation logic as the CSV parser.
 */
export function parseSheetValues(values: string[][], isCollocation?: boolean): ParseResult {
  return parseRowArrays(values, isCollocation);
}

/**
 * Fetches sheet data via the Google Sheets REST API using an OAuth Bearer token.
 * Falls back to Sheet1 when no gid is present.
 */
export async function fetchSheetWithToken(
  url: string,
  token: string,
  isCollocation?: boolean,
): Promise<ParseResult> {
  const info = extractSheetInfo(url);
  if (!info) throw new Error('Invalid Google Sheets URL');

  // Use the Sheets v4 values endpoint. When only an ID is available we read the
  // whole first sheet. gid-based tab lookup would require an extra API call to
  // resolve the tab name, so we default to 'Sheet1' / first visible sheet.
  const range = encodeURIComponent('Sheet1');
  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${info.id}/values/${range}`;

  const resp = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    let message = `HTTP ${resp.status}`;
    try {
      const body = await resp.json();
      message = body?.error?.message ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const data = await resp.json();
  const values: string[][] = data.values ?? [];
  return parseSheetValues(values, isCollocation);
}
