import type { BrandFoundation, ExtractedItem, Project } from "../types";

function approvedOnly<T>(items: ExtractedItem<T>[]) {
  return items
    .filter((i) => i.status === "approved")
    .map((i) => ({
      value: i.value,
      confidence: i.confidence,
      aiGenerated: i.aiGenerated,
      sources: i.sources,
    }));
}

function outstanding<T>(section: string, items: ExtractedItem<T>[]) {
  return items
    .filter((i) => i.missing || i.status === "pending" || i.status === "flagged")
    .map((i) => ({
      section,
      status: i.missing ? "missing" : i.status,
      note: i.note,
      value: i.value,
    }));
}

/**
 * A structured, editable source of truth for training an AI copy agent.
 * Only approved items are included as usable knowledge; everything else is
 * surfaced separately under `outstandingForReview` so nothing unapproved
 * silently enters the system.
 */
export function buildCopyAgentKnowledgeBase(project: Project) {
  const f = project.foundation as BrandFoundation;
  const bk = f.brandKnowledge;
  return {
    schema: "atomic-copy-agent-knowledge-base@1",
    generatedAt: new Date().toISOString(),
    project: project.name,
    approvedClaims: approvedOnly(bk.claims),
    coreMessages: approvedOnly(bk.coreMessages),
    audienceSegments: approvedOnly(bk.audienceSegments),
    voiceAndTone: approvedOnly(bk.voiceTone),
    safetyAndRegulatoryContent: approvedOnly(bk.safetyContent),
    callsToAction: approvedOnly(bk.callsToAction),
    productInfo: approvedOnly(bk.productInfo),
    outstandingForReview: [
      ...outstanding("claims", bk.claims),
      ...outstanding("coreMessages", bk.coreMessages),
      ...outstanding("audienceSegments", bk.audienceSegments),
      ...outstanding("voiceTone", bk.voiceTone),
      ...outstanding("safetyContent", bk.safetyContent),
      ...outstanding("callsToAction", bk.callsToAction),
      ...outstanding("productInfo", bk.productInfo),
    ],
  };
}

/**
 * A structured set of visual styles, assets, required content, and reusable
 * components for Studio Rx's production-ready channel templates. Same
 * approved/outstanding separation as the knowledge base.
 */
export function buildBrandDesignKit(project: Project) {
  const f = project.foundation as BrandFoundation;
  const cs = f.creativeSystem;
  return {
    schema: "atomic-brand-design-kit@1",
    generatedAt: new Date().toISOString(),
    project: project.name,
    logos: approvedOnly(cs.logos),
    colorPalette: approvedOnly(cs.colorPalette),
    typography: approvedOnly(cs.typography),
    photographyStyle: approvedOnly(cs.photographyStyle),
    iconography: approvedOnly(cs.iconography),
    layoutPatterns: approvedOnly(cs.layoutPatterns),
    components: approvedOnly(cs.components),
    masterAssets: approvedOnly(cs.masterAssets).map((a) => ({
      ...a,
      value: { ...(a.value as object), dataUrl: undefined },
    })),
    outstandingForReview: [
      ...outstanding("logos", cs.logos),
      ...outstanding("colorPalette", cs.colorPalette),
      ...outstanding("typography", cs.typography),
      ...outstanding("photographyStyle", cs.photographyStyle),
      ...outstanding("iconography", cs.iconography),
      ...outstanding("layoutPatterns", cs.layoutPatterns),
      ...outstanding("components", cs.components),
    ],
  };
}
