import { useState } from "react";
import type { ExtractedItem, ReviewStatus } from "../types";
import { ConfidenceBadge, OriginBadge, StatusBadge } from "./badges";
import { SourceLinks } from "./SourceLinks";

export interface FieldConfig {
  key: string;
  label: string;
  multiline?: boolean;
  options?: string[];
}

interface Props {
  item: ExtractedItem<Record<string, unknown>>;
  fields: FieldConfig[];
  onChangeValue: (value: Record<string, unknown>) => void;
  onChangeStatus: (status: ReviewStatus) => void;
  onDelete: () => void;
  imagePreview?: string;
  colorSwatch?: string;
}

export function ReviewItemCard({
  item,
  fields,
  onChangeValue,
  onChangeStatus,
  onDelete,
  imagePreview,
  colorSwatch,
}: Props) {
  const [editing, setEditing] = useState(item.missing);
  const [draft, setDraft] = useState<Record<string, unknown>>(item.value);

  function save() {
    onChangeValue(draft);
    setEditing(false);
    if (item.status === "pending") onChangeStatus("pending");
  }

  return (
    <div className={`review-card status-border-${item.status} ${item.missing ? "is-missing" : ""}`}>
      <div className="review-card-badges">
        <StatusBadge status={item.status} />
        <OriginBadge aiGenerated={item.aiGenerated} missing={item.missing} />
        {!item.missing && <ConfidenceBadge confidence={item.confidence} />}
      </div>

      {colorSwatch && <div className="color-swatch" style={{ background: colorSwatch }} />}
      {imagePreview && <img className="asset-thumb" src={imagePreview} alt="" />}

      {editing ? (
        <div className="review-card-form">
          {fields.map((f) => (
            <label key={f.key} className="field">
              <span>{f.label}</span>
              {f.options ? (
                <select
                  value={String(draft[f.key] ?? "")}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                >
                  {f.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : f.multiline ? (
                <textarea
                  rows={3}
                  value={String(draft[f.key] ?? "")}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                />
              ) : (
                <input
                  type="text"
                  value={String(draft[f.key] ?? "")}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                />
              )}
            </label>
          ))}
          <div className="review-card-actions">
            <button type="button" className="primary-action" onClick={save}>
              Save
            </button>
            {!item.missing && (
              <button type="button" className="secondary-action" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="review-card-body">
          {fields.map((f) => {
            const val = item.value[f.key];
            if (!val) return null;
            return (
              <p key={f.key} className="review-field">
                <span className="review-field-label">{f.label}: </span>
                {String(val)}
              </p>
            );
          })}
        </div>
      )}

      {item.note && <p className="review-note">Note: {item.note}</p>}

      {!item.missing && <SourceLinks sources={item.sources} />}

      <div className="review-card-footer">
        {!editing && (
          <button type="button" onClick={() => { setDraft(item.value); setEditing(true); }}>
            Edit
          </button>
        )}
        <button
          type="button"
          className={item.status === "approved" ? "active-approve" : ""}
          onClick={() => onChangeStatus("approved")}
        >
          Approve
        </button>
        <button
          type="button"
          className={item.status === "flagged" ? "active-flag" : ""}
          onClick={() => onChangeStatus("flagged")}
        >
          Flag
        </button>
        <button
          type="button"
          className={item.status === "rejected" ? "active-reject" : ""}
          onClick={() => onChangeStatus("rejected")}
        >
          Reject
        </button>
        <button type="button" className="delete-action" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
