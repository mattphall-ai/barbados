import { useState } from "react";
import type { SourceRef } from "../types";

export function SourceLinks({ sources }: { sources: SourceRef[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (sources.length === 0) {
    return <p className="source-links empty">No source reference</p>;
  }

  return (
    <div className="source-links">
      {sources.map((s, idx) => (
        <div key={idx} className="source-link">
          <button
            type="button"
            className="source-link-toggle"
            onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
          >
            📄 {s.label}
          </button>
          {openIdx === idx && s.snippet && (
            <blockquote className="source-snippet">“{s.snippet}”</blockquote>
          )}
        </div>
      ))}
    </div>
  );
}
