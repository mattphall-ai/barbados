import type { ParsedDocument, ParsedImage } from "../../types";

const MAX_DIMENSION = 480; // keep stored thumbnails + sampling canvas small

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not decode image "${file.name}".`));
    img.src = URL.createObjectURL(file);
  });
}

function toHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")
  );
}

/** Samples an image's pixels and buckets them into a small set of dominant hex colors. */
function extractDominantColors(ctx: CanvasRenderingContext2D, w: number, h: number): string[] {
  const { data } = ctx.getImageData(0, 0, w, h);
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
  const step = 4 * Math.max(1, Math.floor((w * h) / 20000)); // cap samples for perf

  for (let i = 0; i < data.length; i += step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;
    // Quantize to reduce near-duplicate shades into the same bucket.
    const qr = Math.round(r / 24) * 24;
    const qg = Math.round(g / 24) * 24;
    const qb = Math.round(b / 24) * 24;
    const key = `${qr},${qg},${qb}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      buckets.set(key, { count: 1, r: qr, g: qg, b: qb });
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((b) => toHex(b.r, b.g, b.b));
}

/** Parses an uploaded image (logo, screenshot, asset) via canvas pixel sampling. */
export async function parseImageDocument(
  sourceId: string,
  label: string,
  file: File,
): Promise<ParsedDocument> {
  const warnings: string[] = [];
  const img = await loadImage(file);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  let dominantColors: string[] = [];
  let dataUrl = "";
  if (ctx) {
    ctx.drawImage(img, 0, 0, w, h);
    dominantColors = extractDominantColors(ctx, w, h);
    dataUrl = canvas.toDataURL("image/png");
  } else {
    warnings.push("Canvas 2D context unavailable; could not sample colors.");
  }

  URL.revokeObjectURL(img.src);

  const image: ParsedImage = {
    name: file.name,
    dataUrl,
    width: img.width,
    height: img.height,
    dominantColors,
  };

  return {
    sourceId,
    label,
    text: "",
    images: [image],
    links: [],
    cssColors: [],
    cssFonts: [],
    headings: [],
    warnings,
  };
}
