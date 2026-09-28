// The component library: every building block a frame layout can place.
//
// Each component renders to plain HTML/CSS plus GSAP timeline code that
// follows the HyperFrames composition contract: animations are added to the
// shared paused `tl` at absolute times, never target the `.clip` scene
// element itself, never use clocks/random/infinite repeats, and always finish
// inside the containing clip's time window.

import type {
  BrandColorRole,
  BrandTheme,
  Box,
  ComponentCategory,
  FieldDef,
  Placement,
  PropValues,
  SocialFormat,
} from "./types";

export interface VariableDecl {
  id: string;
  type: "string" | "color" | "number" | "boolean";
  label: string;
  default: string | number | boolean;
}

export interface RenderCtx {
  /** Unique DOM id for the layer (safe to use as a CSS id selector). */
  id: string;
  /** Human label prefix for variables, e.g. "Frame 1 · Headline". */
  label: string;
  props: PropValues;
  box: Box;
  format: SocialFormat;
  /** Type scale — sizes are authored for a 1080px short edge. */
  s: number;
  /** Absolute start/duration (seconds) of the clip that contains this layer. */
  start: number;
  duration: number;
  brand: BrandTheme;
  /** Registers a HyperFrames variable; returns the attribute to bind it. */
  bindText: (key: string, label: string, value: string) => string;
  bindSrc: (key: string, label: string, value: string) => string;
}

export interface RenderOut {
  html: string;
  /** Markup that must sit at the composition root (timed <video>). */
  rootHtml?: string;
  js?: string;
  /** Extra inline style for the layer wrapper. */
  wrapperStyle?: string;
}

export interface ComponentDef {
  type: string;
  name: string;
  icon: string;
  category: ComponentCategory;
  description: string;
  fields: FieldDef[];
  /** Placement used when the component is added outside of a layout slot. */
  defaultPlacement: Placement;
  render: (ctx: RenderCtx) => RenderOut;
}

// ---- helpers ---------------------------------------------------------------

export function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function colorVar(role: string): string {
  if (role === "white") return "#ffffff";
  if (role === "black") return "#000000";
  return `var(--brand_${role})`;
}

const COLOR_OPTIONS: { value: BrandColorRole; label: string }[] = [
  { value: "text", label: "Brand text" },
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "accent", label: "Accent" },
  { value: "background", label: "Background" },
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
];

function colorField(key: string, label: string, def: BrandColorRole): FieldDef {
  return { key, label, type: "brandColor", default: def, options: COLOR_OPTIONS };
}

const ALIGN_FIELD: FieldDef = {
  key: "align",
  label: "Align",
  type: "select",
  default: "left",
  options: [
    { value: "left", label: "Left" },
    { value: "center", label: "Center" },
    { value: "right", label: "Right" },
  ],
};

const VALIGN_FIELD: FieldDef = {
  key: "valign",
  label: "Vertical position",
  type: "select",
  default: "center",
  options: [
    { value: "top", label: "Top" },
    { value: "center", label: "Middle" },
    { value: "bottom", label: "Bottom" },
  ],
};

export const ENTRANCES = [
  { value: "rise", label: "Rise" },
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide in" },
  { value: "scale", label: "Pop" },
  { value: "wipe", label: "Wipe" },
  { value: "none", label: "None (cut)" },
];

function animFields(def: string, delay: number): FieldDef[] {
  return [
    { key: "entrance", label: "Entrance", type: "select", default: def, options: ENTRANCES },
    { key: "delay", label: "Delay (s)", type: "number", default: delay, min: 0, max: 10, step: 0.1 },
  ];
}

const JUSTIFY: Record<string, string> = { top: "flex-start", center: "center", bottom: "flex-end" };

function str(p: PropValues, k: string): string {
  const v = p[k];
  return v === undefined || v === null ? "" : String(v);
}
function num(p: PropValues, k: string, fallback = 0): number {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : fallback;
}
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Time (absolute) an entrance should start, clamped inside the clip. */
function at(ctx: RenderCtx, extra = 0): number {
  const t = ctx.start + 0.15 + num(ctx.props, "delay") + extra;
  return r2(Math.min(t, ctx.start + Math.max(0, ctx.duration - 0.8)));
}

/** GSAP code for a standard entrance on a selector. */
export function entranceJs(sel: string, kind: string, t: number, s: number): string {
  // fromTo (not from) so both endpoints are explicit and re-seeking is stable,
  // which HyperFrames recommends inside sub-compositions.
  const q = JSON.stringify(sel);
  switch (kind) {
    case "fade":
      return `tl.fromTo(${q}, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power2.out" }, ${t});`;
    case "slide":
      return `tl.fromTo(${q}, { x: ${Math.round(-80 * s)}, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, ease: "power4.out" }, ${t});`;
    case "scale":
      return `tl.fromTo(${q}, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.6)" }, ${t});`;
    case "wipe":
      return `tl.fromTo(${q}, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: "expo.out" }, ${t});`;
    case "rise":
      return `tl.fromTo(${q}, { y: ${Math.round(48 * s)}, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" }, ${t});`;
    default:
      return "";
  }
}

