import type { Confidence, ReviewStatus } from "../types";

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return <span className={`badge confidence-${confidence}`}>{confidence} confidence</span>;
}

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "Needs review",
  approved: "Approved",
  flagged: "Flagged",
  rejected: "Rejected",
};

export function StatusBadge({ status }: { status: ReviewStatus }) {
  return <span className={`badge status-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function OriginBadge({ aiGenerated, missing }: { aiGenerated: boolean; missing: boolean }) {
  if (missing) {
    return <span className="badge origin-missing">Not found — needs input</span>;
  }
  return aiGenerated ? (
    <span className="badge origin-ai">AI-generated recommendation</span>
  ) : (
    <span className="badge origin-source">From approved source</span>
  );
}
