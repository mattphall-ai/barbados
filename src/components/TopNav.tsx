import type { Screen } from "../types";

const STEPS: { key: Screen; label: string }[] = [
  { key: "intake", label: "1. Intake" },
  { key: "processing", label: "2. Processing" },
  { key: "review", label: "3. Review" },
  { key: "dashboard", label: "4. Dashboard" },
];

export type AppMode = "foundation" | "social";

interface Props {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  current: Screen;
  reachable: Screen[];
  onNavigate: (screen: Screen) => void;
}

export function TopNav({ mode, onModeChange, current, reachable, onNavigate }: Props) {
  return (
    <nav className="top-nav">
      <span className="brand-wordmark">Atomic</span>
      <div className="mode-switch">
        <button type="button" className={mode === "foundation" ? "active" : ""} onClick={() => onModeChange("foundation")}>
          Brand Foundation
        </button>
        <button type="button" className={mode === "social" ? "active" : ""} onClick={() => onModeChange("social")}>
          Social Builder
        </button>
      </div>
      {mode === "foundation" && (
      <div className="top-nav-steps">
        {STEPS.map((step) => {
          const isReachable = reachable.includes(step.key) && step.key !== "processing";
          return (
            <button
              key={step.key}
              type="button"
              disabled={!isReachable}
              className={step.key === current ? "active" : ""}
              onClick={() => isReachable && onNavigate(step.key)}
            >
              {step.label}
            </button>
          );
        })}
      </div>
      )}
    </nav>
  );
}
