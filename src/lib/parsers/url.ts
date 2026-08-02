import type { ParsedDocument } from "../../types";
import { parseHtmlDocument } from "./html";

export class UrlFetchError extends Error {}

/**
 * Attempts a direct browser fetch of the given URL. Many sites block
 * cross-origin requests (no CORS headers), so this frequently fails for
 * arbitrary third-party sites — that's a browser security restriction, not
 * a bug. Callers should catch UrlFetchError and offer the user a manual
 * paste-HTML fallback rather than silently fabricating content.
 */
export async function fetchUrlDocument(
  sourceId: string,
  url: string,
): Promise<ParsedDocument> {
  let response: Response;
  try {
    response = await fetch(url, { mode: "cors" });
  } catch {
    throw new UrlFetchError(
      `Could not fetch "${url}" directly from the browser (likely blocked by CORS). ` +
        `Paste the page's HTML or text content instead.`,
    );
  }
  if (!response.ok) {
    throw new UrlFetchError(`Fetching "${url}" returned HTTP ${response.status}.`);
  }
  const html = await response.text();
  return parseHtmlDocument(sourceId, url, html);
}
