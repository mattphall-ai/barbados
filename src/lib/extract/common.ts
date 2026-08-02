import { makeId } from "../id";
import type { Confidence, ExtractedItem, ParsedDocument, SourceRef } from "../../types";

export function splitSentences(text: string): string[] {
  if (!text.trim()) return [];
  const withoutHeadingLines = text
    .split(/\r?\n/)
    .filter((line) => !/^\s{0,3}#{1,6}\s+/.test(line)) // markdown headings are captured separately
    .join("\n");
  return withoutHeadingLines
    .replace(/\n+/g, ". ") // treat line/paragraph breaks as sentence boundaries too
    .replace(/\s+/g, " ")
    .replace(/\.{2,}/g, ".")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

function snippet(text: string, max = 160): string {
  const t = text.trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

export function refFrom(doc: ParsedDocument, text: string): SourceRef {
  return { sourceId: doc.sourceId, label: doc.label, snippet: snippet(text) };
}

export function makeItem<T>(args: {
  prefix: string;
  value: T;
  confidence: Confidence;
  sources: SourceRef[];
  aiGenerated?: boolean;
}): ExtractedItem<T> {
  return {
    id: makeId(args.prefix),
    value: args.value,
    confidence: args.confidence,
    status: "pending",
    sources: args.sources,
    aiGenerated: args.aiGenerated ?? false,
    missing: false,
  };
}

/** Builds the explicit "nothing found" placeholder shown when the engine has no evidence. */
export function makeMissingItem<T>(prefix: string, placeholder: T, note: string): ExtractedItem<T> {
  return {
    id: makeId(prefix),
    value: placeholder,
    confidence: "low",
    status: "flagged",
    sources: [],
    aiGenerated: false,
    missing: true,
    note,
  };
}

export function dedupeBy<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item).toLowerCase().trim();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

export function normalizeHex(hex: string): string {
  let h = hex.toLowerCase();
  if (h.length === 4) {
    h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  return h;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex).slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function isNearGrayscale(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min < 18;
}
