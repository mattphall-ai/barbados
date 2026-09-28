import { TEMPLATES, projectFromTemplate } from "./templates";
import type { SocialProject } from "./types";

const STORAGE_KEY = "atomic-social-builder:project:v1";

export function loadSocialProject(): SocialProject {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as SocialProject;
      if (Array.isArray(p.frames) && Array.isArray(p.overlays) && p.brand?.colors) return p;
    }
  } catch {
    // fall through to a fresh project
  }
  return projectFromTemplate(TEMPLATES[0]);
}

/** Returns false when the browser refused the write (usually quota from inline images). */
export function saveSocialProject(project: SocialProject): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    return true;
  } catch (err) {
    console.warn("Could not persist social project to localStorage (likely quota exceeded).", err);
    return false;
  }
}
