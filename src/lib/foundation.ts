import { makeId } from "./id";
import type {
  BrandFoundation,
  BrandKnowledgeSection,
  CreativeSystemSection,
  ExtractedItem,
  ReviewStatus,
} from "../types";

type Area = "brandKnowledge" | "creativeSystem";
type SectionOf<A extends Area> = A extends "brandKnowledge" ? BrandKnowledgeSection : CreativeSystemSection;

function getArray(
  foundation: BrandFoundation,
  area: Area,
  section: string,
): ExtractedItem<unknown>[] {
  return (foundation[area] as unknown as Record<string, ExtractedItem<unknown>[]>)[section];
}

function withArray(
  foundation: BrandFoundation,
  area: Area,
  section: string,
  items: ExtractedItem<unknown>[],
): BrandFoundation {
  return {
    ...foundation,
    [area]: {
      ...(foundation[area] as object),
      [section]: items,
    },
  } as BrandFoundation;
}

/** Applies a partial patch (edited value, status change, note) to a single extracted item. */
export function updateItem<A extends Area>(
  foundation: BrandFoundation,
  area: A,
  section: SectionOf<A>,
  itemId: string,
  patch: Partial<ExtractedItem<unknown>>,
): BrandFoundation {
  const items = getArray(foundation, area, section as string);
  const next = items.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
  return withArray(foundation, area, section as string, next);
}

/** Sets review status for every item in a section at once. */
export function setSectionStatus<A extends Area>(
  foundation: BrandFoundation,
  area: A,
  section: SectionOf<A>,
  status: ReviewStatus,
): BrandFoundation {
  const items = getArray(foundation, area, section as string);
  const next = items.map((item) => (item.missing ? item : { ...item, status }));
  return withArray(foundation, area, section as string, next);
}

/** Adds a brand-new, human-authored item to a section (e.g. filling in a flagged gap). */
export function addManualItem<A extends Area, T>(
  foundation: BrandFoundation,
  area: A,
  section: SectionOf<A>,
  value: T,
): BrandFoundation {
  const items = getArray(foundation, area, section as string);
  const newItem: ExtractedItem<T> = {
    id: makeId("manual"),
    value,
    confidence: "high",
    status: "approved",
    sources: [],
    aiGenerated: false,
    missing: false,
    note: "Manually entered by reviewer.",
  };
  return withArray(foundation, area, section as string, [
    ...items,
    newItem as unknown as ExtractedItem<unknown>,
  ]);
}

export function removeItem<A extends Area>(
  foundation: BrandFoundation,
  area: A,
  section: SectionOf<A>,
  itemId: string,
): BrandFoundation {
  const items = getArray(foundation, area, section as string);
  return withArray(foundation, area, section as string, items.filter((i) => i.id !== itemId));
}

export interface FoundationStats {
  total: number;
  approved: number;
  pending: number;
  flagged: number;
  rejected: number;
  missing: number;
  completion: number; // 0-1, share of non-missing items approved
}

export function computeStats(foundation: BrandFoundation): FoundationStats {
  const all: ExtractedItem<unknown>[] = [
    ...Object.values(foundation.brandKnowledge).flat(),
    ...Object.values(foundation.creativeSystem).flat(),
  ];
  const missing = all.filter((i) => i.missing).length;
  const approved = all.filter((i) => i.status === "approved").length;
  const pending = all.filter((i) => i.status === "pending").length;
  const flagged = all.filter((i) => i.status === "flagged").length;
  const rejected = all.filter((i) => i.status === "rejected").length;
  const reviewable = all.length - missing;
  return {
    total: all.length,
    approved,
    pending,
    flagged,
    rejected,
    missing,
    completion: reviewable === 0 ? 0 : approved / reviewable,
  };
}
