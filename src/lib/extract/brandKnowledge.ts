import type {
  AudienceSegmentValue,
  BrandKnowledge,
  CallToActionValue,
  ClaimValue,
  CoreMessageValue,
  ParsedDocument,
  ProductInfoValue,
  SafetyContentValue,
  VoiceToneValue,
} from "../../types";
import { dedupeBy, makeItem, makeMissingItem, refFrom, splitSentences } from "./common";

const CLAIM_MARKERS =
  /\b\d+(\.\d+)?%|\bclinically proven\b|\bshown to\b|\bproven to\b|\bstudies show\b|\bdemonstrated\b|\bsuperior to\b|\b(first|only|#1)\b.{0,20}\b(to|approved|indicated)\b|\bup to\b/i;
const REFERENCE_TAIL = /(\[\d+(?:,\s*\d+)*\]|\(\s*(?:study|ref|reference)[^)]*\))\s*$/i;

export function extractClaims(docs: ParsedDocument[]): BrandKnowledge["claims"] {
  const found: BrandKnowledge["claims"] = [];
  for (const doc of docs) {
    for (const sentence of splitSentences(doc.text)) {
      if (!CLAIM_MARKERS.test(sentence)) continue;
      const refMatch = REFERENCE_TAIL.exec(sentence);
      const hasNumber = /\d/.test(sentence);
      found.push(
        makeItem<ClaimValue>({
          prefix: "claim",
          value: {
            text: sentence,
            supportingReference: refMatch?.[1],
          },
          confidence: refMatch ? "high" : hasNumber ? "medium" : "low",
          sources: [refFrom(doc, sentence)],
        }),
      );
    }
  }
  const deduped = dedupeBy(found, (i) => i.value.text);
  if (deduped.length === 0) {
    return [
      makeMissingItem<ClaimValue>(
        "claim",
        { text: "" },
        "No claim-like statements (statistics, superlatives, 'clinically proven' language) were detected in the provided sources.",
      ),
    ];
  }
  return deduped;
}

export function extractCoreMessages(docs: ParsedDocument[]): BrandKnowledge["coreMessages"] {
  const found: BrandKnowledge["coreMessages"] = [];
  for (const doc of docs) {
    for (const h of doc.headings) {
      if (!h.text || h.text.length > 140) continue;
      found.push(
        makeItem<CoreMessageValue>({
          prefix: "msg",
          value: { text: h.text, tier: h.level <= 1 ? "primary" : "secondary" },
          confidence: h.level <= 2 ? "high" : "medium",
          sources: [refFrom(doc, h.text)],
        }),
      );
    }
  }
  const deduped = dedupeBy(found, (i) => i.value.text);
  if (deduped.length === 0) {
    return [
      makeMissingItem<CoreMessageValue>(
        "msg",
        { text: "", tier: "primary" },
        "No headings were detected to derive a messaging hierarchy from. Provide a source with clear headings (website, deck, or brand doc).",
      ),
    ];
  }
  return deduped;
}

const AUDIENCE_VOCAB: { name: string; pattern: RegExp }[] = [
  { name: "Patients", pattern: /\bpatients?\b/i },
  { name: "Caregivers", pattern: /\bcaregivers?\b/i },
  { name: "Healthcare Providers (HCPs)", pattern: /\b(hcps?|healthcare providers?|physicians?|doctors?|clinicians?)\b/i },
  { name: "Nurses", pattern: /\bnurses?\b/i },
  { name: "Pharmacists", pattern: /\bpharmacists?\b/i },
  { name: "Payers", pattern: /\bpayers?\b/i },
  { name: "Adults", pattern: /\badults?\b/i },
  { name: "Pediatric / Children", pattern: /\b(pediatric|children|kids)\b/i },
  { name: "Consumers", pattern: /\bconsumers?\b/i },
];

export function extractAudienceSegments(docs: ParsedDocument[]): BrandKnowledge["audienceSegments"] {
  const found: BrandKnowledge["audienceSegments"] = [];
  for (const segment of AUDIENCE_VOCAB) {
    for (const doc of docs) {
      const sentences = splitSentences(doc.text);
      const hit = sentences.find((s) => segment.pattern.test(s));
      if (!hit) continue;
      found.push(
        makeItem<AudienceSegmentValue>({
          prefix: "aud",
          value: { name: segment.name, description: hit },
          confidence: "medium",
          sources: [refFrom(doc, hit)],
          aiGenerated: false,
        }),
      );
      break; // one representative hit per segment is enough
    }
  }
  if (found.length === 0) {
    return [
      makeMissingItem<AudienceSegmentValue>(
        "aud",
        { name: "", description: "" },
        "No recognizable audience terms (patients, caregivers, HCPs, etc.) were found in the provided sources.",
      ),
    ];
  }
  return found;
}

