import type { ParsedDocument, Source } from "../../types";
import { parseHtmlDocument } from "./html";
import { fetchUrlDocument, UrlFetchError } from "./url";
import { parseTextDocument } from "./text";
import { parseImageDocument } from "./image";
import { parsePdfDocument } from "./pdf";
import { parseDocxDocument, parsePptxDocument } from "./office";

export { UrlFetchError };

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp)$/i;

/**
 * Parses a Source into a ParsedDocument.
 *
 * For URL sources, throws UrlFetchError if the browser fetch is blocked
 * (typically CORS) — the caller should catch this and prompt for a manual
 * paste of the page's HTML/text via `parsePastedContent`.
 */
export async function parseSource(
  source: Source,
  file?: File,
): Promise<ParsedDocument> {
  if (source.kind === "url") {
    if (!source.url) throw new Error("URL source missing url.");
    return fetchUrlDocument(source.id, source.url);
  }

  if (!file) throw new Error(`No file provided for source "${source.label}".`);
  const name = file.name.toLowerCase();

  if (IMAGE_EXT.test(name) || file.type.startsWith("image/")) {
    return parseImageDocument(source.id, source.label, file);
  }
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return parsePdfDocument(source.id, source.label, file);
  }
  if (name.endsWith(".docx")) {
    return parseDocxDocument(source.id, source.label, file);
  }
  if (name.endsWith(".pptx")) {
    return parsePptxDocument(source.id, source.label, file);
  }
  if (name.endsWith(".html") || name.endsWith(".htm")) {
    const html = await file.text();
    return parseHtmlDocument(source.id, source.label, html);
  }
  // Fall back to plain text (.txt, .md, or unrecognized text-like files).
  const text = await file.text();
  return parseTextDocument(source.id, source.label, text);
}

/** Builds a ParsedDocument from content the user manually pasted (CORS fallback path). */
export function parsePastedContent(
  source: Source,
  content: string,
  looksLikeHtml: boolean,
): ParsedDocument {
  return looksLikeHtml
    ? parseHtmlDocument(source.id, source.label, content)
    : parseTextDocument(source.id, source.label, content);
}

export type { ParsedDocument };