/** Finite yoyo loop that ends inside the clip window. */
function loopJs(sel: string, vars: string, t: number, ctx: RenderCtx, cycle: number): string {
  const avail = ctx.start + ctx.duration - 0.1 - t;
  const repeat = Math.floor(avail / cycle) - 1;
  if (repeat < 1) return "";
  return `tl.to(${JSON.stringify(sel)}, { ${vars}, duration: ${cycle}, ease: "sine.inOut", yoyo: true, repeat: ${repeat} }, ${r2(t)});`;
}

function textStyle(ctx: RenderCtx, size: number, colorKey: string, weight: number, font: "display" | "body", alpha = 100): string {
  const c = colorVar(str(ctx.props, colorKey));
  return [
    `font-family: var(--font_${font})`,
    `font-size: ${Math.round(size * ctx.s)}px`,
    `font-weight: ${weight}`,
    `color: ${alpha < 100 ? `color-mix(in srgb, ${c} ${alpha}%, transparent)` : c}`,
  ].join("; ");
}

function flexCol(valign: string, align: string): string {
  const alignItems = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
  return `display: flex; flex-direction: column; justify-content: ${JUSTIFY[valign] ?? "center"}; align-items: ${alignItems}; text-align: ${align};`;
}

// ---- component definitions --------------------------------------------------

const FULL_FRAME: Placement = { ref: "frame", rect: { x: 0, y: 0, w: 100, h: 100 } };

