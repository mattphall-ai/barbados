// The precoded frame-layout library.
//
// A layout is a set of named slots. Each slot says which components it can
// hold and where it sits — as a percentage of the format's safe zone ("safe")
// or of the full canvas ("frame", for full-bleed backgrounds). Because slots
// are relative, every layout adapts to every format: the same "Hero + ISI"
// layout works for Reels, Stories, 4:5 feed or 16:9.

import { defaultProps, getComponent } from "./components";
import { makeId } from "../lib/id";
import type { Layer, LayoutDef, LayoutSlot } from "./types";

const FULL = { ref: "frame" as const, rect: { x: 0, y: 0, w: 100, h: 100 } };
const BACKGROUNDS = ["background-image", "background-video", "background-color"];
const COLOR_FIRST = ["background-color", "background-image", "background-video"];

export const LAYOUTS: LayoutDef[] = [
  {
    id: "hero-headline-isi",
    name: "Hero · Headline + ISI",
    category: "Hero",
    description: "Full-bleed image, headline and subhead up top, footnote, and a docked ISI panel in the lower safe area.",
    defaultDuration: 5,
    slots: [
      { id: "background", label: "Background", accepts: BACKGROUNDS, placement: FULL },
      { id: "scrim", label: "Scrim", accepts: ["scrim"], placement: FULL, optional: true, props: { direction: "top", strength: 60 } },
      {
        id: "headline",
        label: "Headline + subhead",
        accepts: ["headline-subhead"],
        placement: { ref: "safe", rect: { x: 0, y: 0, w: 100, h: 46 } },
        props: { valign: "top", color: "white", subColor: "white", headlineSize: 92 },
      },
      {
        id: "footnote",
        label: "Footnote",
        accepts: ["footnote"],
        placement: { ref: "safe", rect: { x: 0, y: 48, w: 100, h: 11 } },
        optional: true,
        props: { color: "white", valign: "bottom" },
      },
      { id: "isi", label: "ISI", accepts: ["isi"], placement: { ref: "safe", rect: { x: 0, y: 62, w: 100, h: 38 } } },
    ],
  },
  {
    id: "hero-headline-cta",
    name: "Hero · Headline + CTA",
    category: "Hero",
    description: "Image-led opener: logo top, headline anchored low over a scrim, CTA underneath.",
    defaultDuration: 5,
    slots: [
      { id: "background", label: "Background", accepts: BACKGROUNDS, placement: FULL },
      { id: "scrim", label: "Scrim", accepts: ["scrim"], placement: FULL, optional: true, props: { direction: "bottom", strength: 75 } },
      { id: "logo", label: "Logo", accepts: ["logo"], placement: { ref: "safe", rect: { x: 0, y: 0, w: 45, h: 9 } }, optional: true, props: { color: "white" } },
      {
        id: "headline",
        label: "Headline + subhead",
        accepts: ["headline-subhead"],
        placement: { ref: "safe", rect: { x: 0, y: 45, w: 100, h: 38 } },
        props: { valign: "bottom", color: "white", subColor: "white" },
      },
      { id: "cta", label: "CTA", accepts: ["cta-button"], placement: { ref: "safe", rect: { x: 0, y: 85, w: 100, h: 15 } }, optional: true },
      { id: "footnote", label: "Footnote", accepts: ["footnote"], placement: { ref: "safe", rect: { x: 0, y: 12, w: 100, h: 8 } }, optional: true, off: true, props: { color: "white", valign: "top" } },
    ],
  },
  {
    id: "split-image-top",
    name: "Split · Image Top",
    category: "Message",
    description: "Image fills the top half edge-to-edge; message and CTA sit on a brand-color field below.",
    defaultDuration: 5,
    slots: [
      { id: "background", label: "Base color", accepts: ["background-color"], placement: FULL },
      { id: "image", label: "Image", accepts: ["background-image", "background-video"], placement: { ref: "frame", rect: { x: 0, y: 0, w: 100, h: 50 } } },
      {
        id: "headline",
        label: "Headline + subhead",
        accepts: ["headline-subhead"],
        placement: { ref: "safe", rect: { x: 0, y: 44, w: 100, h: 36 } },
        props: { valign: "top", headlineSize: 80 },
      },
      { id: "cta", label: "CTA", accepts: ["cta-button"], placement: { ref: "safe", rect: { x: 0, y: 82, w: 100, h: 12 } }, optional: true },
      { id: "footnote", label: "Footnote", accepts: ["footnote"], placement: { ref: "safe", rect: { x: 0, y: 94, w: 100, h: 6 } }, optional: true },
    ],
  },
  {
    id: "statement",
    name: "Statement",
    category: "Message",
    description: "One big typographic message on a brand field. The workhorse for mid-video beats.",
    defaultDuration: 4,
    slots: [
      { id: "background", label: "Background", accepts: COLOR_FIRST, placement: FULL, props: { style: "radial" } },
      {
        id: "headline",
        label: "Headline + subhead",
        accepts: ["headline-subhead", "quote"],
        placement: { ref: "safe", rect: { x: 0, y: 15, w: 100, h: 65 } },
        props: { align: "center", headlineSize: 110 },
      },
      { id: "footnote", label: "Footnote", accepts: ["footnote"], placement: { ref: "safe", rect: { x: 0, y: 88, w: 100, h: 12 } }, optional: true, props: { align: "center" } },
    ],
  },
  {
    id: "stat",
    name: "Stat Callout",
    category: "Proof",
    description: "A proof-point number that counts up, with its label and the substantiating footnote.",
    defaultDuration: 4,
    slots: [
      { id: "background", label: "Background", accepts: COLOR_FIRST, placement: FULL },
      { id: "eyebrow", label: "Kicker", accepts: ["headline-subhead", "body-copy"], placement: { ref: "safe", rect: { x: 0, y: 5, w: 100, h: 18 } }, optional: true, props: { headline: "In clinical studies", subhead: "", headlineSize: 56, align: "center", valign: "bottom" } },
      { id: "stat", label: "Stat", accepts: ["stat-callout"], placement: { ref: "safe", rect: { x: 0, y: 25, w: 100, h: 50 } } },
      { id: "footnote", label: "Footnote", accepts: ["footnote"], placement: { ref: "safe", rect: { x: 0, y: 85, w: 100, h: 15 } }, props: { align: "center" } },
    ],
  },
  {
    id: "product-hero",
    name: "Product Hero",
    category: "Product",
    description: "Headline top, floating product shot center, CTA below. Built for launch and pack-shot moments.",
    defaultDuration: 5,
    slots: [
      { id: "background", label: "Background", accepts: COLOR_FIRST, placement: FULL, props: { style: "radial" } },
      { id: "badge", label: "Badge", accepts: ["badge"], placement: { ref: "safe", rect: { x: 72, y: 20, w: 28, h: 14 } }, optional: true, off: true },
      {
        id: "headline",
        label: "Headline + subhead",
        accepts: ["headline-subhead"],
        placement: { ref: "safe", rect: { x: 0, y: 0, w: 100, h: 24 } },
        props: { align: "center", valign: "top", headlineSize: 84, subheadSize: 38 },
      },
      { id: "product", label: "Product", accepts: ["product-image"], placement: { ref: "safe", rect: { x: 8, y: 26, w: 84, h: 52 } } },
      { id: "cta", label: "CTA", accepts: ["cta-button"], placement: { ref: "safe", rect: { x: 0, y: 80, w: 100, h: 12 } }, optional: true, props: { align: "center" } },
      { id: "footnote", label: "Footnote", accepts: ["footnote"], placement: { ref: "safe", rect: { x: 0, y: 93, w: 100, h: 7 } }, optional: true, props: { align: "center" } },
    ],
  },
  {
    id: "benefits",
    name: "Benefit List",
    category: "Proof",
    description: "Headline plus up to six staggered benefits or steps.",
    defaultDuration: 5,
    slots: [
      { id: "background", label: "Background", accepts: COLOR_FIRST, placement: FULL },
      { id: "headline", label: "Headline", accepts: ["headline-subhead"], placement: { ref: "safe", rect: { x: 0, y: 0, w: 100, h: 26 } }, props: { valign: "top", subhead: "", headlineSize: 84 } },
      { id: "list", label: "Benefits", accepts: ["bullet-list"], placement: { ref: "safe", rect: { x: 0, y: 30, w: 100, h: 55 } } },
      { id: "footnote", label: "Footnote", accepts: ["footnote"], placement: { ref: "safe", rect: { x: 0, y: 88, w: 100, h: 12 } }, optional: true },
    ],
  },
  {
    id: "testimonial",
    name: "Testimonial",
    category: "Proof",
    description: "Portrait image under a heavy scrim, pull quote and attribution, with the required portrayal super.",
    defaultDuration: 6,
    slots: [
      { id: "background", label: "Background", accepts: BACKGROUNDS, placement: FULL },
      { id: "scrim", label: "Scrim", accepts: ["scrim"], placement: FULL, props: { direction: "bottom", strength: 85 } },
      { id: "quote", label: "Quote", accepts: ["quote"], placement: { ref: "safe", rect: { x: 0, y: 35, w: 100, h: 52 } }, props: { color: "white" } },
      { id: "footnote", label: "Super", accepts: ["footnote"], placement: { ref: "safe", rect: { x: 0, y: 0, w: 100, h: 8 } }, props: { text: "Actor portrayal.", color: "white", valign: "top" } },
    ],
  },
  {
    id: "video-lower-third",
    name: "Video + Lower Third",
    category: "Proof",
    description: "Full-bleed footage (spokesperson, HCP, demo) with a name bar and a logo bug.",
    defaultDuration: 6,
    slots: [
      { id: "background", label: "Footage", accepts: ["background-video", "background-image"], placement: FULL },
      { id: "logo", label: "Logo bug", accepts: ["logo"], placement: { ref: "safe", rect: { x: 60, y: 0, w: 40, h: 7 } }, optional: true, props: { align: "right", color: "white" } },
      { id: "lower", label: "Lower third", accepts: ["lower-third"], placement: { ref: "safe", rect: { x: 0, y: 80, w: 90, h: 20 } } },
    ],
  },
  {
    id: "end-card",
    name: "End Card",
    category: "Closing",
    description: "Logo, tagline, CTA and URL — the closing frame. Add an ISI panel for regulated brands.",
    defaultDuration: 5,
    slots: [
      { id: "background", label: "Background", accepts: COLOR_FIRST, placement: FULL, props: { style: "linear" } },
      { id: "logo", label: "Logo", accepts: ["logo"], placement: { ref: "safe", rect: { x: 15, y: 4, w: 70, h: 14 } }, props: { align: "center" } },
      {
        id: "headline",
        label: "Tagline",
        accepts: ["headline-subhead"],
        placement: { ref: "safe", rect: { x: 0, y: 20, w: 100, h: 24 } },
        props: { align: "center", headlineSize: 72, subhead: "" },
      },
      { id: "cta", label: "CTA", accepts: ["cta-button"], placement: { ref: "safe", rect: { x: 0, y: 44, w: 100, h: 16 } }, props: { align: "center", sub: "brand.com" } },
      { id: "isi", label: "ISI", accepts: ["isi"], placement: { ref: "safe", rect: { x: 0, y: 64, w: 100, h: 36 } }, optional: true },
    ],
  },
  {
    id: "isi-full",
    name: "ISI Full Frame",
    category: "Regulatory",
    description: "A dedicated safety-information frame: logo, then the full ISI scrolling across the whole safe area.",
    defaultDuration: 10,
    slots: [
      { id: "background", label: "Background", accepts: ["background-color"], placement: FULL, props: { color: "white" } },
      { id: "logo", label: "Logo", accepts: ["logo"], placement: { ref: "safe", rect: { x: 0, y: 0, w: 50, h: 8 } }, optional: true },
      { id: "isi", label: "ISI", accepts: ["isi"], placement: { ref: "safe", rect: { x: 0, y: 11, w: 100, h: 89 } }, props: { divider: false, hold: 0.5 } },
    ],
  },
  {
    id: "blank",
    name: "Blank Canvas",
    category: "Blank",
    description: "Just a background. Add any components and position them yourself.",
    defaultDuration: 4,
    slots: [{ id: "background", label: "Background", accepts: COLOR_FIRST, placement: FULL }],
  },
];

