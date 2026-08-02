import type { Project } from "../types";

const STORAGE_KEY = "atomic-brand-foundation:project:v1";

export function loadProject(): Project | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Project;
  } catch {
    return null;
  }
}

export function saveProject(project: Project): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch (err) {
    console.warn("Could not persist project to localStorage (likely quota exceeded).", err);
  }
}

export function clearProject(): void {
  localStorage.removeItem(STORAGE_KEY);
}
