import { useEffect, useState } from "react";
import { makeId } from "../lib/id";
import { clearProject, loadProject, saveProject } from "../storage/project";
import type { BrandFoundation, Project, Screen, Source } from "../types";

function newProject(): Project {
  const now = Date.now();
  return {
    id: makeId("project"),
    name: "Untitled Brand Foundation",
    createdAt: now,
    updatedAt: now,
    screen: "intake",
    sources: [],
    foundation: null,
  };
}

export function useProject() {
  const [project, setProject] = useState<Project>(() => loadProject() ?? newProject());

  useEffect(() => {
    saveProject(project);
  }, [project]);

  function update(patch: Partial<Project>) {
    setProject((p) => ({ ...p, ...patch, updatedAt: Date.now() }));
  }

  return {
    project,
    setScreen: (screen: Screen) => update({ screen }),
    setSources: (sources: Source[]) => update({ sources }),
    setFoundation: (foundation: BrandFoundation) => update({ foundation }),
    setName: (name: string) => update({ name }),
    reset: () => {
      clearProject();
      setProject(newProject());
    },
  };
}
