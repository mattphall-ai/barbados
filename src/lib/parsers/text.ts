import type { ParsedDocument } from "../../types";

/** Parses a plain-text or markdown file into a ParsedDocument. */
export function parseTextDocument(
  sourceId: string,
  label: string,
  text: string,
): ParsedDocument {
  const warnings: string[] = [];
  const headings = text
    .split(/\r?\n/)
    .map((line) => {
      const md = /^(#{1,4})\s+(.*)$/.exec(line);
      if (md) return { level: md[1].length, text: md[2].trim() };
      return null;
    })
    .filter((h): h is { level: number; text: string } => h !== null);

  const links = Array.from(
    text.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g),
  ).map((m) => ({ text: m[1], href: m[2] }));

  if (headings.length === 0) warnings.push("No markdown headings detected.");

  return {
    sourceId,
    label,
    text,
    images: [],
    links,
    cssColors: [],
    cssFonts: [],
    headings,
    warnings,
  };
}