export const COMPONENTS: ComponentDef[] = [
  {
    type: "background-image",
    name: "Background Image",
    icon: "🖼️",
    category: "Background",
    description: "Full-bleed photo or artwork behind the frame, with an optional slow Ken Burns push for mid-scene motion.",
    defaultPlacement: FULL_FRAME,
    fields: [
      { key: "image", label: "Image", type: "image", default: "", variable: true },
      {
        key: "fit",
        label: "Fit",
        type: "select",
        default: "cover",
        options: [
          { value: "cover", label: "Fill (crop)" },
          { value: "contain", label: "Fit (letterbox)" },
        ],
      },
      {
        key: "focus",
        label: "Focal point",
        type: "select",
        default: "center",
        options: [
          { value: "center", label: "Center" },
          { value: "top", label: "Top" },
          { value: "bottom", label: "Bottom" },
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
        ],
      },
      {
        key: "motion",
        label: "Motion",
        type: "select",
        default: "push-in",
        options: [
          { value: "push-in", label: "Slow push in" },
          { value: "pull-out", label: "Slow pull out" },
          { value: "pan", label: "Gentle pan" },
          { value: "none", label: "Still" },
        ],
      },
      colorField("fallback", "Fallback color (no image)", "primary"),
    ],
    render(ctx) {
      const src = str(ctx.props, "image");
      const img = `${ctx.id}-img`;
      const inner = src
        ? `<img id="${img}" alt="" ${ctx.bindSrc("image", "Background image", src)} src="${esc(src)}" style="display: block; width: 100%; height: 100%; object-fit: ${str(ctx.props, "fit") || "cover"}; object-position: ${str(ctx.props, "focus") || "center"};" />`
        : `<div id="${img}" style="width: 100%; height: 100%; background: linear-gradient(160deg, ${colorVar(str(ctx.props, "fallback"))}, var(--brand_secondary));"></div>`;
      const end = r2(ctx.duration - 0.05);
      const motion = str(ctx.props, "motion");
      const q = JSON.stringify(`#${img}`);
      let js = "";
      if (motion === "push-in") js = `tl.fromTo(${q}, { scale: 1 }, { scale: 1.08, duration: ${end}, ease: "none" }, ${ctx.start});`;
      if (motion === "pull-out") js = `tl.fromTo(${q}, { scale: 1.1 }, { scale: 1, duration: ${end}, ease: "none" }, ${ctx.start});`;
      if (motion === "pan")
        js = `tl.fromTo(${q}, { scale: 1.08, xPercent: -2 }, { scale: 1.08, xPercent: 2, duration: ${end}, ease: "none" }, ${ctx.start});`;
      return { html: inner, js, wrapperStyle: "overflow: hidden;" };
    },
  },
  {
    type: "background-video",
    name: "Background Video",
    icon: "🎞️",
    category: "Background",
    description: "Muted full-bleed video plate. Use a publicly reachable MP4 URL (or a small upload) so HyperFrames can fetch it at render time.",
    defaultPlacement: FULL_FRAME,
    fields: [
      { key: "src", label: "Video URL or file", type: "video", default: "" },
      { key: "mediaStart", label: "Start at (s into clip)", type: "number", default: 0, min: 0, step: 0.1 },
      colorField("fallback", "Fallback color (no video)", "background"),
    ],
    render(ctx) {
      const src = str(ctx.props, "src");
      if (!src) {
        return { html: `<div style="width: 100%; height: 100%; background: ${colorVar(str(ctx.props, "fallback"))};"></div>` };
      }
      // A timed <video> may not sit inside another timed element, so it is
      // emitted at the composition root with the frame's own time window.
      const b = ctx.box;
      return {
        html: "",
        rootHtml: `<video id="${ctx.id}-video" class="clip" src="${esc(src)}" data-start="${ctx.start}" data-duration="${ctx.duration}" data-media-start="${num(ctx.props, "mediaStart")}" data-track-index="3" muted playsinline style="position: absolute; left: ${b.x}px; top: ${b.y}px; width: ${b.w}px; height: ${b.h}px; object-fit: cover; z-index: 0;"></video>`,
      };
    },
  },
  {
    type: "background-color",
    name: "Background Color",
    icon: "🎨",
    category: "Background",
    description: "Solid, linear or radial brand-color field. The default canvas when there's no imagery.",
    defaultPlacement: FULL_FRAME,
    fields: [
      {
        key: "style",
        label: "Style",
        type: "select",
        default: "solid",
        options: [
          { value: "solid", label: "Solid" },
          { value: "linear", label: "Linear gradient" },
          { value: "radial", label: "Radial glow" },
        ],
      },
      colorField("color", "Color", "background"),
      colorField("color2", "Second color", "primary"),
    ],
    render(ctx) {
      const c1 = colorVar(str(ctx.props, "color"));
      const c2 = colorVar(str(ctx.props, "color2"));
      const style = str(ctx.props, "style");
      const bg =
        style === "linear"
          ? `linear-gradient(165deg, ${c1} 0%, ${c2} 100%)`
          : style === "radial"
            ? `radial-gradient(circle at 70% 30%, ${c2} 0%, ${c1} 65%)`
            : c1;
      const glow = `${ctx.id}-bg`;
      const js =
        style === "radial"
          ? `tl.fromTo("#${glow}", { backgroundPosition: "0% 0%" }, { backgroundPosition: "0% 8%", duration: ${r2(ctx.duration - 0.05)}, ease: "sine.inOut" }, ${ctx.start});`
          : "";
      return { html: `<div id="${glow}" style="width: 100%; height: 100%; background: ${bg}; background-size: 100% 120%;"></div>`, js };
    },
  },
  {
    type: "scrim",
    name: "Legibility Scrim",
    icon: "🌫️",
    category: "Background",
    description: "Gradient shade over imagery so text on top passes contrast. Place it between the background and text layers.",
    defaultPlacement: FULL_FRAME,
    fields: [
      {
        key: "direction",
        label: "Shade from",
        type: "select",
        default: "bottom",
        options: [
          { value: "bottom", label: "Bottom" },
          { value: "top", label: "Top" },
          { value: "full", label: "Whole frame" },
        ],
      },
      { key: "strength", label: "Strength (%)", type: "number", default: 70, min: 0, max: 100, step: 5 },
      colorField("color", "Shade color", "black"),
    ],
    render(ctx) {
      const a = Math.max(0, Math.min(100, num(ctx.props, "strength", 70)));
      const c = colorVar(str(ctx.props, "color"));
      const shade = `color-mix(in srgb, ${c} ${a}%, transparent)`;
      const dir = str(ctx.props, "direction");
      const bg =
        dir === "full"
          ? shade
          : `linear-gradient(to ${dir === "top" ? "bottom" : "top"}, ${shade} 0%, color-mix(in srgb, ${c} ${Math.round(a * 0.4)}%, transparent) 45%, transparent 75%)`;
      return { html: `<div style="width: 100%; height: 100%; background: ${bg};"></div>` };
    },
  },
  {
    type: "headline-subhead",
    name: "Headline + Subhead",
    icon: "🅷",
    category: "Text",
    description: "The primary message block: optional eyebrow, a display headline and a supporting subhead, animated in sequence.",
    defaultPlacement: { ref: "safe", rect: { x: 0, y: 10, w: 100, h: 35 } },
    fields: [
      { key: "eyebrow", label: "Eyebrow (optional)", type: "text", default: "", variable: true },
      { key: "headline", label: "Headline", type: "textarea", default: "Your headline goes here", variable: true, copySource: "coreMessages" },
      { key: "subhead", label: "Subhead", type: "textarea", default: "A supporting line that adds the proof point.", variable: true, copySource: "claims" },
      { key: "headlineSize", label: "Headline size", type: "number", default: 96, min: 24, max: 240, step: 2 },
      { key: "subheadSize", label: "Subhead size", type: "number", default: 42, min: 16, max: 120, step: 2 },
      { key: "weight", label: "Headline weight", type: "number", default: 800, min: 300, max: 900, step: 100 },
      colorField("color", "Headline color", "text"),
      colorField("subColor", "Subhead color", "text"),
      colorField("eyebrowColor", "Eyebrow color", "accent"),
      ALIGN_FIELD,
      VALIGN_FIELD,
      ...animFields("rise", 0),
    ],
    render(ctx) {
      const p = ctx.props;
      const parts: string[] = [];
      const eyebrow = str(p, "eyebrow");
      if (eyebrow)
        parts.push(
          `<div id="${ctx.id}-eyebrow" ${ctx.bindText("eyebrow", "Eyebrow", eyebrow)} style="${textStyle(ctx, num(p, "subheadSize", 42) * 0.62, "eyebrowColor", 700, "body")}; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: ${Math.round(18 * ctx.s)}px;">${esc(eyebrow)}</div>`,
        );
      const headline = str(p, "headline");
      parts.push(
        `<h1 id="${ctx.id}-headline" ${ctx.bindText("headline", "Headline", headline)} style="margin: 0; ${textStyle(ctx, num(p, "headlineSize", 96), "color", num(p, "weight", 800), "display")}; line-height: 1.04; letter-spacing: -0.02em; white-space: pre-line;">${esc(headline)}</h1>`,
      );
      const sub = str(p, "subhead");
      if (sub)
        parts.push(
          `<p id="${ctx.id}-subhead" ${ctx.bindText("subhead", "Subhead", sub)} style="margin: ${Math.round(24 * ctx.s)}px 0 0; ${textStyle(ctx, num(p, "subheadSize", 42), "subColor", 400, "body", 92)}; line-height: 1.3; white-space: pre-line;">${esc(sub)}</p>`,
        );
      const kind = str(p, "entrance");
      const js = [
        eyebrow ? entranceJs(`#${ctx.id}-eyebrow`, kind === "none" ? "none" : "fade", at(ctx), ctx.s) : "",
        entranceJs(`#${ctx.id}-headline`, kind, at(ctx, eyebrow ? 0.15 : 0), ctx.s),
        sub ? entranceJs(`#${ctx.id}-subhead`, kind === "wipe" ? "rise" : kind, at(ctx, 0.35), ctx.s) : "",
      ].join("\n");
      return { html: `<div data-fit style="width: 100%; height: 100%; ${flexCol(str(p, "valign"), str(p, "align"))}">${parts.join("")}</div>`, js };
    },
  },
  {
    type: "body-copy",
    name: "Body Copy",
    icon: "¶",
    category: "Text",
    description: "A short paragraph of supporting copy.",
    defaultPlacement: { ref: "safe", rect: { x: 0, y: 50, w: 100, h: 20 } },
    fields: [
      { key: "text", label: "Text", type: "textarea", default: "Supporting copy that expands on the headline in one or two sentences.", variable: true, copySource: "any" },
      { key: "size", label: "Size", type: "number", default: 40, min: 14, max: 100, step: 2 },
      colorField("color", "Color", "text"),
      ALIGN_FIELD,
      VALIGN_FIELD,
      ...animFields("fade", 0.4),
    ],
    render(ctx) {
      const t = str(ctx.props, "text");
      return {
        html: `<div data-fit style="width: 100%; height: 100%; ${flexCol(str(ctx.props, "valign"), str(ctx.props, "align"))}"><p id="${ctx.id}-text" ${ctx.bindText("text", "Body copy", t)} style="margin: 0; ${textStyle(ctx, num(ctx.props, "size", 40), "color", 400, "body")}; line-height: 1.35; white-space: pre-line;">${esc(t)}</p></div>`,
        js: entranceJs(`#${ctx.id}-text`, str(ctx.props, "entrance"), at(ctx), ctx.s),
      };
    },
  },
  {
    type: "bullet-list",
    name: "Benefit List",
    icon: "☑️",
    category: "Text",
    description: "Up to six benefits or steps, one per line, revealed with a stagger.",
    defaultPlacement: { ref: "safe", rect: { x: 0, y: 35, w: 100, h: 40 } },
    fields: [
      { key: "items", label: "Items (one per line)", type: "textarea", default: "First benefit\nSecond benefit\nThird benefit", copySource: "claims" },
      {
        key: "marker",
        label: "Marker",
        type: "select",
        default: "check",
        options: [
          { value: "check", label: "Check" },
          { value: "dot", label: "Dot" },
          { value: "number", label: "Number" },
        ],
      },
      { key: "size", label: "Size", type: "number", default: 44, min: 16, max: 100, step: 2 },
      colorField("color", "Text color", "text"),
      colorField("markerColor", "Marker color", "accent"),
      ...animFields("slide", 0.3),
    ],
    render(ctx) {
      const p = ctx.props;
      const items = str(p, "items")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 6);
      const size = Math.round(num(p, "size", 44) * ctx.s);
      const marker = str(p, "marker");
      const lis = items
        .map((it, i) => {
          const m = marker === "number" ? String(i + 1) : marker === "dot" ? "●" : "✓";
          return `<li id="${ctx.id}-i${i}" style="display: flex; gap: ${Math.round(size * 0.5)}px; align-items: baseline;"><span style="color: ${colorVar(str(p, "markerColor"))}; font-weight: 800; min-width: ${Math.round(size * 0.8)}px;">${m}</span><span ${ctx.bindText(`item${i + 1}`, `Item ${i + 1}`, it)}>${esc(it)}</span></li>`;
        })
        .join("");
      const js = items.map((_, i) => entranceJs(`#${ctx.id}-i${i}`, str(p, "entrance"), r2(at(ctx) + i * 0.18), ctx.s)).join("\n");
      return {
        html: `<ul data-fit style="list-style: none; margin: 0; padding: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: ${Math.round(size * 0.55)}px; ${textStyle(ctx, num(p, "size", 44), "color", 500, "body")}; line-height: 1.2;">${lis}</ul>`,
        js,
      };
    },
  },
  {
    type: "stat-callout",
    name: "Stat Callout",
    icon: "📈",
    category: "Data",
    description: "A big proof number (e.g. 87%) that counts up, with a label and optional footnote marker.",
    defaultPlacement: { ref: "safe", rect: { x: 0, y: 20, w: 100, h: 40 } },
    fields: [
      { key: "value", label: "Value", type: "text", default: "87%", variable: true },
      { key: "label", label: "Label", type: "textarea", default: "of people saw a result in 12 weeks", variable: true, copySource: "claims" },
      { key: "mark", label: "Footnote mark", type: "text", default: "*", standIn: false },
      { key: "size", label: "Number size", type: "number", default: 260, min: 60, max: 480, step: 10 },
      { key: "labelSize", label: "Label size", type: "number", default: 44, min: 16, max: 100, step: 2 },
      { key: "countUp", label: "Count up", type: "boolean", default: true },
      colorField("color", "Number color", "accent"),
      colorField("labelColor", "Label color", "text"),
      ALIGN_FIELD,
      ...animFields("rise", 0),
    ],
    render(ctx) {
      const p = ctx.props;
      const value = str(p, "value");
      const label = str(p, "label");
      const mark = str(p, "mark");
      const align = str(p, "align") || "center";
      const html = `<div data-fit style="width: 100%; height: 100%; ${flexCol("center", align)}">
  <div style="${textStyle(ctx, num(p, "size", 260), "color", 900, "display")}; line-height: 0.95; font-variant-numeric: tabular-nums; letter-spacing: -0.03em;"><span id="${ctx.id}-value" ${ctx.bindText("value", "Stat value", value)} style="display: inline-block;">${esc(value)}</span>${mark ? `<sup style="font-size: 0.3em; vertical-align: top;">${esc(mark)}</sup>` : ""}</div>
  <p id="${ctx.id}-label" ${ctx.bindText("label", "Stat label", label)} style="margin: ${Math.round(16 * ctx.s)}px 0 0; ${textStyle(ctx, num(p, "labelSize", 44), "labelColor", 500, "body")}; line-height: 1.25; max-width: 90%; white-space: pre-line;">${esc(label)}</p>
</div>`;
      const t = at(ctx);
      const js = [entranceJs(`#${ctx.id}-value`, str(p, "entrance"), t, ctx.s), entranceJs(`#${ctx.id}-label`, "fade", r2(t + 0.3), ctx.s)];
      const m = value.match(/^([^0-9-]*)(-?[0-9][0-9,]*(?:\.[0-9]+)?)(.*)$/);
      if (p.countUp && m) {
        const decimals = (m[2].split(".")[1] ?? "").length;
        const target = Number(m[2].replace(/,/g, ""));
        js.push(
          `(function () { var el = document.getElementById(${JSON.stringify(`${ctx.id}-value`)}); var c = { v: 0 }; tl.to(c, { v: ${target}, duration: 1.2, ease: "power2.out", onUpdate: function () { el.textContent = ${JSON.stringify(m[1])} + c.v.toLocaleString("en-US", { minimumFractionDigits: ${decimals}, maximumFractionDigits: ${decimals} }) + ${JSON.stringify(m[3])}; } }, ${t}); })();`,
        );
      }
      return { html, js: js.join("\n") };
    },
  },
  {
    type: "cta-button",
    name: "Call to Action",
    icon: "👉",
    category: "Action",
    description: "A button-style CTA with optional URL/sub-label, and a gentle pulse to draw the eye.",
    defaultPlacement: { ref: "safe", rect: { x: 0, y: 80, w: 100, h: 14 } },
    fields: [
      { key: "label", label: "Label", type: "text", default: "Learn more", variable: true, copySource: "callsToAction" },
      { key: "sub", label: "URL / sub-label", type: "text", default: "", variable: true },
      {
        key: "style",
        label: "Style",
        type: "select",
        default: "filled",
        options: [
          { value: "filled", label: "Filled" },
          { value: "outline", label: "Outline" },
          { value: "text", label: "Text + arrow" },
        ],
      },
      { key: "size", label: "Size", type: "number", default: 44, min: 16, max: 100, step: 2 },
      colorField("color", "Button color", "primary"),
      colorField("textColor", "Label color", "white"),
      ALIGN_FIELD,
      { key: "pulse", label: "Pulse", type: "boolean", default: true },
      ...animFields("scale", 0.6),
    ],
    render(ctx) {
      const p = ctx.props;
      const size = Math.round(num(p, "size", 44) * ctx.s);
      const style = str(p, "style");
      const c = colorVar(str(p, "color"));
      const tc = colorVar(str(p, "textColor"));
      const btn =
        style === "outline"
          ? `border: ${Math.max(2, Math.round(4 * ctx.s))}px solid ${c}; color: ${c}; background: transparent;`
          : style === "text"
            ? `color: ${c}; background: transparent; padding-left: 0; padding-right: 0;`
            : `background: ${c}; color: ${tc};`;
      const label = str(p, "label");
      const sub = str(p, "sub");
      const html = `<div data-fit style="width: 100%; height: 100%; ${flexCol("center", str(p, "align") || "left")}">
  <div id="${ctx.id}-btn" style="display: inline-block; ${btn} font-family: var(--font_body); font-weight: 700; font-size: ${size}px; padding: ${Math.round(size * 0.5)}px ${Math.round(size * 1.1)}px; border-radius: var(--radius);"><span ${ctx.bindText("label", "CTA label", label)}>${esc(label)}</span>${style === "text" ? " →" : ""}</div>
  ${sub ? `<div id="${ctx.id}-sub" ${ctx.bindText("sub", "CTA sub-label", sub)} style="margin-top: ${Math.round(size * 0.4)}px; font-family: var(--font_body); font-size: ${Math.round(size * 0.6)}px; color: color-mix(in srgb, var(--brand_text) 85%, transparent);">${esc(sub)}</div>` : ""}
</div>`;
      const t = at(ctx);
      const js = [
        entranceJs(`#${ctx.id}-btn`, str(p, "entrance"), t, ctx.s),
        sub ? entranceJs(`#${ctx.id}-sub`, "fade", r2(t + 0.3), ctx.s) : "",
        p.pulse ? loopJs(`#${ctx.id}-btn`, "scale: 1.05", t + 0.9, ctx, 0.6) : "",
      ];
      return { html, js: js.join("\n") };
    },
  },
  {
    type: "logo",
    name: "Logo",
    icon: "Ⓛ",
    category: "Brand",
    description: "The approved brand mark. Defaults to the logo from the brand kit; falls back to a wordmark.",
    defaultPlacement: { ref: "safe", rect: { x: 0, y: 0, w: 40, h: 8 } },
    fields: [
      { key: "image", label: "Logo override", type: "image", default: "", help: "Leave empty to use the brand kit logo." },
      {
        key: "align",
        label: "Align",
        type: "select",
        default: "left",
        options: ALIGN_FIELD.options,
      },
      colorField("color", "Wordmark color (text fallback)", "text"),
      ...animFields("fade", 0),
    ],
    render(ctx) {
      const p = ctx.props;
      const src = str(p, "image") || ctx.brand.logoDataUrl || "";
      const align = str(p, "align") || "left";
      const justify = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
      const inner = src
        ? `<img id="${ctx.id}-logo" alt="${esc(ctx.brand.name)}" src="${esc(src)}" style="display: block; max-width: 100%; max-height: 100%; object-fit: contain;" />`
        : `<div id="${ctx.id}-logo" style="font-family: var(--font_display); font-weight: 800; font-size: ${Math.round(Math.min(ctx.box.h * 0.6, 72 * ctx.s))}px; color: ${colorVar(str(p, "color"))}; letter-spacing: -0.01em;">${esc(ctx.brand.name)}</div>`;
      return {
        html: `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: ${justify};">${inner}</div>`,
        js: entranceJs(`#${ctx.id}-logo`, str(p, "entrance"), at(ctx), ctx.s),
      };
    },
  },
  {
    type: "footnote",
    name: "Footnote",
    icon: "*",
    category: "Regulatory",
    description: "Small-print references, claim substantiation or \"Actor portrayal\" supers. Stays static and legible.",
    defaultPlacement: { ref: "safe", rect: { x: 0, y: 90, w: 100, h: 10 } },
    fields: [
      { key: "text", label: "Footnote", type: "textarea", default: "*Reference or substantiation for the claim above.", variable: true },
      { key: "size", label: "Size", type: "number", default: 24, min: 12, max: 48, step: 1 },
      colorField("color", "Color", "text"),
      ALIGN_FIELD,
      {
        key: "valign",
        label: "Vertical position",
        type: "select",
        default: "bottom",
        options: VALIGN_FIELD.options,
      },
      ...animFields("fade", 0.5),
    ],
    render(ctx) {
      const t = str(ctx.props, "text");
      return {
        html: `<div data-fit style="width: 100%; height: 100%; ${flexCol(str(ctx.props, "valign") || "bottom", str(ctx.props, "align"))}"><p id="${ctx.id}-text" ${ctx.bindText("text", "Footnote", t)} style="margin: 0; ${textStyle(ctx, num(ctx.props, "size", 24), "color", 400, "body", 85)}; line-height: 1.3; white-space: pre-line;">${esc(t)}</p></div>`,
        js: entranceJs(`#${ctx.id}-text`, str(ctx.props, "entrance"), at(ctx), ctx.s),
      };
    },
  },
  {
    type: "isi",
    name: "ISI (Important Safety Information)",
    icon: "⚠️",
    category: "Regulatory",
    description:
      "Docked safety-information panel with a fixed heading and body text that scrolls at a steady rate through the frame (or stays static). Use it as a persistent overlay to run across every frame.",
    defaultPlacement: { ref: "safe", rect: { x: 0, y: 62, w: 100, h: 38 } },
    fields: [
      { key: "heading", label: "Heading", type: "text", default: "IMPORTANT SAFETY INFORMATION", variable: true, standIn: false },
      {
        key: "body",
        label: "ISI text",
        type: "textarea",
        default: "Paste the approved Important Safety Information here, exactly as approved by medical, legal and regulatory review.",
        variable: true,
        copySource: "isi",
      },
      {
        key: "mode",
        label: "Scroll",
        type: "select",
        default: "fit",
        options: [
          { value: "fit", label: "Scroll to end within the frame" },
          { value: "speed", label: "Scroll at fixed speed" },
          { value: "static", label: "Static" },
        ],
      },
      { key: "speed", label: "Speed (px/s at 1080)", type: "number", default: 40, min: 5, max: 200, step: 5 },
      { key: "hold", label: "Hold before scroll (s)", type: "number", default: 1, min: 0, max: 10, step: 0.5 },
      { key: "size", label: "Text size", type: "number", default: 26, min: 14, max: 48, step: 1 },
      colorField("bg", "Panel color", "white"),
      colorField("color", "Text color", "black"),
      colorField("headingColor", "Heading color", "primary"),
      { key: "divider", label: "Top rule", type: "boolean", default: true },
    ],
    render(ctx) {
      const p = ctx.props;
      const size = Math.round(num(p, "size", 26) * ctx.s);
      const pad = Math.round(22 * ctx.s);
      const heading = str(p, "heading");
      const body = str(p, "body");
      const html = `<div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: ${colorVar(str(p, "bg"))}; color: ${colorVar(str(p, "color"))}; padding: ${pad}px ${pad}px 0; box-sizing: border-box; ${p.divider ? `border-top: ${Math.max(2, Math.round(4 * ctx.s))}px solid ${colorVar(str(p, "headingColor"))};` : ""} font-family: var(--font_body);">
  <div ${ctx.bindText("heading", "ISI heading", heading)} style="flex: none; font-weight: 800; font-size: ${Math.round(size * 1.05)}px; letter-spacing: 0.04em; color: ${colorVar(str(p, "headingColor"))}; margin-bottom: ${Math.round(size * 0.5)}px;">${esc(heading)}</div>
  <div id="${ctx.id}-viewport" style="flex: 1; overflow: hidden; position: relative;">
    <div id="${ctx.id}-body" ${ctx.bindText("body", "ISI body", body)} style="font-size: ${size}px; line-height: 1.4; white-space: pre-line; padding-bottom: ${pad}px;">${esc(body)}</div>
  </div>
</div>`;
      const mode = str(p, "mode");
      if (mode === "static") return { html };
      const hold = Math.max(0, num(p, "hold", 1));
      const t0 = r2(ctx.start + Math.min(hold, ctx.duration / 3));
      const avail = r2(Math.max(0.5, ctx.start + ctx.duration - 0.15 - t0));
      const speed = Math.max(1, num(p, "speed", 40) * ctx.s);
      // Distance is measured from the laid-out DOM once, at build time.
      const js = `(function () {
  var body = document.getElementById(${JSON.stringify(`${ctx.id}-body`)});
  var view = document.getElementById(${JSON.stringify(`${ctx.id}-viewport`)});
  var dist = Math.max(0, body.scrollHeight - view.clientHeight);
  if (dist > 0) {
    var dur = ${mode === "speed" ? `Math.min(${avail}, dist / ${r2(speed)})` : avail};
    var travel = ${mode === "speed" ? `Math.min(dist, ${avail} * ${r2(speed)})` : "dist"};
    tl.fromTo(body, { y: 0 }, { y: -travel, duration: dur, ease: "none" }, ${t0});
  }
})();`;
      return { html, js };
    },
  },
  {
    type: "product-image",
    name: "Product Shot",
    icon: "📦",
    category: "Media",
    description: "Cut-out product or device image (transparent PNG works best) with a soft float.",
    defaultPlacement: { ref: "safe", rect: { x: 10, y: 25, w: 80, h: 45 } },
    fields: [
      { key: "image", label: "Image", type: "image", default: "", variable: true },
      { key: "shadow", label: "Drop shadow", type: "boolean", default: true },
      { key: "float", label: "Float", type: "boolean", default: true },
      ...animFields("scale", 0.2),
    ],
    render(ctx) {
      const src = str(ctx.props, "image");
      const inner = src
        ? `<img id="${ctx.id}-img" alt="" ${ctx.bindSrc("image", "Product image", src)} src="${esc(src)}" style="display: block; width: 100%; height: 100%; object-fit: contain; ${ctx.props.shadow ? `filter: drop-shadow(0 ${Math.round(30 * ctx.s)}px ${Math.round(40 * ctx.s)}px rgba(0,0,0,0.35));` : ""}" />`
        : `<div id="${ctx.id}-img" style="width: 100%; height: 100%; border: ${Math.round(4 * ctx.s)}px dashed color-mix(in srgb, var(--brand_text) 40%, transparent); border-radius: var(--radius);"></div>`;
      const t = at(ctx);
      const js = [
        entranceJs(`#${ctx.id}-img`, str(ctx.props, "entrance"), t, ctx.s),
        ctx.props.float ? loopJs(`#${ctx.id}-wrap`, `y: ${Math.round(-14 * ctx.s)}`, t + 0.7, ctx, 1.2) : "",
      ];
      return { html: `<div id="${ctx.id}-wrap" style="width: 100%; height: 100%;">${inner}</div>`, js: js.join("\n") };
    },
  },
  {
    type: "quote",
    name: "Testimonial Quote",
    icon: "❝",
    category: "Text",
    description: "Pull quote with attribution. Pair with a footnote for \"Actor portrayal\" or \"Individual results may vary\".",
    defaultPlacement: { ref: "safe", rect: { x: 0, y: 20, w: 100, h: 50 } },
    fields: [
      { key: "quote", label: "Quote", type: "textarea", default: "A short, approved testimonial in the speaker's own words.", variable: true },
      { key: "attribution", label: "Attribution", type: "text", default: "Name, descriptor", variable: true },
      { key: "size", label: "Size", type: "number", default: 64, min: 24, max: 140, step: 2 },
      colorField("color", "Text color", "text"),
      colorField("markColor", "Quote-mark color", "accent"),
      ALIGN_FIELD,
      ...animFields("rise", 0.1),
    ],
    render(ctx) {
      const p = ctx.props;
      const q = str(p, "quote");
      const a = str(p, "attribution");
      const size = num(p, "size", 64);
      const html = `<div data-fit style="width: 100%; height: 100%; ${flexCol("center", str(p, "align"))}">
  <div id="${ctx.id}-mark" style="font-family: var(--font_display); font-weight: 900; font-size: ${Math.round(size * 2.4 * ctx.s)}px; line-height: 0.7; color: ${colorVar(str(p, "markColor"))};">“</div>
  <blockquote id="${ctx.id}-quote" ${ctx.bindText("quote", "Quote", q)} style="margin: 0; ${textStyle(ctx, size, "color", 600, "display")}; line-height: 1.18; white-space: pre-line;">${esc(q)}</blockquote>
  <div id="${ctx.id}-attr" ${ctx.bindText("attribution", "Attribution", a)} style="margin-top: ${Math.round(28 * ctx.s)}px; ${textStyle(ctx, size * 0.5, "color", 500, "body", 80)};">— ${esc(a)}</div>
</div>`;
      const t = at(ctx);
      const js = [
        entranceJs(`#${ctx.id}-mark`, "scale", t, ctx.s),
        entranceJs(`#${ctx.id}-quote`, str(p, "entrance"), r2(t + 0.15), ctx.s),
        entranceJs(`#${ctx.id}-attr`, "fade", r2(t + 0.5), ctx.s),
      ];
      return { html, js: js.join("\n") };
    },
  },
  {
    type: "lower-third",
    name: "Lower Third",
    icon: "▭",
    category: "Text",
    description: "Name + title bar for talking-head or spokesperson footage.",
    defaultPlacement: { ref: "safe", rect: { x: 0, y: 78, w: 80, h: 12 } },
    fields: [
      { key: "name", label: "Name", type: "text", default: "Speaker Name", variable: true },
      { key: "title", label: "Title", type: "text", default: "Title or credential", variable: true },
      { key: "size", label: "Size", type: "number", default: 44, min: 16, max: 90, step: 2 },
      colorField("color", "Bar color", "primary"),
      colorField("textColor", "Text color", "white"),
      ...animFields("wipe", 0.2),
    ],
    render(ctx) {
      const p = ctx.props;
      const size = Math.round(num(p, "size", 44) * ctx.s);
      const html = `<div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start;">
  <div id="${ctx.id}-bar" style="background: ${colorVar(str(p, "color"))}; color: ${colorVar(str(p, "textColor"))}; padding: ${Math.round(size * 0.35)}px ${Math.round(size * 0.6)}px; border-radius: var(--radius); font-family: var(--font_body);">
    <div ${ctx.bindText("name", "Name", str(p, "name"))} style="font-weight: 800; font-size: ${size}px;">${esc(str(p, "name"))}</div>
    <div ${ctx.bindText("title", "Title", str(p, "title"))} style="font-size: ${Math.round(size * 0.62)}px;">${esc(str(p, "title"))}</div>
  </div>
</div>`;
      return { html, js: entranceJs(`#${ctx.id}-bar`, str(p, "entrance"), at(ctx), ctx.s) };
    },
  },
  {
    type: "badge",
    name: "Badge / Sticker",
    icon: "🔖",
    category: "Brand",
    description: "Short attention badge — \"New\", \"FDA approved\", \"Limited time\" — that pops in and slowly rotates.",
    defaultPlacement: { ref: "safe", rect: { x: 70, y: 0, w: 30, h: 16 } },
    fields: [
      { key: "text", label: "Text", type: "text", default: "NEW", variable: true, standIn: false },
      {
        key: "shape",
        label: "Shape",
        type: "select",
        default: "circle",
        options: [
          { value: "circle", label: "Circle" },
          { value: "pill", label: "Pill" },
        ],
      },
      { key: "size", label: "Size", type: "number", default: 40, min: 14, max: 100, step: 2 },
      colorField("color", "Badge color", "accent"),
      colorField("textColor", "Text color", "white"),
      ...animFields("scale", 0.5),
    ],
    render(ctx) {
      const p = ctx.props;
      const size = Math.round(num(p, "size", 40) * ctx.s);
      const circle = str(p, "shape") === "circle";
      const d = Math.min(ctx.box.w, ctx.box.h);
      const shape = circle
        ? `width: ${d}px; height: ${d}px; border-radius: 50%;`
        : `padding: ${Math.round(size * 0.4)}px ${Math.round(size * 0.9)}px; border-radius: 999px;`;
      const t = at(ctx);
      return {
        html: `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;"><div id="${ctx.id}-badge" ${ctx.bindText("text", "Badge text", str(p, "text"))} style="${shape} display: flex; align-items: center; justify-content: center; text-align: center; background: ${colorVar(str(p, "color"))}; color: ${colorVar(str(p, "textColor"))}; font-family: var(--font_display); font-weight: 900; font-size: ${size}px; line-height: 1;">${esc(str(p, "text"))}</div></div>`,
        js: [
          entranceJs(`#${ctx.id}-badge`, str(p, "entrance"), t, ctx.s),
          circle ? `tl.to("#${ctx.id}-badge", { rotation: 8, duration: ${r2(Math.max(0.5, ctx.start + ctx.duration - 0.1 - (t + 0.6)))}, ease: "none" }, ${r2(t + 0.6)});` : "",
        ].join("\n"),
      };
    },
  },
];

export const COMPONENT_CATEGORIES: ComponentCategory[] = ["Background", "Text", "Data", "Media", "Brand", "Action", "Regulatory"];

export function getComponent(type: string): ComponentDef | undefined {
  return COMPONENTS.find((c) => c.type === type);
}

export function defaultProps(type: string): PropValues {
  const def = getComponent(type);
  const out: PropValues = {};
  for (const f of def?.fields ?? []) out[f.key] = f.default;
  return out;
}
