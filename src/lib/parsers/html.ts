import type { ParsedDocument } from "../../types";

const HEX_COLOR_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
const FONT_FAMILY_RE = /font-family\s*:\s*([^;"'}]+)/gi;

function uniq(values: string[]): string[] {
  return Array.from(new Set(values));
}

function cleanFontFamily(raw: string): string[] {
  return raw
    .split(",")
    .map((f) => f.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean)
    .filter(
      (f) =>
        ![
          "inherit",
          "initial",
          "sans-serif",
          "serif",
          "monospace",
          "system-ui",
          "-apple-system",
        ].includes(f.toLowerCase()),
    );
}

/** Parses raw HTML (from a fetched URL or an uploaded .html/.htm file) into a ParsedDocument. */
export function parseHtmlDocument(
  sourceId: string,
  label: string,
  html: string,
): ParsedDocument {
  const warnings: string[] = [];
  const doc = new DOMParser().parseFromString(html, "text/html");

  doc.querySelectorAll("script, noscript").forEach((el) => el.remove());

  const text = (doc.body?.textContent ?? "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const headings = Array.from(
    doc.querySelectorAll("h1, h2, h3, h4"),
  ).map((el) => ({
    level: Number(el.tagName[1]),
    text: (el.textContent ?? "").trim(),
  })).filter((h) => h.text.length > 0);

  const links = Array.from(doc.querySelectorAll("a[href]"))
    .map((el) => ({
      text: (el.textContent ?? "").trim(),
      href: el.getAttribute("href") ?? "",
    }))
    .filter((l) => l.text.length > 0);

  const buttonLikeTexts = Array.from(
    doc.querySelectorAll("button, [role=button], input[type=submit]"),
  )
    .map((el) => (el.textContent ?? (el as HTMLInputElement).value ?? "").trim())
    .filter(Boolean);
  for (const t of buttonLikeTexts) {
    links.push({ text: t, href: "" });
  }

  const images = Array.from(doc.querySelectorAll("img")).map((el) => ({
    name: el.getAttribute("alt") || el.getAttribute("src") || "image",
    dataUrl: "",
    width: 0,
    height: 0,
    dominantColors: [] as string[],
  }));
  if (images.length === 0) {
    warnings.push("No <img> elements found in markup.");
  }

  const styleBlocks = Array.from(doc.querySelectorAll("style"))
    .map((s) => s.textContent ?? "")
    .join("\n");
  const inlineStyles = Array.from(doc.querySelectorAll("[style]"))
    .map((el) => el.getAttribute("style") ?? "")
    .join("\n");
  const cssSource = `${styleBlocks}\n${inlineStyles}`;

  const cssColors = uniq(
    (cssSource.match(HEX_COLOR_RE) ?? []).map((c) => c.toLowerCase()),
  ).slice(0, 40);

  const cssFonts = uniq(
    Array.from(cssSource.matchAll(FONT_FAMILY_RE)).flatMap((m) =>
      cleanFontFamily(m[1]),
    ),
  ).slice(0, 20);

  if (cssColors.length === 0) {
    warnings.push("No hex colors found in inline styles or <style> blocks.");
  }
  if (cssFonts.length === 0) {
    warnings.push("No font-family declarations found in markup.");
  }

  return {
    sourceId,
    label,
    text,
    html,
    images,
    links,
    cssColors,
    cssFonts,
    headings,
    warnings,
  };
}