export function getLayout(id: string): LayoutDef {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[LAYOUTS.length - 1];
}

export function layerFromSlot(slot: LayoutSlot, type = slot.accepts[0]): Layer {
  return {
    id: makeId("layer"),
    slotId: slot.id,
    label: slot.label,
    type,
    enabled: !slot.off,
    props: { ...defaultProps(type), ...(type === slot.accepts[0] ? slot.props : undefined) },
    placement: structuredClone(slot.placement),
  };
}

export function layersForLayout(layout: LayoutDef): Layer[] {
  return layout.slots.map((slot) => layerFromSlot(slot));
}

/**
 * Switch a frame to a new layout, carrying over content: a new slot reuses
 * the props of an old layer with the same component type (first match), so
 * copy survives a layout change. Free-placed layers are kept as they are.
 */
export function relayout(old: Layer[], layout: LayoutDef): Layer[] {
  const pool = old.filter((l) => l.slotId);
  const next = layout.slots.map((slot) => {
    const fresh = layerFromSlot(slot);
    const idx = pool.findIndex((l) => slot.accepts.includes(l.type));
    if (idx === -1) return fresh;
    const [prev] = pool.splice(idx, 1);
    // Keep the content (copy, images); take styling from the new slot so
    // e.g. white-on-image text doesn't carry onto a white background.
    const base = prev.type === fresh.type ? fresh.props : defaultProps(prev.type);
    const content = Object.fromEntries(
      (getComponent(prev.type)?.fields ?? [])
        .filter((f) => ["text", "textarea", "image", "video"].includes(f.type))
        .map((f) => [f.key, prev.props[f.key]]),
    );
    return { ...fresh, type: prev.type, enabled: prev.enabled, props: { ...base, ...content } };
  });
  return [...next, ...old.filter((l) => !l.slotId)];
}

export function componentLabel(type: string): string {
  return getComponent(type)?.name ?? type;
}
