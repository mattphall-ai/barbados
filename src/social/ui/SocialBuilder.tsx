import { useCallback, useEffect, useMemo, useState } from "react";
import "../social.css";
import { compileProject, totalDuration } from "../compile";
import { defaultProps, getComponent } from "../components";
import { FORMATS, getFormat } from "../formats";
import { LAYOUTS, getLayout, relayout } from "../layouts";
import { runPreflight } from "../preflight";
import { loadSocialProject, saveSocialProject } from "../storage";
import { TEMPLATES, makeFrame, projectFromTemplate } from "../templates";
import { makeId } from "../../lib/id";
import type { Frame, Layer, SocialProject } from "../types";
import { BrandPanel } from "./BrandPanel";
import { ExportPanel } from "./ExportPanel";
import { Inspector } from "./Inspector";
import { LayoutThumb, LibraryView } from "./LibraryView";
import { PreviewPlayer } from "./PreviewPlayer";

type Tab = "build" | "library" | "brand" | "export";

const TABS: { key: Tab; label: string }[] = [
  { key: "build", label: "Build" },
  { key: "library", label: "Library" },
  { key: "brand", label: "Brand kit" },
  { key: "export", label: "Send to HyperFrames" },
];

export function SocialBuilder() {
  const [project, setProject] = useState<SocialProject>(loadSocialProject);
  const [tab, setTab] = useState<Tab>("build");
  /** Frame being edited; -1 = persistent overlays. */
  const [frameIndex, setFrameIndex] = useState(0);
  const [layerId, setLayerId] = useState<string | undefined>();
  const [seekNonce, setSeekNonce] = useState(0);
  const [overflowIds, setOverflowIds] = useState<string[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);
  const [pickingLayout, setPickingLayout] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSaveFailed(!saveSocialProject(project)), 300);
    return () => clearTimeout(t);
  }, [project]);

  const format = getFormat(project.formatId);
  const preview = useMemo(() => compileProject(project, "preview"), [project]);
  const findings = useMemo(() => runPreflight(project, overflowIds), [project, overflowIds]);
  const onOverflow = useCallback((ids: string[]) => setOverflowIds(ids), []);

  const update = (fn: (p: SocialProject) => SocialProject) => setProject((p) => ({ ...fn(p), updatedAt: Date.now() }));
  const updateFrames = (fn: (frames: Frame[]) => Frame[]) => update((p) => ({ ...p, frames: fn(p.frames) }));

  const safeFrameIndex = frameIndex >= project.frames.length ? project.frames.length - 1 : frameIndex;
  const frame = safeFrameIndex >= 0 ? project.frames[safeFrameIndex] : null;
  const layers = frame ? frame.layers : project.overlays;

  function selectFrame(i: number, lid?: string) {
    setFrameIndex(i);
    setLayerId(lid);
    setSeekNonce((n) => n + 1);
  }

  function setLayers(fn: (layers: Layer[]) => Layer[]) {
    if (frame) updateFrames((fs) => fs.map((f, i) => (i === safeFrameIndex ? { ...f, layers: fn(f.layers) } : f)));
    else update((p) => ({ ...p, overlays: fn(p.overlays) }));
  }

  function updateLayer(id: string, patch: Partial<Layer>) {
    setLayers((ls) =>
      ls.map((l) => {
        if (l.id !== id) return l;
        if (patch.type && patch.type !== l.type) {
          const slot = frame ? getLayout(frame.layoutId).slots.find((s) => s.id === l.slotId) : undefined;
          return { ...l, ...patch, props: { ...defaultProps(patch.type), ...(slot && slot.accepts[0] === patch.type ? slot.props : undefined) } };
        }
        return { ...l, ...patch };
      }),
    );
  }

  function addLayer(type: string, target = safeFrameIndex) {
    const def = getComponent(type);
    if (!def) return;
    const layer: Layer = { id: makeId("layer"), label: def.name, type, enabled: true, props: defaultProps(type), placement: structuredClone(def.defaultPlacement) };
    if (target >= 0) updateFrames((fs) => fs.map((f, i) => (i === target ? { ...f, layers: [...f.layers, layer] } : f)));
    else update((p) => ({ ...p, overlays: [...p.overlays, layer] }));
    setFrameIndex(target);
    setLayerId(layer.id);
  }

  function addFrame(layoutId: string) {
    const f = makeFrame(layoutId, `Frame ${project.frames.length + 1}`);
    updateFrames((fs) => [...fs, f]);
    selectFrame(project.frames.length);
    setPickingLayout(false);
    setTab("build");
  }

  function moveFrame(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= project.frames.length) return;
    updateFrames((fs) => {
      const next = [...fs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    selectFrame(j);
  }

  function startTemplate(id: string) {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    if (!confirm(`Replace the current video with “${t.name}”? Your brand kit is kept.`)) return;
    setProject(projectFromTemplate(t, { brand: project.brand }));
    selectFrame(0);
    setTab("build");
  }

  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warnCount = findings.filter((f) => f.severity === "warning").length;

  return (
    <div className="sb-root">
      <div className="sb-tabs">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            {t.label}
            {t.key === "export" && (errorCount > 0 || warnCount > 0) && <span className={`sb-badge ${errorCount ? "bad" : "warn"}`}>{errorCount || warnCount}</span>}
          </button>
        ))}
        {saveFailed && <span className="sb-error sb-small">Not saved — browser storage is full (large uploads). Use “Save project” on the Send tab.</span>}
      </div>

      {tab === "build" && (
        <div className="sb-build">
          <aside className="sb-sidebar">
            <section className="sb-panel">
              <label className="sb-field">
                <span>Video name</span>
                <input value={project.name} onChange={(e) => update((p) => ({ ...p, name: e.target.value }))} />
              </label>
              <label className="sb-field">
                <span>Type</span>
                <select value={project.formatId} onChange={(e) => update((p) => ({ ...p, formatId: e.target.value }))}>
                  {FORMATS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.aspect})
                    </option>
                  ))}
                </select>
              </label>
              <label className="sb-field sb-inline">
                <input type="checkbox" checked={project.enforceSafeZone} onChange={(e) => update((p) => ({ ...p, enforceSafeZone: e.target.checked }))} />
                <span>Use safe zone</span>
              </label>
              <p className="sb-muted sb-small">{format.safeZoneNote}</p>
            </section>

            <section className="sb-panel">
              <h3>
                Frames <span className="sb-muted">· {totalDuration(project)}s</span>
              </h3>
              <ol className="sb-frame-list">
                {project.frames.map((f, i) => (
                  <li key={f.id} className={i === safeFrameIndex ? "active" : ""}>
                    <button type="button" className="sb-frame-main" onClick={() => selectFrame(i)}>
                      <LayoutThumb layout={getLayout(f.layoutId)} format={format} width={format.width > format.height ? 56 : 32} />
                      <span>
                        <strong>
                          {i + 1}. {f.name}
                        </strong>
                        <small>
                          {getLayout(f.layoutId).name} · {f.duration}s
                        </small>
                      </span>
                    </button>
                    <div className="sb-frame-actions">
                      <button type="button" className="sb-icon" title="Move up" onClick={() => moveFrame(i, -1)}>
                        ↑
                      </button>
                      <button type="button" className="sb-icon" title="Move down" onClick={() => moveFrame(i, 1)}>
                        ↓
                      </button>
                      <button
                        type="button"
                        className="sb-icon"
                        title="Duplicate"
                        onClick={() => {
                          const copy: Frame = { ...structuredClone(f), id: makeId("frame"), name: `${f.name} copy`, layers: f.layers.map((l) => ({ ...structuredClone(l), id: makeId("layer") })) };
                          updateFrames((fs) => [...fs.slice(0, i + 1), copy, ...fs.slice(i + 1)]);
                          selectFrame(i + 1);
                        }}
                      >
                        ⧉
                      </button>
                      <button
                        type="button"
                        className="sb-icon"
                        title="Delete"
                        disabled={project.frames.length <= 1}
                        onClick={() => {
                          updateFrames((fs) => fs.filter((_, j) => j !== i));
                          selectFrame(Math.max(0, i - 1));
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
                <li className={safeFrameIndex === -1 ? "active" : ""}>
                  <button type="button" className="sb-frame-main" onClick={() => selectFrame(-1)}>
                    <span>
                      <strong>Persistent overlays</strong>
                      <small>{project.overlays.filter((l) => l.enabled).length} layer(s) across all frames</small>
                    </span>
                  </button>
                </li>
              </ol>
              <button type="button" className="sb-btn primary" onClick={() => setPickingLayout(true)}>
                + Add frame from layout
              </button>
            </section>
          </aside>

          <main className="sb-center">
            <PreviewPlayer
              html={preview.html}
              format={format}
              duration={preview.duration}
              frameStarts={preview.frameStarts}
              layers={preview.layers}
              frameIndex={safeFrameIndex}
              selectedLayerId={layerId}
              onSelectLayer={(fi, lid) => {
                setFrameIndex(fi);
                setLayerId(lid);
              }}
              onOverflow={onOverflow}
              seekToFrame={seekNonce}
            />
            <section className="sb-panel sb-preflight">
              <h3>
                Preflight <span className="sb-muted">· {findings.length ? `${errorCount} errors, ${warnCount} warnings` : "all clear"}</span>
              </h3>
              <ul>
                {findings.map((f, i) => (
                  <li key={i} className={`sev-${f.severity}`}>
                    <button type="button" disabled={f.frameIndex === undefined} onClick={() => f.frameIndex !== undefined && selectFrame(f.frameIndex, f.layerId)}>
                      <span className="sev">{f.severity === "error" ? "●" : f.severity === "warning" ? "▲" : "i"}</span>
                      {f.frameIndex !== undefined && <em>{f.frameIndex === -1 ? "Overlay" : `Frame ${f.frameIndex + 1}`}</em>} {f.message}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </main>

          <Inspector
            brand={project.brand}
            frame={frame}
            layers={layers}
            selectedLayerId={layerId}
            onSelectLayer={setLayerId}
            onUpdateFrame={(patch) => updateFrames((fs) => fs.map((f, i) => (i === safeFrameIndex ? { ...f, ...patch } : f)))}
            onChangeLayout={(layoutId) => updateFrames((fs) => fs.map((f, i) => (i === safeFrameIndex ? { ...f, layoutId, layers: relayout(f.layers, getLayout(layoutId)) } : f)))}
            onUpdateLayer={updateLayer}
            onAddLayer={(type) => addLayer(type)}
            onRemoveLayer={(id) => setLayers((ls) => ls.filter((l) => l.id !== id))}
            onMoveLayer={(id, dir) =>
              setLayers((ls) => {
                const i = ls.findIndex((l) => l.id === id);
                const j = i + dir;
                if (i < 0 || j < 0 || j >= ls.length) return ls;
                const next = [...ls];
                [next[i], next[j]] = [next[j], next[i]];
                return next;
              })
            }
          />
        </div>
      )}

      {tab === "library" && (
        <LibraryView format={format} hasFrame={project.frames.length > 0} onAddLayout={addFrame} onAddComponent={(type) => { addLayer(type); setTab("build"); }} onStartTemplate={startTemplate} />
      )}
      {tab === "brand" && <BrandPanel brand={project.brand} onChange={(brand) => update((p) => ({ ...p, brand }))} />}
      {tab === "export" && (
        <ExportPanel
          project={project}
          findings={findings}
          onOpenProject={(p) => {
            setProject(p);
            selectFrame(0);
            setTab("build");
          }}
        />
      )}

      {pickingLayout && (
        <div className="modal-overlay" onClick={() => setPickingLayout(false)}>
          <div className="modal sb-layout-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Choose a layout for the new frame</h3>
            <div className="sb-layout-pick">
              {LAYOUTS.map((l) => (
                    <button key={l.id} type="button" onClick={() => addFrame(l.id)}>
                      <LayoutThumb layout={l} format={format} width={format.width > format.height ? 140 : 80} />
                      <strong>{l.name}</strong>
                      <small>{l.category}</small>
                    </button>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-action" onClick={() => setPickingLayout(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
