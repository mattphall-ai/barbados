import type { BrandFoundation, ParsedDocument } from "../../types";
import {
  extractAudienceSegments,
  extractCallsToAction,
  extractClaims,
  extractCoreMessages,
  extractProductInfo,
  extractSafetyContent,
  extractVoiceTone,
} from "./brandKnowledge";
import {
  extractColorPalette,
  extractComponents,
  extractIconography,
  extractLayoutPatterns,
  extractLogos,
  extractMasterAssets,
  extractPhotographyStyle,
  extractTypography,
} from "./creativeSystem";

export function buildBrandFoundation(docs: ParsedDocument[]): BrandFoundation {
  return {
    brandKnowledge: {
      claims: extractClaims(docs),
      coreMessages: extractCoreMessages(docs),
      audienceSegments: extractAudienceSegments(docs),
      voiceTone: extractVoiceTone(docs),
      safetyContent: extractSafetyContent(docs),
      callsToAction: extractCallsToAction(docs),
      productInfo: extractProductInfo(docs),
    },
    creativeSystem: {
      logos: extractLogos(docs),
      colorPalette: extractColorPalette(docs),
      typography: extractTypography(docs),
      photographyStyle: extractPhotographyStyle(docs),
      iconography: extractIconography(docs),
      layoutPatterns: extractLayoutPatterns(docs),
      components: extractComponents(docs),
      masterAssets: extractMasterAssets(docs),
    },
  };
}
