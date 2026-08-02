import type {
  ColorValue,
  ComponentValue,
  CreativeSystem,
  LogoValue,
  MasterAssetValue,
  ParsedDocument,
  StyleNoteValue,
  TypographyValue,
} from "../../types";
import { isNearGrayscale, makeItem, makeMissingItem, normalizeHex, refFrom, splitSentences } from "./common";

export function extractLogos(docs: ParsedDocument[]): CreativeSystem["logos"] {
  const found: CreativeSystem["logos"] = [];
  for (const doc of docs) {
    for (const img of doc.images) {
      const looksLikeLogo = /logo/i.test(img.name) || /logo/i.test(doc.label);
      if (!looksLikeLogo) continue;
      found.push(
        makeItem<LogoValue>({
          prefix: "logo",
          value: { name: img.name, dataUrl: img.dataUrl || undefined, usage: img.dataUrl ? undefined : "Image referenced but not retrieved (remote asset)" },
          confidence: img.dataUrl ? "high" : "low",
          sources: [refFrom(doc, img.name)],
        }),
      );
    }
  }
  if (found.length === 0) {
    return [
      makeMissingItem<LogoValue>(
        "logo",
        { name: "" },
        "No image identifiable as a logo (by filename/alt text) was found. Upload a logo file directly for best results.",
      ),
    ];
  }
  return found;
}

export function extractColorPalette(docs: ParsedDocument[]): CreativeSystem["colorPalette"] {
  const freq = new Map<string, { count: number; confidence: "high" | "medium"; doc: ParsedDocument }>();

  for (const doc of docs) {
    for (const hex of doc.cssColors) {
      const norm = normalizeHex(hex);
      const existing = freq.get(norm);
      if (existing) existing.count += 3; // structured CSS colors weigh more than sampled pixels
      else freq.set(norm, { count: 3, confidence: "high", doc });
    }
    for (const img of doc.images) {
      for (const hex of img.dominantColors) {
        const norm = normalizeHex(hex);
        const existing = freq.get(norm);
        if (existing) existing.count += 1;
        else freq.set(norm, { count: 1, confidence: "medium", doc });
      }
    }
  }

  const ranked = Array.from(freq.entries()).sort((a, b) => b[1].count - a[1].count);
  const found: CreativeSystem["colorPalette"] = [];
  let nonNeutralRank = 0;
  for (const [hex, info] of ranked.slice(0, 8)) {
    const neutral = isNearGrayscale(hex);
    let role: string;
    if (neutral) {
      role = "Neutral";
    } else {
      nonNeutralRank += 1;
      role = nonNeutralRank === 1 ? "Primary" : nonNeutralRank === 2 ? "Secondary" : "Accent";
    }
    found.push(
      makeItem<ColorValue>({
        prefix: "color",
        value: { name: role, hex, role },
        confidence: info.confidence,
        sources: [refFrom(info.doc, hex)],
      }),
    );
  }

  if (found.length === 0) {
    return [
      makeMissingItem<ColorValue>(
        "color",
        { name: "", hex: "" },
        "No colors were found in stylesheets/markup, and no images were provided to sample from.",
      ),
    ];
  }
  return found;
}

export function extractTypography(docs: ParsedDocument[]): CreativeSystem["typography"] {
  const seen = new Set<string>();
  const found: CreativeSystem["typography"] = [];
  let rank = 0;
  for (const doc of docs) {
    for (const font of doc.cssFonts) {
      const key = font.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      rank += 1;
      found.push(
        makeItem<TypographyValue>({
          prefix: "type",
          value: { role: rank === 1 ? "Primary typeface" : "Secondary typeface", fontFamily: font },
          confidence: "high",
          sources: [refFrom(doc, font)],
        }),
      );
    }
  }
  if (found.length === 0) {
    return [
      makeMissingItem<TypographyValue>(
        "type",
        { role: "", fontFamily: "" },
        "No font-family declarations were found. Provide a website URL/HTML export or a brand style guide to detect typography.",
      ),
    ];
  }
  return found;
}

