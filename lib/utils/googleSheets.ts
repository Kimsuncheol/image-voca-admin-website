export function convertToExportUrl(url: string): string | null {
  // Handle various Google Sheets URL formats
  const patterns = [
    /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const sheetId = match[1];
      return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    }
  }

  return null;
}

export async function fetchSheetAsCsv(url: string): Promise<string> {
  const exportUrl = convertToExportUrl(url);
  if (!exportUrl) {
    throw new Error('Invalid Google Sheets URL');
  }

  const response = await fetch(exportUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.statusText}`);
  }

  return response.text();
}
