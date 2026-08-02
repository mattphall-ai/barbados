import JSZip from "jszip";
import type { ParsedDocument } from "../../types";

async function readXml(zip: JSZip, path: string): Promise<Document | null> {
  const entry = zip.file(path);
  if (!entry) return null;
  const xml = await entry.async("text");
  return new DOMParser().parseFromString(xml, "application/xml");
}

/** Extracts text (and heading-style paragraphs) from a Word .docx file. */
export async function parseDocxDocument(
  sourceId: string,
  label: string,
  file: File,
): Promise<ParsedDocument> {
  const warnings: string[] = [];
  const zip = await JSZip.loadAsync(file);
  const doc = await readXml(zip, "word/document.xml");

  if (!doc) {
    return {
      sourceId,
      label,
      text: "",
      images: [],
      links: [],
      cssColors: [],
      cssFonts: [],
      headings: [],
      warnings: ["Could not find word/document.xml — file may not be a valid .docx."],
    };
  }

  const paragraphs = Array.from(doc.getElementsByTagName("w:p"));
  const lines: string[] = [];
  const headings: { level: number; text: string }[] = [];

  for (const p of paragraphs) {
    const runs = Array.from(p.getElementsByTagName("w:t"));
    const paraText = runs.map((r) => r.textContent ?? "").join("").trim();
    if (!paraText) continue;
    lines.push(paraText);

    const styleEl = p.getElementsByTagName("w:pStyle")[0];
    const styleVal = styleEl?.getAttribute("w:val") ?? "";
    const headingMatch = /Heading(\d)/i.exec(styleVal);
    if (headingMatch) {
      headings.push({ level: Number(headingMatch[1]), text: paraText });
    } else if (/title/i.test(styleVal)) {
      headings.push({ level: 1, text: paraText });
    }
  }

  if (lines.length === 0) warnings.push("No text runs found in document body.");

  return {
    sourceId,
    label,
    text: lines.join("\n"),
    images: [],
    links: [],
    cssColors: [],
    cssFonts: [],
    headings,
    warnings,
  };
}

/** Extracts text per-slide (with the first line of each slide treated as its title) from a .pptx file. */
export async function parsePptxDocument(
  sourceId: string,
  label: string,
  file: File,
): Promise<ParsedDocument> {
  const warnings: string[] = [];
  const zip = await JSZip.loadAsync(file);

  const slidePaths = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => {
      const na = Number(/slide(\d+)\.xml/.exec(a)?.[1] ?? 0);
      const nb = Number(/slide(\d+)\.xml/.exec(b)?.[1] ?? 0);
      return na - nb;
    });

  if (slidePaths.length === 0) {
    return {
      sourceId,
      label,
      text: "",
      images: [],
      links: [],
      cssColors: [],
      cssFonts: [],
      headings: [],
      warnings: ["No slides found — file may not be a valid .pptx."],
    };
  }

  const lines: string[] = [];
  const headings: { level: number; text: string }[] = [];

  for (const path of slidePaths) {
    const doc = await readXml(zip, path);
    if (!doc) continue;
    const textNodes = Array.from(doc.getElementsByTagName("a:t"));
    const slideLines = textNodes.map((n) => n.textContent ?? "").filter((t) => t.trim());
    if (slideLines.length === 0) continue;
    lines.push(...slideLines);
    headings.push({ level: 2, text: slideLines[0].trim() });
  }

  if (lines.length === 0) {
    warnings.push("Slides contained no readable text (may be image-only slides).");
  }

  return {
    sourceId,
    label,
    text: lines.join("\n"),
    images: [],
    links: [],
    cssColors: [],
    cssFonts: [],
    headings,
    warnings,
  };
}
