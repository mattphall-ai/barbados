import { useMemo, useRef } from "react";
import { approvedCopy } from "../brand";
import { COMPONENTS, getComponent } from "../components";
import { LAYOUTS, getLayout } from "../layouts";
import { readAsDataUrl, readImage } from "../media";
import type { BrandTheme, FieldDef, Frame, Layer, Placement, PropValues } from "../types";

// ---- field editor -----------------------------------------------------------

function FieldInput({ field, value, brand, onChange }: { field: FieldDef; value: PropValues[string]; brand: BrandTheme; onChange: (v: PropValues[string]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const copy = useMemo(() => approvedCopy(), []);
  const suggestions =
    field.copySource === "any"
      ? [...copy.coreMessages, ...copy.claims, ...copy.callsToAction]
      : field.copySource
        ? copy[field.copySource]
        : [];

  switch (field.type) {
    case "text":
    case "textarea":
      return (
        <>
          {field.type === "text" ? (
            <input type="text" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
          ) : (
            <textarea rows={field.copySource === "isi" ? 8 : 3} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
          )}
          {suggestions.length > 0 && (
            <select className="sb-copy-pick" value="" onChange={(e) => e.target.value && onChange(e.target.value)}>
              <option value="">Insert approved copy from Brand Foundation…</option>
              {suggestions.map((s, i) => (
                <option key={i} value={s}>
                  {s.length > 90 ? s.slice(0, 90) + "…" : s}
                </option>
              ))}
            </select>
          )}
        </>
      );
    case "number":
      return <input type="number" value={Number(value)} min={field.min} max={field.max} step={field.step} onChange={(e) => onChange(Number(e.target.value))} />;
    case "boolean":
      return <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />;
    case "select":
      return (
        <select value={String(value)} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "brandColor": {
      const swatch = (v: string) => (v === "white" ? "#ffffff" : v === "black" ? "#000000" : brand.colors[v as keyof BrandTheme["colors"]]);
      return (
        <div className="sb-color-pick">
          {field.options?.map((o) => (
            <button key={o.value} type="button" title={o.label} className={o.value === value ? "active" : ""} style={{ background: swatch(o.value) }} onClick={() => onChange(o.value)} />
          ))}
        </div>
      );
    }
    case "image":
    case "video": {
      const src = String(value ?? "");
      const isData = src.startsWith("data:");
      return (
        <div className="sb-media-field">
          {src && field.type === "image" && <img src={src} alt="" />}
          <input
            type="url"
            placeholder="https://… (public URL) or upload"
            value={isData ? `(uploaded file, ${Math.round(src.length / 1365)} KB)` : src}
            readOnly={isData}
            onChange={(e) => onChange(e.target.value.trim())}
          />
          <div className="sb-row">
            <button type="button" className="sb-btn" onClick={() => fileRef.current?.click()}>
              Upload
            </button>
            {src && (
              <button type="button" className="sb-btn" onClick={() => onChange("")}>
                Clear
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept={field.type === "image" ? "image/*" : "video/mp4,video/webm,video/quicktime"}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) onChange(field.type === "image" ? await readImage(f) : await readAsDataUrl(f));
              e.target.value = "";
            }}
          />
        </div>
      );
    }
  }
}

// ---- inspector --------------------------------------------------------------

interface Props {
  brand: BrandTheme;
  /** null = the project overlay track. */
  frame: Frame | null;
  layers: Layer[];
  selectedLayerId?: string;
  onSelectLayer: (id: string) => void;
  onUpdateFrame: (patch: Partial<Frame>) => void;
  onChangeLayout: (layoutId: string) => void;
  onUpdateLayer: (id: string, patch: Partial<Layer>) => void;
  onAddLayer: (type: string) => void;
  onRemoveLayer: (id: string) => void;
  onMoveLayer: (id: string, dir: -1 | 1) => void;
}

export function Inspector({ brand, frame, layers, selectedLayerId, onSelectLayer, onUpdateFrame, onChangeLayout, onUpdateLayer, onAddLayer, onRemoveLayer, onMoveLayer }: Props) {
  const layout = frame ? getLayout(frame.layoutId) : null;
  const layer = layers.find((l) => l.id === selectedLayerId);
  const def = layer ? getComponent(layer.type) : undefined;
  const slot = layer?.slotId ? layout?.slots.find((s) => s.id === layer.slotId) : undefined;

  const setPlacement = (p: Placement) => layer && onUpdateLayer(layer.id, { placement: p });
  const setRect = (k: "x" | "y" | "w" | "h", v: number) => layer && setPlacement({ ...layer.placement, rect: { ...layer.placement.rect, [k]: v } });

  return (
    <aside className="sb-inspector">
      {frame ? (
        <section className="sb-panel">
          <h3>Frame</h3>
          <label className="sb-field">
            <span>Name</span>
            <input value={frame.name} onChange={(e) => onUpdateFrame({ name: e.target.value })} />
          </label>
          <div className="sb-grid2">
            <label className="sb-field">
              <span>Duration (s)</span>
              <input type="number" min={1} max={60} step={0.5} value={frame.duration} onChange={(e) => onUpdateFrame({ duration: Math.max(0.5, Number(e.target.value) || 0.5) })} />
            </label>
            <label className="sb-field">
              <span>Layout</span>
              <select value={frame.layoutId} onChange={(e) => onChangeLayout(e.target.value)}>
                {LAYOUTS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {layout && <p className="sb-muted sb-small">{layout.description}</p>}
        </section>
      ) : (
        <section className="sb-panel">
          <h3>Persistent overlays</h3>
          <p className="sb-muted sb-small">Layers here run across the entire video, above every frame — e.g. a docked ISI that scrolls continuously, or a logo bug.</p>
        </section>
      )}

      <section className="sb-panel">
        <h3>Layers</h3>
        <ul className="sb-layer-list">
          {layers.map((l) => {
            const s = l.slotId ? layout?.slots.find((x) => x.id === l.slotId) : undefined;
            return (
              <li key={l.id} className={l.id === selectedLayerId ? "active" : ""}>
                <input type="checkbox" checked={l.enabled} title={s && !s.optional ? "Required by this layout" : "Show / hide"} onChange={(e) => onUpdateLayer(l.id, { enabled: e.target.checked })} />
                <button type="button" className="sb-layer-name" onClick={() => onSelectLayer(l.id)}>
                  <span>{getComponent(l.type)?.icon}</span> {l.label}
                  <small>{s ? "slot" : "added"}</small>
                </button>
                <button type="button" className="sb-icon" title="Move back" onClick={() => onMoveLayer(l.id, -1)}>
                  ↑
                </button>
                <button type="button" className="sb-icon" title="Move forward" onClick={() => onMoveLayer(l.id, 1)}>
                  ↓
                </button>
                {!l.slotId && (
                  <button type="button" className="sb-icon" title="Remove" onClick={() => onRemoveLayer(l.id)}>
                    ✕
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <select className="sb-add" value="" onChange={(e) => e.target.value && onAddLayer(e.target.value)}>
          <option value="">+ Add component…</option>
          {COMPONENTS.map((c) => (
            <option key={c.type} value={c.type}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </section>

      {layer && def && (
        <section className="sb-panel">
          <h3>
            {def.icon} {layer.label}
          </h3>
          <p className="sb-muted sb-small">{def.description}</p>
          <label className="sb-field">
            <span>Layer name</span>
            <input value={layer.label} onChange={(e) => onUpdateLayer(layer.id, { label: e.target.value })} />
          </label>
          {slot && slot.accepts.length > 1 && (
            <label className="sb-field">
              <span>Component</span>
              <select value={layer.type} onChange={(e) => onUpdateLayer(layer.id, { type: e.target.value })}>
                {slot.accepts.map((t) => (
                  <option key={t} value={t}>
                    {getComponent(t)?.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {def.fields.map((f) => (
            <div className={`sb-field ${f.type === "boolean" ? "sb-inline" : ""}`} key={f.key}>
              <span>
                {f.label}
                {f.variable && (
                  <em className="sb-var" title="Exported as a HyperFrames variable — editable in Studio and at render time">
                    var
                  </em>
                )}
              </span>
              <FieldInput field={f} value={layer.props[f.key]} brand={brand} onChange={(v) => onUpdateLayer(layer.id, { props: { ...layer.props, [f.key]: v } })} />
              {f.help && <small className="sb-muted">{f.help}</small>}
            </div>
          ))}
          <details className="sb-placement">
            <summary>Position &amp; size</summary>
            <label className="sb-field">
              <span>Relative to</span>
              <select value={layer.placement.ref} onChange={(e) => setPlacement({ ...layer.placement, ref: e.target.value as Placement["ref"] })}>
                <option value="safe">Safe zone (stays clear of platform UI)</option>
                <option value="frame">Full frame (bleed)</option>
              </select>
            </label>
            <div className="sb-grid4">
              {(["x", "y", "w", "h"] as const).map((k) => (
                <label className="sb-field" key={k}>
                  <span>{k.toUpperCase()} %</span>
                  <input type="number" step={1} value={layer.placement.rect[k]} onChange={(e) => setRect(k, Number(e.target.value))} />
                </label>
              ))}
            </div>
            {slot && (
              <button type="button" className="sb-btn" onClick={() => setPlacement(structuredClone(slot.placement))}>
                Reset to layout position
              </button>
            )}
          </details>
        </section>
      )}
    </aside>
  );
}
