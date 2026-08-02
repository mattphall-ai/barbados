// Core data model for the Atomic Brand Foundation Builder.
//
// The pipeline is: Source -> ParsedDocument -> ExtractedItem<T>[] (grouped
// into BrandKnowledge / CreativeSystem) -> human review -> export.
//
// Every ExtractedItem carries the source references it was derived from, so
// the review UI can always show "where did this come from" and so nothing
// in an export is untraceable back to source material.

export type SourceKind = "url" | "file";

/** A single input the user handed the tool (a website URL or an uploaded file). */
export interface Source {
  id: string;
  kind: SourceKind;
  label: string;
  url?: string;
  fileName?: string;
  fileType?: string;
  addedAt: number;
}

/** What a source looked like after we parsed it into inspectable content. */
export interface ParsedDocument {
  sourceId: string;
  label: string;
  /** Plain-text content extracted from the source, used for heuristic extraction. */
  text: string;
  /** Raw HTML, when available (URL fetch or .html/.htm upload). */
  html?: string;
  images: ParsedImage[];
  links: { text: string; href: string }[];
  /** Hex colors found in markup/CSS (not from image sampling). */
  cssColors: string[];
  /** font-family values found in markup/CSS. */
  cssFonts: string[];
  headings: { level: number; text: string }[];
  warnings: string[];
}

export interface ParsedImage {
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  /** Dominant colors sampled from the image via canvas, hex. */
  dominantColors: string[];
}

/** A pointer back into a ParsedDocument, shown in the review UI as "Source". */
export interface SourceRef {
  sourceId: string;
  label: string;
  /** Short excerpt of the originating text/markup, for context. */
  snippet?: string;
}

export type Confidence = "high" | "medium" | "low";

export type ReviewStatus = "pending" | "approved" | "flagged" | "rejected";

/**
 * A single extracted fact/asset awaiting human review.
 *
 * `aiGenerated` distinguishes verbatim/structural extraction (false) from
 * anything the heuristics engine summarized, classified, or inferred (true)
 * so the review UI can visually separate "approved source content" from
 * "AI-generated recommendation."
 */
export interface ExtractedItem<T> {
  id: string;
  value: T;
  confidence: Confidence;
  status: ReviewStatus;
  sources: SourceRef[];
  aiGenerated: boolean;
  /** True when the engine found no evidence at all; value is a placeholder. */
  missing: boolean;
  note?: string;
}

// ---- Brand Knowledge ----------------------------------------------------

export interface ClaimValue {
  text: string;
  supportingReference?: string;
}
export interface CoreMessageValue {
  text: string;
  tier: "primary" | "secondary";
}
export interface AudienceSegmentValue {
  name: string;
  description: string;
}
export interface VoiceToneValue {
  trait: string;
  description: string;
}
export interface SafetyContentValue {
  heading: string;
  text: string;
  type: "ISI" | "warning" | "disclaimer";
}
export interface CallToActionValue {
  text: string;
  context?: string;
}
export interface ProductInfoValue {
  field: string;
  value: string;
}

export interface BrandKnowledge {
  claims: ExtractedItem<ClaimValue>[];
  coreMessages: ExtractedItem<CoreMessageValue>[];
  audienceSegments: ExtractedItem<AudienceSegmentValue>[];
  voiceTone: ExtractedItem<VoiceToneValue>[];
  safetyContent: ExtractedItem<SafetyContentValue>[];
  callsToAction: ExtractedItem<CallToActionValue>[];
  productInfo: ExtractedItem<ProductInfoValue>[];
}

// ---- Creative System ------------------------------------------------------

export interface LogoValue {
  name: string;
  dataUrl?: string;
  usage?: string;
}
export interface ColorValue {
  name: string;
  hex: string;
  role?: string;
}
export interface TypographyValue {
  role: string;
  fontFamily: string;
}
export interface StyleNoteValue {
  description: string;
}
export interface ComponentValue {
  name: string;
  description: string;
}
export interface MasterAssetValue {
  name: string;
  type: string;
  dataUrl?: string;
}

export interface CreativeSystem {
  logos: ExtractedItem<LogoValue>[];
  colorPalette: ExtractedItem<ColorValue>[];
  typography: ExtractedItem<TypographyValue>[];
  photographyStyle: ExtractedItem<StyleNoteValue>[];
  iconography: ExtractedItem<StyleNoteValue>[];
  layoutPatterns: ExtractedItem<StyleNoteValue>[];
  components: ExtractedItem<ComponentValue>[];
  masterAssets: ExtractedItem<MasterAssetValue>[];
}

export interface BrandFoundation {
  brandKnowledge: BrandKnowledge;
  creativeSystem: CreativeSystem;
}

export type Screen = "intake" | "processing" | "review" | "dashboard";

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  screen: Screen;
  sources: Source[];
  foundation: BrandFoundation | null;
}

/** Section keys used to drive the review UI's navigation. */
export const BRAND_KNOWLEDGE_SECTIONS = [
  "claims",
  "coreMessages",
  "audienceSegments",
  "voiceTone",
  "safetyContent",
  "callsToAction",
  "productInfo",
] as const;
export type BrandKnowledgeSection = (typeof BRAND_KNOWLEDGE_SECTIONS)[number];

export const CREATIVE_SYSTEM_SECTIONS = [
  "logos",
  "colorPalette",
  "typography",
  "photographyStyle",
  "iconography",
  "layoutPatterns",
  "components",
  "masterAssets",
] as const;
export type CreativeSystemSection = (typeof CREATIVE_SYSTEM_SECTIONS)[number];

export const SECTION_LABELS: Record<
  BrandKnowledgeSection | CreativeSystemSection,
  string
> = {
  claims: "Approved Claims & References",
  coreMessages: "Core Messages & Hierarchy",
  audienceSegments: "Audience Segments",
  voiceTone: "Brand Voice & Tone",
  safetyContent: "Safety & Regulatory Content (ISI)",
  callsToAction: "Calls to Action",
  productInfo: "Product & Indication Information",
  logos: "Logos & Approved Brand Marks",
  colorPalette: "Color Palette",
  typography: "Typography",
  photographyStyle: "Photography & Illustration Style",
  iconography: "Iconography",
  layoutPatterns: "Layout Patterns",
  components: "UI Components",
  masterAssets: "Representative Master Assets",
};
