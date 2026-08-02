import { useRef, useState } from "react";
import type { Source } from "../types";

interface Props {
  sources: Source[];
  onAddFiles: (files: File[]) => void;
  onAddUrl: (url: string) => void;
  onRemoveSource: (id: string) => void;
  onAnalyze: () => void;
}

export function IntakePortal({ sources, onAddFiles, onAddUrl, onRemoveSource, onAnalyze }: Props) {
  const [urlValue, setUrlValue] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    onAddFiles(Array.from(list));
  }

  function submitUrl(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = urlValue.trim();
    if (!trimmed) return;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    onAddUrl(withProtocol);
    setUrlValue("");
  }

  return (
    <div className="screen intake-screen">
      <header className="screen-header">
        <h1>Atomic Brand Foundation Builder</h1>
        <p>
          Upload a master brand asset — a website, IVA, campaign presentation, or PDF — and this
          tool will extract the structured brand knowledge and creative system Atomic needs to
          generate on-brand content.
        </p>
      </header>

      <section
        className={`dropzone ${dragOver ? "drag-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          accept=".pdf,.docx,.pptx,.html,.htm,.txt,.md,image/*"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="dropzone-title">Drop files here or click to browse</p>
        <p className="dropzone-hint">PDF, DOCX, PPTX, HTML, TXT/MD, or logo/screenshot images</p>
      </section>

      <form className="url-intake" onSubmit={submitUrl}>
        <input
          type="text"
          placeholder="Or enter a website URL (e.g. brand.com)"
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
        />
        <button type="submit">Add URL</button>
      </form>

      {sources.length > 0 && (
        <section className="source-list">
          <h2>Sources ({sources.length})</h2>
          <ul>
            {sources.map((s) => (
              <li key={s.id}>
                <span className="source-kind">{s.kind === "url" ? "🔗" : "📄"}</span>
                <span className="source-label">{s.label}</span>
                <button
                  type="button"
                  className="remove-source"
                  onClick={() => onRemoveSource(s.id)}
                  aria-label={`Remove ${s.label}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="intake-actions">
        <button
          type="button"
          className="primary-action"
          disabled={sources.length === 0}
          onClick={onAnalyze}
        >
          Analyze {sources.length > 0 ? `${sources.length} source${sources.length > 1 ? "s" : ""}` : ""}
        </button>
      </div>

      <p className="intake-disclaimer">
        This tool never invents claims, references, safety language, or brand requirements.
        Anything it can't find in your source material will be clearly flagged for human review
        rather than guessed.
      </p>
    </div>
  );
}
