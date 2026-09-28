import { useState } from "react";
import { FONT_STACKS, themeFromFoundation } from "../brand";
import { readAsDataUrl, readImage } from "../media";
import type { BrandTheme, FontSpec } from "../types";

interface Props {
  brand: BrandTheme;
  onChange: (brand: BrandTheme) => void;
}

const ROLES: [keyof BrandTheme["colors"], string][] = [
  ["primary", "Primary"],
  ["secondary", "Secondary"],
  ["accent", "Accent"],
  ["background", "Background"],
  ["text", "Text"],
];

function FontEditor({ label, font, onChange }: { label: string; font: FontSpec; onChange: (f: FontSpec) => void }) {
  return (
    <div className="sb-card">
      <h4>{label} font</h4>
      <label className="sb-field">
        <span>Fallback stack</span>
        <select value={font.stack} onChange={(e) => onChange({ ...font, stack: e.target.value })}>
          {FONT_STACKS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="sb-field">
        <span>Embedded brand font (.woff2 / .woff / .ttf / .otf)</span>
        <input
          type="file"
          accept=".woff2,.woff,.ttf,.otf,font/*"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const family = f.name.replace(/\.[^.]+$/, "").replace(/[-_](Regular|Bold|Variable|VF|Medium|Light|Black|Heavy|Book).*$/i, "");
            onChange({ ...font, family, dataUrl: await readAsDataUrl(f) });
          }}
        />
      </label>
      {font.dataUrl && (
        <div className="sb-row">
          <label className="sb-field" style={{ flex: 1 }}>
            <span>Family name</span>
            <input value={font.family ?? ""} onChange={(e) => onChange({ ...font, family: e.target.value.replace(/"/g, "") })} />
          </label>
          <button type="button" className="sb-btn" onClick={() => onChange({ stack: font.stack, weight: font.weight })}>
            Remove
          </button>
        </div>
      )}
      <p className="sb-muted sb-small">
        HyperFrames renders fonts only when they're inlined in the composition — a linked web font falls back to a system face. Uploaded fonts are embedded as data: URIs.
      </p>
    </div>
  );
}

export function BrandPanel({ brand, onChange }: Props) {
  const [report, setReport] = useState<string[] | null>(null);
  const set = (patch: Partial<BrandTheme>) => onChange({ ...brand, ...patch });

  return (
    <div className="sb-brand">
      <header className="sb-section-head">
        <h2>Brand kit</h2>
        <p>Every component reads colors, fonts and the logo from here. Pull the approved Brand Design Kit from the Brand Foundation Builder, or set it by hand.</p>
      </header>
      <div className="sb-row">
        <button
          type="button"
          className="sb-btn primary"
          onClick={() => {
            const res = themeFromFoundation(brand);
            if (!res) {
              setReport(["No Brand Foundation found yet — build one in the Brand Foundation tab first."]);
              return;
            }
            onChange(res.theme);
            setReport(res.applied.length ? res.applied : ["The foundation has no approved colors or logos yet — approve items in its Review step first."]);
          }}
        >
          Pull from Brand Foundation
        </button>
      </div>
      {report && (
        <ul className="sb-report">
          {report.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}

      <div className="sb-card-grid">
        <div className="sb-card">
          <h4>Identity</h4>
          <label className="sb-field">
            <span>Brand name (used for wordmark fallback)</span>
            <input value={brand.name} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <label className="sb-field">
            <span>Logo</span>
            {brand.logoDataUrl && <img className="sb-logo-preview" src={brand.logoDataUrl} alt="Logo" />}
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) set({ logoDataUrl: await readImage(f, 1200) });
              }}
            />
          </label>
          {brand.logoDataUrl && (
            <button type="button" className="sb-btn" onClick={() => set({ logoDataUrl: undefined })}>
              Remove logo
            </button>
          )}
          <label className="sb-field">
            <span>Button corner radius (px, 999 = pill)</span>
            <input type="number" min={0} max={999} value={brand.cornerRadius} onChange={(e) => set({ cornerRadius: Number(e.target.value) })} />
          </label>
        </div>

        <div className="sb-card">
          <h4>Colors</h4>
          {ROLES.map(([role, label]) => (
            <label className="sb-field sb-color-row" key={role}>
              <span>{label}</span>
              <input type="color" value={brand.colors[role]} onChange={(e) => set({ colors: { ...brand.colors, [role]: e.target.value } })} />
              <input
                type="text"
                value={brand.colors[role]}
                onChange={(e) => /^#[0-9a-fA-F]{6}$/.test(e.target.value) && set({ colors: { ...brand.colors, [role]: e.target.value } })}
              />
            </label>
          ))}
        </div>

        <FontEditor label="Display" font={brand.display} onChange={(display) => set({ display })} />
        <FontEditor label="Body" font={brand.body} onChange={(body) => set({ body })} />
      </div>
    </div>
  );
}
