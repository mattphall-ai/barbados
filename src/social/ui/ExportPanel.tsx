import { useMemo, useRef, useState } from "react";
import { compileProject } from "../compile";
import { composeBrief, downloadBlob, downloadProjectJson, downloadSingleHtml, downloadStudioZip, readProjectJson, slugify, variablesFile } from "../exporters";
import type { Finding } from "../preflight";
import type { SocialProject } from "../types";

interface Props {
  project: SocialProject;
  findings: Finding[];
  onOpenProject: (p: SocialProject) => void;
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="sb-btn"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

export function ExportPanel({ project, findings, onOpenProject }: Props) {
  const openRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const brief = useMemo(() => composeBrief(project), [project]);
  const compiled = useMemo(() => compileProject(project, "export"), [project]);
  const slug = slugify(project.name);
  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;

  return (
    <div className="sb-export">
      <header className="sb-section-head">
        <h2>Send to HyperFrames</h2>
        <p>
          Every export is a valid <a href="https://hyperframes.heygen.com" target="_blank" rel="noreferrer">HyperFrames</a> composition: a paused GSAP timeline on{" "}
          <code>window.__timelines["main"]</code>, timed <code>.clip</code> frames, inline assets, and every piece of copy exposed as a HyperFrames variable.
        </p>
      </header>

      <div className={`sb-preflight-summary ${errors ? "bad" : warnings ? "warn" : "ok"}`}>
        {errors ? `${errors} error(s) and ${warnings} warning(s) — fix errors before sending.` : warnings ? `Ready, with ${warnings} warning(s) to review.` : "Preflight clean — ready to send."}{" "}
        <span className="sb-muted">
          {compiled.duration}s · {compiled.width}×{compiled.height} · {compiled.variables.length} variables
        </span>
      </div>

      <div className="sb-card-grid wide">
        <div className="sb-card">
          <h4>① Single-file composition</h4>
          <p className="sb-small">
            One self-contained <code>index.html</code> — the “Send to HyperFrames” import shape. Drop it in a folder and run <code>npx hyperframes preview</code> or <code>render</code>, or hand it to
            a HyperFrames-enabled agent.
          </p>
          <div className="sb-row">
            <button type="button" className="sb-btn primary" disabled={errors > 0} onClick={() => downloadSingleHtml(project)}>
              Download {slug}.html
            </button>
            <CopyButton text={compiled.html} label="Copy HTML" />
          </div>
        </div>

        <div className="sb-card">
          <h4>② HyperFrames Studio project (.zip)</h4>
          <p className="sb-small">
            A project laid out like <code>hyperframes init</code>: each frame is its own sub-composition, so it gets its own row in Studio's timeline. Lints clean.
          </p>
          <pre className="sb-code">{`unzip ${slug}-hyperframes.zip && cd ${slug}
npx hyperframes preview        # edit in Studio
npx hyperframes render         # MP4 locally
npx hyperframes cloud render   # render on HeyGen's cloud
npx hyperframes publish        # shareable link`}</pre>
          <button type="button" className="sb-btn primary" disabled={errors > 0} onClick={() => downloadStudioZip(project)}>
            Download Studio project
          </button>
        </div>

        <div className="sb-card">
          <h4>③ Hosted HeyGen HyperFrames (chat / MCP)</h4>
          <p className="sb-small">
            HeyGen's hosted HyperFrames builds projects from a description (the <code>compose</code> tool / Magic Edit chat). Paste this brief to recreate this video as a hosted project with a
            shareable canvas and cloud render queue.
          </p>
          <textarea className="sb-brief" readOnly value={brief} rows={10} />
          <CopyButton text={brief} label="Copy brief" />
        </div>

        <div className="sb-card">
          <h4>④ Render-time variables</h4>
          <p className="sb-small">
            Swap copy or brand colors per render without touching the HTML — useful for versioning one layout across markets or audiences.
          </p>
          <pre className="sb-code">{`npx hyperframes render --variables-file variables.json`}</pre>
          <button type="button" className="sb-btn" onClick={() => downloadBlob("variables.json", JSON.stringify(variablesFile(project), null, 2), "application/json")}>
            Download variables.json
          </button>
        </div>

        <div className="sb-card">
          <h4>Builder project</h4>
          <p className="sb-small">Save this video's frames, layers and brand kit as JSON to share or reopen later.</p>
          <div className="sb-row">
            <button type="button" className="sb-btn" onClick={() => downloadProjectJson(project)}>
              Save project
            </button>
            <button type="button" className="sb-btn" onClick={() => openRef.current?.click()}>
              Open project…
            </button>
          </div>
          <input
            ref={openRef}
            type="file"
            hidden
            accept=".json,application/json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                onOpenProject(await readProjectJson(f));
                setError(null);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not read that file.");
              }
            }}
          />
          {error && <p className="sb-error sb-small">{error}</p>}
        </div>
      </div>
    </div>
  );
}
