// Data model for the Social Media Builder.
//
// A SocialProject is a sequence of frames (scenes) for one channel format.
// Each frame is built from a precoded Layout, which places Components into
// named slots. Everything compiles to a single HyperFrames composition
// (see compile.ts) that can be previewed here and rendered by HyperFrames.

/** Pixel insets from each edge of the frame. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SocialFormat {
  id: string;
  platform: string;
  name: string;
  width: number;
  height: number;
  aspect: string;
  /** Area covered by platform UI (captions, buttons, profile). Keep key content inside. */
  safeZone: Insets;
  safeZoneNote: string;
  recommendedDuration: number;
  maxDuration?: number;
}

/** Percent rectangle (0–100) relative to a reference box. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * "safe" places the rect inside the format's safe zone (so it can't collide
 * with platform UI); "frame" places it against the full canvas (full-bleed).
 */
export type PlacementRef = "safe" | "frame";

export interface Placement {
  ref: PlacementRef;
  rect: Rect;
}

export type BrandColorRole = "primary" | "secondary" | "accent" | "background" | "text" | "white" | "black";

export type FieldType =
  | "text"
  | "textarea"
  | "image"
  | "video"
  | "brandColor"
  | "number"
  | "select"
  | "boolean";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  default: string | number | boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  help?: string;
  /** Expose this field as a HyperFrames composition variable (editable in Studio / render --variables). */
  variable?: boolean;
  /** Suggested sources of approved copy from the Brand Foundation. */
  copySource?: "claims" | "coreMessages" | "callsToAction" | "isi" | "any";
  /** false when the default is legitimate final copy (e.g. the ISI heading), so preflight won't flag it. */
  standIn?: boolean;
}

export type ComponentCategory = "Background" | "Text" | "Brand" | "Regulatory" | "Media" | "Data" | "Action";

export type PropValues = Record<string, string | number | boolean>;

/** One component placed on a frame (or as a project-wide overlay). */
export interface Layer {
  id: string;
  /** Layout slot this layer came from, if any. */
  slotId?: string;
  label: string;
  type: string;
  enabled: boolean;
  props: PropValues;
  placement: Placement;
}

export interface Frame {
  id: string;
  name: string;
  layoutId: string;
  duration: number;
  layers: Layer[];
}

export interface FontSpec {
  /** CSS font stack used when no file is embedded. */
  stack: string;
  /** Name for an embedded font file (uploaded .woff2/.ttf/.otf). */
  family?: string;
  dataUrl?: string;
  weight: number;
}

export interface BrandTheme {
  name: string;
  colors: Record<Exclude<BrandColorRole, "white" | "black">, string>;
  display: FontSpec;
  body: FontSpec;
  logoDataUrl?: string;
  cornerRadius: number;
}

export interface SocialProject {
  id: string;
  name: string;
  formatId: string;
  /** When false, "safe" placements use the full frame. */
  enforceSafeZone: boolean;
  fps: number;
  brand: BrandTheme;
  frames: Frame[];
  /** Layers that persist across every frame (e.g. a docked ISI or logo bug). */
  overlays: Layer[];
  updatedAt: number;
}

export interface LayoutSlot {
  id: string;
  label: string;
  /** Component types this slot can hold; the first is the default. */
  accepts: string[];
  placement: Placement;
  optional?: boolean;
  /** Start disabled (user can switch it on). */
  off?: boolean;
  props?: PropValues;
}

export interface LayoutDef {
  id: string;
  name: string;
  category: "Hero" | "Message" | "Product" | "Proof" | "Closing" | "Regulatory" | "Blank";
  description: string;
  defaultDuration: number;
  slots: LayoutSlot[];
}

/** Pixel box of a layer inside the rendered frame. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
