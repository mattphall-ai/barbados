import { useRef, useState } from "react";
import "./index.css";
import { useProject } from "./hooks/useProject";
import { makeId } from "./lib/id";
import type { BrandFoundation, Screen, Source } from "./types";
import { TopNav, type AppMode } from "./components/TopNav";
import { SocialBuilder } from "./social/ui/SocialBuilder";
import { IntakePortal } from "./components/IntakePortal";
import { ProcessingStatus } from "./components/ProcessingStatus";
import { ReviewInterface } from "./components/ReviewInterface";
import { Dashboard } from "./components/Dashboard";

const MODE_KEY = "atomic:app-mode";

export default function App() {
  const { project, setScreen, setSources, setFoundation, reset } = useProject();
  const filesRef = useRef<Map<string, File>>(new Map());
  const [mode, setMode] = useState<AppMode>(() => {
    try {
      return localStorage.getItem(MODE_KEY) === "social" ? "social" : "foundation";
    } catch {
      return "foundation";
    }
  });

  function changeMode(next: AppMode) {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // per-viewer convenience only
    }
  }

  function addFiles(files: File[]) {
    const newSources: Source[] = files.map((file) => {
      const id = makeId("src");
      filesRef.current.set(id, file);
      return {
        id,
        kind: "file",
        label: file.name,
        fileName: file.name,
        fileType: file.type,
        addedAt: Date.now(),
      };
    });
    setSources([...project.sources, ...newSources]);
  }

  function addUrl(url: string) {
    const source: Source = {
      id: makeId("src"),
      kind: "url",
      label: url,
      url,
      addedAt: Date.now(),
    };
    setSources([...project.sources, source]);
  }

  function removeSource(id: string) {
    filesRef.current.delete(id);
    setSources(project.sources.filter((s) => s.id !== id));
  }

  function handleAnalysisComplete(foundation: BrandFoundation) {
    setFoundation(foundation);
    setScreen("review");
  }

  function startNew() {
    filesRef.current.clear();
    reset();
  }

  const reachable: Screen[] = ["intake"];
  if (project.sources.length > 0) reachable.push("processing");
  if (project.foundation) reachable.push("review", "dashboard");

  return (
    <div className="app">
      <TopNav mode={mode} onModeChange={changeMode} current={project.screen} reachable={reachable} onNavigate={setScreen} />

      {mode === "social" && <SocialBuilder />}

      {mode === "foundation" && project.screen === "intake" && (
        <IntakePortal
          sources={project.sources}
          onAddFiles={addFiles}
          onAddUrl={addUrl}
          onRemoveSource={removeSource}
          onAnalyze={() => setScreen("processing")}
        />
      )}

      {mode === "foundation" && project.screen === "processing" && (
        <ProcessingStatus
          sources={project.sources}
          files={filesRef.current}
          onComplete={handleAnalysisComplete}
        />
      )}

      {mode === "foundation" && project.screen === "review" && project.foundation && (
        <ReviewInterface
          foundation={project.foundation}
          onUpdate={setFoundation}
          onContinue={() => setScreen("dashboard")}
        />
      )}

      {mode === "foundation" && project.screen === "dashboard" && project.foundation && (
        <Dashboard project={project} onBackToReview={() => setScreen("review")} onStartNew={startNew} />
      )}
    </div>
  );
}
