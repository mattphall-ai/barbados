import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { ParsedDocument } from "../../types";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/** Extracts text content from a PDF (brand guideline, campaign deck export, etc). */
export async function parsePdfDocument(
  sourceId: string,
  label: string,
  file: File,
): Promise<ParsedDocument> {
  const warnings: string[] = [];
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const pageTexts: string[] = [];
  const headings: { level: number; text: string }[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const items = content.items as { str: string; height?: number }[];
    const pageText = items.map((i) => i.str).join(" ");
    pageTexts.push(pageText);

    // Heuristic: the largest-height text item on a page is likely its title/heading.
    const withHeight = items.filter((i) => typeof i.height === "number" && i.str.trim());
    if (withHeight.length > 0) {
      const tallest = withHeight.reduce((a, b) => ((b.height ?? 0) > (a.height ?? 0) ? b : a));
      if (tallest.str.trim().length > 2 && tallest.str.trim().length < 120) {
        headings.push({ level: 2, text: tallest.str.trim() });
      }
    }
  }

  if (pdf.numPages === 0) {
    warnings.push("PDF contained no pages.");
  }

  const text = pageTexts.join("\n\n").replace(/\s{2,}/g, " ").trim();
  if (!text) {
    warnings.push(
      "No extractable text found — this PDF may be scanned/image-based and requires OCR.",
    );
  }

  return {
    sourceId,
    label,
    text,
    images: [],
    links: [],
    cssColors: [],
    cssFonts: [],
    headings,
    warnings,
  };
}
