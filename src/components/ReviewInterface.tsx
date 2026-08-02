import { useState } from "react";
import type {
  BrandFoundation,
  BrandKnowledgeSection,
  CreativeSystemSection,
  ExtractedItem,
} from "../types";
import {
  BRAND_KNOWLEDGE_SECTIONS,
  CREATIVE_SYSTEM_SECTIONS,
  SECTION_LABELS,
} from "../types";
import { addManualItem, removeItem, setSectionStatus, updateItem } from "../lib/foundation";
import { ReviewItemCard, type FieldConfig } from "./ReviewItemCard";

type Area = "brandKnowledge" | "creativeSystem";
type SectionKey = BrandKnowledgeSection | CreativeSystemSection;

const FIELD_CONFIG: Record<SectionKey, FieldConfig[]> = {
  claims: [
    { key: "text", label: "Claim", multiline: true },
    { key: "supportingReference", label: "Supporting reference" },
  ],
  coreMessages: [
    { key: "text", label: "Message", multiline: true },
    { key: "tier", label: "Tier", options: ["primary", "secondary"] },
  ],
  audienceSegments: [
    { key: "name", label: "Segment" },
    { key: "description", label: "Context", multiline: true },
  ],
  voiceTone: [
    { key: "trait", label: "Trait" },
    { key: "description", label: "Description", multiline: true },
  ],
  safetyContent: [
    { key: "heading", label: "Heading" },
    { key: "text", label: "Text", multiline: true },
    { key: "type", label: "Type", options: ["ISI", "warning", "disclaimer"] },
  ],
  callsToAction: [
    { key: "text", label: "CTA text" },
    { key: "context", label: "Link / context" },
  ],
  productInfo: [
    { key: "field", label: "Field" },
    { key: "value", label: "Value", multiline: true },
  ],
  logos: [
    { key: "name", label: "Name" },
    { key: "usage", label: "Usage notes" },
  ],
  colorPalette: [
    { key: "name", label: "Name" },
    { key: "hex", label: "Hex" },
    { key: "role", label: "Role" },
  ],
  typography: [
    { key: "role", label: "Role" },
    { key: "fontFamily", label: "Font family" },
  ],
  photographyStyle: [{ key: "description", label: "Description", multiline: true }],
  iconography: [{ key: "description", label: "Description", multiline: true }],
  layoutPatterns: [{ key: "description", label: "Description", multiline: true }],
  components: [
    { key: "name", label: "Component" },
    { key: "description", label: "Description", multiline: true },
  ],
  masterAssets: [
    { key: "name", label: "Name" },
    { key: "type", label: "Type" },
  ],
};

function sectionArea(section: SectionKey): Area {
  return (BRAND_KNOWLEDGE_SECTIONS as readonly string[]).includes(section)
    ? "brandKnowledge"
    : "creativeSystem";
}

interface Props {
  foundation: BrandFoundation;
  onUpdate: (foundation: BrandFoundation) => void;
  onContinue: () => void;
}

export function ReviewInterface({ foundation, onUpdate, onContinue }: Props) {
  const [tab, setTab] = useState<Area>("brandKnowledge");
  const [section, setSection] = useState<SectionKey>("claims");

  const sections = tab === "brandKnowledge" ? BRAND_KNOWLEDGE_SECTIONS : CREATIVE_SYSTEM_SECTIONS;
  const activeSection = sections.includes(section as never) ? section : sections[0];
  const area = sectionArea(activeSection);
  const items = (foundation[area] as unknown as Record<SectionKey, ExtractedItem<unknown>[]>)[
    activeSection
  ];

  function switchTab(next: Area) {
    setTab(next);
    setSection(next === "brandKnowledge" ? BRAND_KNOWLEDGE_SECTIONS[0] : CREATIVE_SYSTEM_SECTIONS[0]);
  }

  function countNeedsAttention(sec: SectionKey): number {
    const a = sectionArea(sec);
    const arr = (foundation[a] as unknown as Record<SectionKey, ExtractedItem<unknown>[]>)[sec];
    return arr.filter((i) => i.missing || i.status === "pending" || i.status === "flagged").length;
  }

  return (
    <div className="screen review-screen">
      <header className="screen-header">
        <h1>Review extracted brand foundation</h1>
        <p>
          Edit anything, approve what's correct, and flag or reject what isn't. Every item shows
          exactly where it came from.
        </p>
      </header>

      <div className="review-tabs">
        <button
          type="button"
          className={tab === "brandKnowledge" ? "active" : ""}
          onClick={() => switchTab("brandKnowledge")}
        >
          Brand Knowledge
        </button>
        <button
          type="button"
          className={tab === "creativeSystem" ? "active" : ""}
          onClick={() => switchTab("creativeSystem")}
        >
          Creative System
        </button>
      </div>

      <div className="review-body">
        <nav className="review-sidebar">
          {sections.map((sec) => {
            const attn = countNeedsAttention(sec);
            return (
              <button
                key={sec}
                type="button"
                className={sec === activeSection ? "active" : ""}
                onClick={() => setSection(sec)}
              >
                {SECTION_LABELS[sec]}
                {attn > 0 && <span className="attention-count">{attn}</span>}
              </button>
            );
          })}
        </nav>

        <main className="review-main">
          <div className="review-main-header">
            <h2>{SECTION_LABELS[activeSection]}</h2>
            <div className="bulk-actions">
              <button
                type="button"
                onClick={() => onUpdate(setSectionStatus(foundation, area, activeSection as never, "approved"))}
              >
                Approve all
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdate(
                    addManualItem(
                      foundation,
                      area,
                      activeSection as never,
                      Object.fromEntries(FIELD_CONFIG[activeSection].map((f) => [f.key, ""])),
                    ),
                  )
                }
              >
                + Add item manually
              </button>
            </div>
          </div>

          <div className="review-item-list">
            {(items as ExtractedItem<Record<string, unknown>>[]).map((item) => (
              <ReviewItemCard
                key={item.id}
                item={item}
                fields={FIELD_CONFIG[activeSection]}
                onChangeValue={(value) =>
                  onUpdate(updateItem(foundation, area, activeSection as never, item.id, { value, missing: false }))
                }
                onChangeStatus={(status) =>
                  onUpdate(updateItem(foundation, area, activeSection as never, item.id, { status }))
                }
                onDelete={() => onUpdate(removeItem(foundation, area, activeSection as never, item.id))}
                colorSwatch={activeSection === "colorPalette" ? String(item.value.hex ?? "") : undefined}
                imagePreview={
                  activeSection === "logos" || activeSection === "masterAssets"
                    ? (item.value.dataUrl as string | undefined)
                    : undefined
                }
              />
            ))}
          </div>
        </main>
      </div>

      <div className="review-footer">
        <button type="button" className="primary-action" onClick={onContinue}>
          Continue to dashboard
        </button>
      </div>
    </div>
  );
}