export function extractVoiceTone(docs: ParsedDocument[]): BrandKnowledge["voiceTone"] {
  const allText = docs.map((d) => d.text).join(" ");
  const wordCount = allText.split(/\s+/).filter(Boolean).length;
  if (wordCount < 150) {
    return [
      makeMissingItem<VoiceToneValue>(
        "tone",
        { trait: "", description: "" },
        "Not enough narrative text was found to reliably characterize voice and tone (need a longer source, e.g. a full webpage or brand doc).",
      ),
    ];
  }

  const sentences = splitSentences(allText);
  const youCount = (allText.match(/\byou(r)?\b/gi) ?? []).length;
  const exclaimCount = (allText.match(/!/g) ?? []).length;
  const avgLen =
    sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / Math.max(1, sentences.length);
  const clinicalCount = (allText.match(/\b(clinical|efficacy|indicated|dosage|contraindicat\w*|adverse)\b/gi) ?? []).length;

  const traits: BrandKnowledge["voiceTone"] = [];
  const wordsPer1000 = (n: number) => (n / wordCount) * 1000;

  if (wordsPer1000(youCount) > 8) {
    traits.push(
      makeItem<VoiceToneValue>({
        prefix: "tone",
        value: { trait: "Direct & personal", description: `Frequent second-person address ("you"/"your") — ${youCount} occurrences across the source material.` },
        confidence: "medium",
        sources: docs.slice(0, 1).map((d) => refFrom(d, allText)),
        aiGenerated: true,
      }),
    );
  }
  if (wordsPer1000(exclaimCount) > 2) {
    traits.push(
      makeItem<VoiceToneValue>({
        prefix: "tone",
        value: { trait: "Energetic / enthusiastic", description: `Frequent exclamatory sentences (${exclaimCount} instances).` },
        confidence: "low",
        sources: docs.slice(0, 1).map((d) => refFrom(d, allText)),
        aiGenerated: true,
      }),
    );
  }
  if (wordsPer1000(clinicalCount) > 6) {
    traits.push(
      makeItem<VoiceToneValue>({
        prefix: "tone",
        value: { trait: "Clinical & precise", description: `Frequent clinical/regulatory terminology (${clinicalCount} instances) suggests a precise, evidence-led tone.` },
        confidence: "medium",
        sources: docs.slice(0, 1).map((d) => refFrom(d, allText)),
        aiGenerated: true,
      }),
    );
  }
  if (avgLen < 14) {
    traits.push(
      makeItem<VoiceToneValue>({
        prefix: "tone",
        value: { trait: "Concise & plain-spoken", description: `Average sentence length is ${avgLen.toFixed(1)} words, indicating short, direct sentences.` },
        confidence: "low",
        sources: docs.slice(0, 1).map((d) => refFrom(d, allText)),
        aiGenerated: true,
      }),
    );
  }

  if (traits.length === 0) {
    return [
      makeMissingItem<VoiceToneValue>(
        "tone",
        { trait: "", description: "" },
        "No strong tone signals (second-person address, exclamatory language, clinical terminology, sentence length) were detected. Voice and tone should be confirmed manually.",
      ),
    ];
  }
  return traits;
}

const ISI_MARKERS: { pattern: RegExp; type: SafetyContentValue["type"] }[] = [
  { pattern: /important safety information/i, type: "ISI" },
  { pattern: /\bISI\b/, type: "ISI" },
  { pattern: /boxed warning/i, type: "warning" },
  { pattern: /warnings? and precautions?/i, type: "warning" },
  { pattern: /contraindications?/i, type: "warning" },
  { pattern: /adverse reactions?/i, type: "warning" },
  { pattern: /indications? and usage/i, type: "disclaimer" },
  { pattern: /please see full prescribing information/i, type: "disclaimer" },
];

function nextMarkerIndex(text: string, from: number): number {
  let nearest = -1;
  for (const marker of ISI_MARKERS) {
    const re = new RegExp(marker.pattern.source, marker.pattern.flags.includes("g") ? marker.pattern.flags : marker.pattern.flags + "g");
    re.lastIndex = from;
    const m = re.exec(text);
    if (m && (nearest === -1 || m.index < nearest)) nearest = m.index;
  }
  return nearest;
}