function extractStyleNotes(
  docs: ParsedDocument[],
  pattern: RegExp,
  prefix: string,
  missingNote: string,
): CreativeSystem["photographyStyle"] {
  const found: CreativeSystem["photographyStyle"] = [];
  for (const doc of docs) {
    for (const sentence of splitSentences(doc.text)) {
      if (!pattern.test(sentence)) continue;
      found.push(
        makeItem<StyleNoteValue>({
          prefix,
          value: { description: sentence },
          confidence: "medium",
          sources: [refFrom(doc, sentence)],
        }),
      );
    }
  }
  if (found.length === 0) {
    return [makeMissingItem<StyleNoteValue>(prefix, { description: "" }, missingNote)];
  }
  return found;
}

export function extractPhotographyStyle(docs: ParsedDocument[]): CreativeSystem["photographyStyle"] {
  return extractStyleNotes(
    docs,
    /\bphoto(graphy)?\b|\bimagery\b|\billustration(s)?\b/i,
    "photo",
    "No description of photography or illustration style was found in the provided sources — typically found in a brand guideline or style guide, not a live website.",
  );
}

export function extractIconography(docs: ParsedDocument[]): CreativeSystem["iconography"] {
  return extractStyleNotes(
    docs,
    /\bicon(s|ography)?\b/i,
    "icon",
    "No description of iconography style was found in the provided sources.",
  );
}

export function extractLayoutPatterns(docs: ParsedDocument[]): CreativeSystem["layoutPatterns"] {
  return extractStyleNotes(
    docs,
    /\blayout\b|\bgrid system\b|\bwhite ?space\b|\btemplate(s)?\b/i,
    "layout",
    "No description of layout patterns or grid system was found in the provided sources.",
  );
}

const COMPONENT_VOCAB = ["button", "card", "navigation", "nav bar", "menu", "form", "modal", "banner", "carousel"];

export function extractComponents(docs: ParsedDocument[]): CreativeSystem["components"] {
  const found: CreativeSystem["components"] = [];
  for (const doc of docs) {
    for (const term of COMPONENT_VOCAB) {
      const pattern = new RegExp(`\\b${term}s?\\b`, "i");
      const sentences = splitSentences(doc.text);
      const hit = sentences.find((s) => pattern.test(s));
      if (!hit) continue;
      found.push(
        makeItem<ComponentValue>({
          prefix: "comp",
          value: { name: term[0].toUpperCase() + term.slice(1), description: hit },
          confidence: "medium",
          sources: [refFrom(doc, hit)],
        }),
      );
    }
  }
  if (found.length === 0) {
    return [
      makeMissingItem<ComponentValue>(
        "comp",
        { name: "", description: "" },
        "No reusable UI components (buttons, cards, navigation, etc.) were described or detected in the provided sources.",
      ),
    ];
  }
  return found;
}

export function extractMasterAssets(docs: ParsedDocument[]): CreativeSystem["masterAssets"] {
  const found: CreativeSystem["masterAssets"] = [];
  for (const doc of docs) {
    const ext = doc.label.split(".").pop()?.toUpperCase() ?? "SOURCE";
    if (doc.images.length > 0) {
      for (const img of doc.images.filter((i) => i.dataUrl)) {
        found.push(
          makeItem<MasterAssetValue>({
            prefix: "asset",
            value: { name: img.name, type: "Image", dataUrl: img.dataUrl },
            confidence: "high",
            sources: [refFrom(doc, img.name)],
          }),
        );
      }
    } else {
      found.push(
        makeItem<MasterAssetValue>({
          prefix: "asset",
          value: { name: doc.label, type: ext },
          confidence: "high",
          sources: [refFrom(doc, doc.label)],
        }),
      );
    }
  }
  if (found.length === 0) {
    return [
      makeMissingItem<MasterAssetValue>(
        "asset",
        { name: "", type: "" },
        "No source assets were provided.",
      ),
    ];
  }
  return found;
}
