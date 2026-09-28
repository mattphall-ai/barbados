// Brand theme for the Social Builder, plus the bridge to the Brand
// Foundation Builder: approved colors, logos and copy flow straight in.

import { loadProject } from "../storage/project";
import type { BrandFoundation, ExtractedItem } from "../types";
import type { BrandTheme, FontSpec } from "./types";

export const FONT_STACKS: { value: string; label: string }[] = [
  { value: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif', label: "System sans" },
  { value: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif', label: "Rounded sans" },
  { value: 'ui-serif, Georgia, "Times New Roman", serif', label: "Serif" },
  { value: 'ui-monospace, "SF Mono", Menlo, monospace', label: "Monospace" },
];

export function defaultBrand(): BrandTheme {
  return {
    name: "Brand",
    colors: {
      primary: "#3b2bd9",
      secondary: "#12a4b5",
      accent: "#ff7a3d",
      background: "#0f0e1a",
      text: "#f7f6fb",
    },
    display: { stack: FONT_STACKS[0].value, weight: 800 },
    body: { stack: FONT_STACKS[0].value, weight: 400 },
    cornerRadius: 999,
  };
}

/** CSS font-family value for a font spec (embedded family first, then the stack). */
export function fontFamily(f: FontSpec): string {
  return f.dataUrl && f.family ? `"${f.family}", ${f.stack}` : f.stack;
}

/** @font-face rules for embedded (uploaded) fonts — inlined as data: URIs per the HyperFrames Send-to contract. */
export function fontFaces(brand: BrandTheme): string {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const f of [brand.display, brand.body]) {
    if (!f.dataUrl || !f.family || seen.has(f.dataUrl)) continue;
    seen.add(f.dataUrl);
    const fmt = f.dataUrl.includes("woff2") ? "woff2" : f.dataUrl.includes("woff") ? "woff" : f.dataUrl.includes("otf") || f.dataUrl.includes("opentype") ? "opentype" : "truetype";
    out.push(`@font-face { font-family: "${f.family}"; font-weight: 100 900; font-style: normal; font-display: block; src: url(${f.dataUrl}) format("${fmt}"); }`);
  }
  return out.join("\n");
}

// ---- Brand Foundation bridge ------------------------------------------------

export interface ApprovedCopy {
  claims: string[];
  coreMessages: string[];
  callsToAction: string[];
  isi: string[];
}

function approved<T>(items: ExtractedItem<T>[]): T[] {
  return items.filter((i) => i.status === "approved" && !i.missing).map((i) => i.value);
}

export function loadFoundation(): { name: string; foundation: BrandFoundation } | null {
  const p = loadProject();
  if (!p?.foundation) return null;
  return { name: p.name, foundation: p.foundation };
}

export function approvedCopy(): ApprovedCopy {
  const f = loadFoundation()?.foundation;
  if (!f) return { claims: [], coreMessages: [], callsToAction: [], isi: [] };
  const bk = f.brandKnowledge;
  return {
    claims: approved(bk.claims).map((c) => c.text),
    coreMessages: approved(bk.coreMessages).map((c) => c.text),
    callsToAction: approved(bk.callsToAction).map((c) => c.text),
    isi: approved(bk.safetyContent)
      .filter((s) => s.type === "ISI")
      .map((s) => s.text),
  };
}

const ROLE_HINTS: [keyof BrandTheme["colors"], RegExp][] = [
  ["primary", /primary|brand|main/i],
  ["secondary", /secondary/i],
  ["accent", /accent|highlight|cta/i],
  ["background", /background|bg|neutral|dark/i],
  ["text", /text|body|ink/i],
];

/**
 * Build a theme patch from the approved Brand Design Kit. Returns what was
 * applied so the UI can report it; nothing is guessed when data is missing.
 */
export function themeFromFoundation(base: BrandTheme): { theme: BrandTheme; applied: string[] } | null {
  const loaded = loadFoundation();
  if (!loaded) return null;
  const cs = loaded.foundation.creativeSystem;
  const theme: BrandTheme = structuredClone(base);
  const applied: string[] = [];

  const colors = approved(cs.colorPalette);
  const unassigned = [...colors];
  for (const [role, re] of ROLE_HINTS) {
    const idx = unassigned.findIndex((c) => re.test(`${c.role ?? ""} ${c.name}`));
    if (idx !== -1) {
      theme.colors[role] = unassigned[idx].hex;
      applied.push(`${role} color ← ${unassigned[idx].name}`);
      unassigned.splice(idx, 1);
    }
  }
  // Fill primary/secondary/accent in palette order if roles weren't labeled.
  for (const role of ["primary", "secondary", "accent"] as const) {
    if (!applied.some((a) => a.startsWith(role)) && unassigned.length) {
      const c = unassigned.shift()!;
      theme.colors[role] = c.hex;
      applied.push(`${role} color ← ${c.name}`);
    }
  }

  const logo = approved(cs.logos).find((l) => l.dataUrl);
  if (logo?.dataUrl) {
    theme.logoDataUrl = logo.dataUrl;
    applied.push(`logo ← ${logo.name}`);
  }
  if (loaded.name && !/untitled/i.test(loaded.name)) {
    theme.name = loaded.name;
    applied.push(`name ← ${loaded.name}`);
  }
  const fonts = approved(cs.typography);
  if (fonts.length) applied.push(`typography noted (${fonts.map((f) => f.fontFamily).join(", ")}) — upload the font files to embed them`);
  return { theme, applied };
}