export function extractSafetyContent(docs: ParsedDocument[]): BrandKnowledge["safetyContent"] {
  const found: BrandKnowledge["safetyContent"] = [];
  for (const doc of docs) {
    for (const marker of ISI_MARKERS) {
      const match = marker.pattern.exec(doc.text);
      if (!match) continue;
      const start = match.index;
      const nextMarker = nextMarkerIndex(doc.text, start + match[0].length);
      const end = nextMarker === -1 ? start + 600 : Math.min(nextMarker, start + 600);
      const block = doc.text.slice(start, Math.max(end, start + match[0].length)).trim();
      found.push(
        makeItem<SafetyContentValue>({
          prefix: "safety",
          value: { heading: match[0], text: block, type: marker.type },
          confidence: "high",
          sources: [refFrom(doc, block)],
        }),
      );
    }
  }
  const deduped = dedupeBy(found, (i) => i.value.heading + i.value.text.slice(0, 40));
  if (deduped.length === 0) {
    return [
      makeMissingItem<SafetyContentValue>(
        "safety",
        { heading: "", text: "", type: "ISI" },
        "No Important Safety Information, warnings, contraindications, or other regulatory safety content were detected. This is required before the brand can be used in a regulated channel — confirm with Medical/Regulatory.",
      ),
    ];
  }
  return deduped;
}

const CTA_PHRASE = /^(learn more|get started|sign up|download|request (a )?demo|talk to (your )?doctor|ask your (doctor|provider)|find a (provider|doctor)|contact us|subscribe|try (it )?(free|now)|start (your|a)|see (if|how)|register|book|schedule)\b/i;

export function extractCallsToAction(docs: ParsedDocument[]): BrandKnowledge["callsToAction"] {
  const found: BrandKnowledge["callsToAction"] = [];
  for (const doc of docs) {
    for (const link of doc.links) {
      if (!link.text || link.text.length > 60) continue;
      found.push(
        makeItem<CallToActionValue>({
          prefix: "cta",
          value: { text: link.text, context: link.href || undefined },
          confidence: "high",
          sources: [refFrom(doc, link.text)],
        }),
      );
    }
    for (const sentence of splitSentences(doc.text)) {
      if (sentence.length > 60) continue;
      if (!CTA_PHRASE.test(sentence.trim())) continue;
      found.push(
        makeItem<CallToActionValue>({
          prefix: "cta",
          value: { text: sentence.trim() },
          confidence: "medium",
          sources: [refFrom(doc, sentence)],
          aiGenerated: true,
        }),
      );
    }
  }
  const deduped = dedupeBy(found, (i) => i.value.text);
  if (deduped.length === 0) {
    return [
      makeMissingItem<CallToActionValue>(
        "cta",
        { text: "" },
        "No calls to action (button/link text or imperative phrasing) were detected in the provided sources.",
      ),
    ];
  }
  return deduped;
}

export function extractProductInfo(docs: ParsedDocument[]): BrandKnowledge["productInfo"] {
  const found: BrandKnowledge["productInfo"] = [];

  const firstHeading = docs.flatMap((d) => d.headings.map((h) => ({ doc: d, h }))).find((x) => x.h.level <= 1);
  if (firstHeading) {
    found.push(
      makeItem<ProductInfoValue>({
        prefix: "prod",
        value: { field: "Brand / Product Name", value: firstHeading.h.text },
        confidence: "medium",
        sources: [refFrom(firstHeading.doc, firstHeading.h.text)],
      }),
    );
  }

  const indicationPattern = /[^.]*\bindicated (for|to)\b[^.]*\./i;
  for (const doc of docs) {
    const match = indicationPattern.exec(doc.text);
    if (!match) continue;
    found.push(
      makeItem<ProductInfoValue>({
        prefix: "prod",
        value: { field: "Indication", value: match[0].trim() },
        confidence: "high",
        sources: [refFrom(doc, match[0])],
      }),
    );
    break;
  }

  const dosagePattern = /[^.]*\b\d+\s?(mg|mcg|ml|g)\b[^.]*(tablet|capsule|injection|solution|dose|infusion)?[^.]*\./i;
  for (const doc of docs) {
    const match = dosagePattern.exec(doc.text);
    if (!match) continue;
    found.push(
      makeItem<ProductInfoValue>({
        prefix: "prod",
        value: { field: "Dosage / Form", value: match[0].trim() },
        confidence: "medium",
        sources: [refFrom(doc, match[0])],
      }),
    );
    break;
  }

  if (found.length === 0) {
    return [
      makeMissingItem<ProductInfoValue>(
        "prod",
        { field: "", value: "" },
        "No product name, indication statement, or dosage information could be identified in the provided sources.",
      ),
    ];
  }
  return found;
}
