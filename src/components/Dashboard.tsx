import type { BrandFoundation, ExtractedItem, Project } from "../types";
import { SECTION_LABELS } from "../types";
import { computeStats } from "../lib/foundation";
import { downloadJson, downloadDamPackage } from "../export/download";
import { buildBrandDesignKit, buildCopyAgentKnowledgeBase } from "../export/build";

interface Props {
  project: Project;
  onBackToReview: () => void;
  onStartNew: () => void;
}

function countApproved(items: ExtractedItem<unknown>[]): number {
  return items.filter((i) => i.status === "approved").length;
}

function attentionList(foundation: BrandFoundation) {
  const all: { section: string; count: number }[] = [];
  const push = (key: string, items: ExtractedItem<unknown>[]) => {
    const n = items.filter((i) => i.missing || i.status === "pending" || i.status === "flagged").length;
    if (n > 0) all.push({ section: SECTION_LABELS[key as keyof typeof SECTION_LABELS], count: n });
  };
  for (const [k, v] of Object.entries(foundation.brandKnowledge)) push(k, v);
  for (const [k, v] of Object.entries(foundation.creativeSystem)) push(k, v);
  return all;
}

export function Dashboard({ project, onBackToReview, onStartNew }: Props) {
  const foundation = project.foundation as BrandFoundation;
  const stats = computeStats(foundation);
  const attention = attentionList(foundation);

  const approvedColors = foundation.creativeSystem.colorPalette.filter((c) => c.status === "approved");

  return (
    <div className="screen dashboard-screen">
      <header className="screen-header">
        <h1>{project.name}</h1>
        <p>Your brand foundation, ready to power Atomic: a brand-trained copy agent plus a brand design kit.</p>
      </header>

      <div className="completion-bar">
        <div className="completion-fill" style={{ width: `${Math.round(stats.completion * 100)}%` }} />
        <span className="completion-label">
          {Math.round(stats.completion * 100)}% approved ({stats.approved}/{stats.total - stats.missing} reviewable items)
        </span>
      </div>

      <div className="system-cards">
        <div className="system-card">
          <h2>🧠 Copy Agent Knowledge Base</h2>
          <p className="system-card-sub">Structured source of truth to train the AI copy agent</p>
          <ul className="stat-list">
            <li><strong>{countApproved(foundation.brandKnowledge.claims)}</strong> approved claims</li>
            <li><strong>{countApproved(foundation.brandKnowledge.coreMessages)}</strong> core messages</li>
            <li><strong>{countApproved(foundation.brandKnowledge.audienceSegments)}</strong> audience segments</li>
            <li><strong>{countApproved(foundation.brandKnowledge.voiceTone)}</strong> voice &amp; tone traits</li>
            <li><strong>{countApproved(foundation.brandKnowledge.safetyContent)}</strong> safety / ISI blocks</li>
            <li><strong>{countApproved(foundation.brandKnowledge.callsToAction)}</strong> calls to action</li>
            <li><strong>{countApproved(foundation.brandKnowledge.productInfo)}</strong> product info fields</li>
          </ul>
          <button
            type="button"
            onClick={() => downloadJson("copy-agent-knowledge-base.json", buildCopyAgentKnowledgeBase(project))}
          >
            Export JSON
          </button>
        </div>

        <div className="system-card">
          <h2>🎨 Brand Design Kit</h2>
          <p className="system-card-sub">Visual styles, assets &amp; components for channel templates</p>
          <ul className="stat-list">
            <li><strong>{countApproved(foundation.creativeSystem.logos)}</strong> logos</li>
            <li><strong>{countApproved(foundation.creativeSystem.colorPalette)}</strong> palette colors</li>
            <li><strong>{countApproved(foundation.creativeSystem.typography)}</strong> typefaces</li>
            <li><strong>{countApproved(foundation.creativeSystem.components)}</strong> UI components</li>
            <li><strong>{countApproved(foundation.creativeSystem.masterAssets)}</strong> master assets</li>
          </ul>
          {approvedColors.length > 0 && (
            <div className="swatch-row">
              {approvedColors.map((c) => (
                <span
                  key={c.id}
                  className="swatch"
                  style={{ background: (c.value as { hex: string }).hex }}
                  title={(c.value as { hex: string }).hex}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => downloadJson("brand-design-kit.json", buildBrandDesignKit(project))}
          >
            Export JSON
          </button>
        </div>
      </div>

      <div className="dam-export">
        <button type="button" className="primary-action" onClick={() => downloadDamPackage(project)}>
          Export to DAM (.zip)
        </button>
        <p>Bundles both JSON files and approved image assets into one package for your DAM.</p>
      </div>

      {attention.length > 0 && (
        <div className="attention-panel">
          <h3>Needs attention before this goes into production</h3>
          <ul>
            {attention.map((a) => (
              <li key={a.section}>
                {a.section}: <strong>{a.count}</strong> item{a.count > 1 ? "s" : ""} pending, flagged, or missing
              </li>
            ))}
          </ul>
          <button type="button" onClick={onBackToReview}>
            Back to review
          </button>
        </div>
      )}

      <div className="dashboard-footer">
        <button type="button" onClick={onBackToReview}>
          ← Back to review
        </button>
        <button type="button" onClick={onStartNew}>
          Start a new brand foundation
        </button>
      </div>
    </div>
  );
}
