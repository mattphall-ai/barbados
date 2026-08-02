import { useEffect, useRef, useState } from "react";
import type { ParsedDocument, Source } from "../types";
import { parsePastedContent, parseSource, UrlFetchError } from "../lib/parsers";
import { buildBrandFoundation } from "../lib/extract";
import type { BrandFoundation } from "../types";

type SourceState = "waiting" | "parsing" | "done" | "error" | "needs-paste";

interface RowState {
  source: Source;
  state: SourceState;
  error?: string;
}

interface Props {
  sources: Source[];
  files: Map<string, File>;
  onComplete: (foundation: BrandFoundation) => void;
}

const STAGES = [
  { key: "parsing", label: "Parsing sources" },
  { key: "knowledge", label: "Extracting brand knowledge" },
  { key: "creative", label: "Extracting creative system" },
  { key: "scoring", label: "Scoring confidence & flagging gaps" },
] as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ProcessingStatus({ sources, files, onComplete }: Props) {
  const [rows, setRows] = useState<RowState[]>(() =>
    sources.map((s) => ({ source: s, state: "waiting" as SourceState })),
  );
  const [stageIndex, setStageIndex] = useState(0);
  const [pasteFor, setPasteFor] = useState<Source | null>(null);
  const [pasteValue, setPasteValue] = useState("");
  const startedRef = useRef(false);
  const pasteResolverRef = useRef<((content: string) => void) | null>(null);

  function setRowState(id: string, state: SourceState, error?: string) {
    setRows((prev) => prev.map((r) => (r.source.id === id ? { ...r, state, error } : r)));
  }

  function waitForPaste(source: Source): Promise<string> {
    setPasteFor(source);
    setPasteValue("");
    return new Promise((resolve) => {
      pasteResolverRef.current = (content: string) => {
        setPasteFor(null);
        resolve(content);
      };
    });
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function run() {
      const docs: ParsedDocument[] = [];

      for (const row of sources) {
        setRowState(row.id, "parsing");
        try {
          const file = files.get(row.id);
          const doc = await parseSource(row, file);
          docs.push(doc);
          setRowState(row.id, "done");
        } catch (err) {
          if (err instanceof UrlFetchError) {
            setRowState(row.id, "needs-paste", err.message);
            const pasted = await waitForPaste(row);
            const looksLikeHtml = /<html|<div|<body/i.test(pasted);
            docs.push(parsePastedContent(row, pasted, looksLikeHtml));
            setRowState(row.id, "done");
          } else {
            const message = err instanceof Error ? err.message : String(err);
            setRowState(row.id, "error", message);
          }
        }
        await sleep(200);
      }

      setStageIndex(1);
      await sleep(500);
      setStageIndex(2);
      await sleep(500);
      setStageIndex(3);
      const foundation = buildBrandFoundation(docs);
      await sleep(400);
      onComplete(foundation);
    }

    run();
  }, []);

  return (
    <div className="screen processing-screen">
      <header className="screen-header">
        <h1>Analyzing your brand assets…</h1>
        <p>Nothing is invented here — every result traces back to something in your sources.</p>
      </header>

      <ol className="stage-list">
        {STAGES.map((stage, idx) => (
          <li
            key={stage.key}
            className={
              idx < stageIndex ? "stage-done" : idx === stageIndex ? "stage-active" : "stage-pending"
            }
          >
            <span className="stage-marker" />
            {stage.label}
          </li>
        ))}
      </ol>

      <ul className="source-progress-list">
        {rows.map((row) => (
          <li key={row.source.id} className={`source-row state-${row.state}`}>
            <span className="source-row-icon">
              {row.state === "done" && "✓"}
              {row.state === "parsing" && "…"}
              {row.state === "waiting" && "○"}
              {row.state === "error" && "!"}
              {row.state === "needs-paste" && "⚠"}
            </span>
            <span className="source-row-label">{row.source.label}</span>
            {row.state === "error" && <span className="source-row-error">{row.error}</span>}
          </li>
        ))}
      </ul>

      {pasteFor && (
        <div className="modal-overlay">
          <div className="modal cors-modal">
            <h3>Couldn't fetch "{pasteFor.label}" directly</h3>
            <p>
              Browsers block direct cross-origin reads of most third-party websites. Paste the
              page's HTML (View Source) or just its visible text below to continue analyzing it —
              nothing will be fabricated in place of this content.
            </p>
            <textarea
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              placeholder="Paste HTML or page text here…"
              rows={10}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-action"
                onClick={() => pasteResolverRef.current?.("")}
              >
                Skip this source
              </button>
              <button
                type="button"
                className="primary-action"
                disabled={!pasteValue.trim()}
                onClick={() => pasteResolverRef.current?.(pasteValue)}
              >
                Continue analyzing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
