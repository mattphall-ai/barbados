// Starter recipes: multi-frame videos assembled from the layout library.
// Copy is deliberately generic stand-in text; the preflight flags any frame
// that still carries it so nothing ships unedited.

import { makeId } from "../lib/id";
import { defaultBrand } from "./brand";
import { defaultProps } from "./components";
import { getLayout, layersForLayout } from "./layouts";
import type { Frame, Layer, PropValues, SocialProject } from "./types";

type SlotOverrides = Record<string, PropValues & { $type?: string; $off?: boolean; $on?: boolean }>;

export function makeFrame(layoutId: string, name?: string, overrides: SlotOverrides = {}, duration?: number): Frame {
  const layout = getLayout(layoutId);
  const layers = layersForLayout(layout).map((layer) => {
    const o = overrides[layer.slotId ?? ""];
    if (!o) return layer;
    const { $type, $off, $on, ...props } = o;
    const type = $type ?? layer.type;
    return {
      ...layer,
      type,
      enabled: $off ? false : $on ? true : layer.enabled,
      props: { ...(type === layer.type ? layer.props : defaultProps(type)), ...props },
    };
  });
  return { id: makeId("frame"), name: name ?? layout.name, layoutId, duration: duration ?? layout.defaultDuration, layers };
}

function isiOverlay(): Layer {
  return {
    id: makeId("layer"),
    label: "ISI (persistent)",
    type: "isi",
    enabled: true,
    props: { ...defaultProps("isi"), mode: "speed", speed: 30, hold: 2 },
    placement: { ref: "safe", rect: { x: 0, y: 70, w: 100, h: 30 } },
  };
}

export interface Template {
  id: string;
  name: string;
  description: string;
  formatId: string;
  build: () => Pick<SocialProject, "frames" | "overlays">;
}

export const TEMPLATES: Template[] = [
  {
    id: "reels-hero-isi",
    name: "Reels · Hero + ISI",
    description: "Frame 1: background image, headline + subhead, footnote, ISI — then a stat proof point and an end card. Reels safe zone on.",
    formatId: "ig-reels",
    build: () => ({
      frames: [
        makeFrame("hero-headline-isi", "Hero"),
        makeFrame("stat", "Proof point", { footnote: { text: "*Reference for the stat above." } }),
        makeFrame("end-card", "End card", { isi: { $on: true } }),
      ],
      overlays: [],
    }),
  },
  {
    id: "reels-persistent-isi",
    name: "Reels · Persistent ISI",
    description: "Three message frames with one ISI panel docked across the whole video, scrolling at a steady read rate.",
    formatId: "ig-reels",
    build: () => ({
      frames: [
        makeFrame("hero-headline-cta", "Hook", { cta: { $off: true }, headline: { valign: "top", headlineSize: 76, subheadSize: 36 } }),
        makeFrame("benefits", "Benefits"),
        makeFrame("end-card", "End card", { isi: { $off: true }, headline: { headlineSize: 56 }, cta: { size: 32 } }),
      ].map((f) => ({
        ...f,
        // Keep content clear of the docked ISI (bottom 30% of the safe area).
        layers: f.layers.map((l) => (l.placement.ref === "safe" ? { ...l, placement: { ...l.placement, rect: { ...l.placement.rect, y: l.placement.rect.y * 0.68, h: l.placement.rect.h * 0.68 } } } : l)),
      })),
      overlays: [isiOverlay()],
    }),
  },
  {
    id: "story-product-launch",
    name: "Stories · Product Launch",
    description: "Hook statement, product hero with a NEW badge, benefit list and a CTA end card.",
    formatId: "ig-story",
    build: () => ({
      frames: [
        makeFrame("statement", "Hook", {}, 3),
        makeFrame("product-hero", "Product", { badge: { $on: true } }),
        makeFrame("benefits", "Benefits"),
        makeFrame("end-card", "End card", { isi: { $off: true } }),
      ],
      overlays: [],
    }),
  },
  {
    id: "feed-testimonial",
    name: "Feed 4:5 · Testimonial",
    description: "Testimonial with portrayal super, a proof stat and a closing CTA.",
    formatId: "ig-feed-portrait",
    build: () => ({
      frames: [makeFrame("testimonial", "Testimonial"), makeFrame("stat", "Proof point"), makeFrame("end-card", "End card", { isi: { $off: true } })],
      overlays: [],
    }),
  },
  {
    id: "blank",
    name: "Blank",
    description: "One empty frame. Build from the library.",
    formatId: "ig-reels",
    build: () => ({ frames: [makeFrame("blank", "Frame 1")], overlays: [] }),
  },
];

export function projectFromTemplate(t: Template, keep?: Pick<SocialProject, "brand">): SocialProject {
  return {
    id: makeId("social"),
    name: t.id === "blank" ? "Untitled social video" : t.name,
    formatId: t.formatId,
    enforceSafeZone: true,
    fps: 30,
    brand: keep?.brand ?? defaultBrand(),
    ...t.build(),
    updatedAt: Date.now(),
  };
}
