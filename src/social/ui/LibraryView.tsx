import { COMPONENTS, COMPONENT_CATEGORIES, getComponent } from "../components";
import { FORMATS, resolveBox } from "../formats";
import { LAYOUTS } from "../layouts";
import { TEMPLATES } from "../templates";
import type { LayoutDef, SocialFormat } from "../types";

/** Wireframe of a layout on a given format: slots, safe zone and all. */
export function LayoutThumb({ layout, format, width = 150 }: { layout: LayoutDef; format: SocialFormat; width?: number }) {
  const h = (width * format.height) / format.width;
  const sz = format.safeZone;
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  return (
    <div className="sb-thumb" style={{ width, height: h }}>
      <div className="sb-thumb-safe" style={{ left: pct(sz.left, format.width), top: pct(sz.top, format.height), right: pct(sz.right, format.width), bottom: pct(sz.bottom, format.height) }} />
      {layout.slots.map((slot) => {
        const b = resolveBox(slot.placement, format, true);
        const full = b.w === format.width && b.h === format.height;
        return (
          <div
            key={slot.id}
            className={`sb-thumb-slot cat-${getComponent(slot.accepts[0])?.category ?? "Text"} ${full ? "full" : ""} ${slot.off ? "off" : ""}`}
            style={{ left: pct(b.x, format.width), top: pct(b.y, format.height), width: pct(b.w, format.width), height: pct(b.h, format.height) }}
          >
            {!full && <span>{slot.label}</span>}
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  format: SocialFormat;
  hasFrame: boolean;
  onAddLayout: (layoutId: string) => void;
  onAddComponent: (type: string) => void;
  onStartTemplate: (templateId: string) => void;
}

export function LibraryView({ format, hasFrame, onAddLayout, onAddComponent, onStartTemplate }: Props) {
  return (
    <div className="sb-library">
      <section>
        <header className="sb-section-head">
          <h2>Starter videos</h2>
          <p>Multi-frame recipes built from the layouts below. Starting one replaces the current video (your brand kit is kept).</p>
        </header>
        <div className="sb-card-grid">
          {TEMPLATES.map((t) => (
            <div className="sb-card" key={t.id}>
              <h4>{t.name}</h4>
              <p className="sb-muted sb-small">{t.description}</p>
              <p className="sb-small">
                <span className="sb-chip">{FORMATS.find((f) => f.id === t.formatId)?.name}</span>
              </p>
              <button type="button" className="sb-btn" onClick={() => onStartTemplate(t.id)}>
                Start from this
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <header className="sb-section-head">
          <h2>Frame layouts</h2>
          <p>
            Precoded, format-agnostic layouts. Slots are placed relative to the safe zone (dashed), so each one adapts to every channel. Shown for <strong>{format.name}</strong>.
          </p>
        </header>
        <div className="sb-card-grid wide">
          {LAYOUTS.map((l) => (
            <div className="sb-card sb-layout-card" key={l.id}>
              <LayoutThumb layout={l} format={format} width={format.width > format.height ? 220 : 130} />
              <div>
                <span className="sb-chip">{l.category}</span>
                <h4>{l.name}</h4>
                <p className="sb-muted sb-small">{l.description}</p>
                <ul className="sb-slot-list">
                  {l.slots.map((s) => (
                    <li key={s.id}>
                      <strong>{s.label}</strong> — {s.accepts.map((t) => getComponent(t)?.name).join(" / ")}
                      {s.optional && <em> (optional)</em>}
                    </li>
                  ))}
                </ul>
                <button type="button" className="sb-btn primary" onClick={() => onAddLayout(l.id)}>
                  + Add as new frame
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <header className="sb-section-head">
          <h2>Components</h2>
          <p>The building blocks layouts are made of. Fields marked “var” become HyperFrames variables you can edit in Studio or override at render time.</p>
        </header>
        {COMPONENT_CATEGORIES.map((cat) => (
          <div key={cat}>
            <h3 className="sb-cat">{cat}</h3>
            <div className="sb-card-grid">
              {COMPONENTS.filter((c) => c.category === cat).map((c) => (
                <div className="sb-card" key={c.type}>
                  <h4>
                    {c.icon} {c.name}
                  </h4>
                  <p className="sb-muted sb-small">{c.description}</p>
                  <p className="sb-small sb-fields">
                    {c.fields.map((f) => (
                      <span key={f.key} className="sb-chip">
                        {f.label}
                        {f.variable ? " · var" : ""}
                      </span>
                    ))}
                  </p>
                  <button type="button" className="sb-btn" disabled={!hasFrame} onClick={() => onAddComponent(c.type)}>
                    + Add to current frame
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section>
        <header className="sb-section-head">
          <h2>Channel formats &amp; safe zones</h2>
          <p>Safe zones follow each platform's published creative guidance. Platforms change their UI — verify against current specs before trafficking paid media.</p>
        </header>
        <div className="sb-card-grid">
          {FORMATS.map((f) => (
            <div className="sb-card sb-format-card" key={f.id}>
              <LayoutThumb layout={{ id: "x", name: "", category: "Blank", description: "", defaultDuration: 0, slots: [] }} format={f} width={f.width > f.height ? 120 : 60} />
              <div>
                <h4>{f.name}</h4>
                <p className="sb-small">
                  {f.width}×{f.height} · {f.aspect}
                  {f.maxDuration ? ` · max ${f.maxDuration}s` : ""}
                </p>
                <p className="sb-muted sb-small">{f.safeZoneNote}</p>
                <p className="sb-small">
                  Clear: top {f.safeZone.top} · right {f.safeZone.right} · bottom {f.safeZone.bottom} · left {f.safeZone.left}px
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
