// Preflight: everything worth fixing before a composition goes to
// HyperFrames. Checks run on the project model; text overflow comes from the
// live preview, which measures the real layout.

import { getComponent } from "./components";
import { getFormat, resolveBox, typeScale, violatesSafeZone } from "./formats";
import { totalDuration } from "./compile";
import type { Layer, SocialProject } from "./types";

export type Severity = "error" | "warning" | "info";

export interface Finding {
  severity: Severity;
  message: string;
  /** Frame index, -1 for overlays, undefined for project-level. */
  frameIndex?: number;
  layerId?: string;
}

const BACKGROUND_TYPES = new Set(["background-image", "background-video", "background-color", "scrim"]);

export function runPreflight(project: SocialProject, overflowIds: string[] = []): Finding[] {
  const out: Finding[] = [];
  const format = getFormat(project.formatId);
  const s = typeScale(format);
  const total = totalDuration(project);

  if (project.frames.length === 0) out.push({ severity: "error", message: "Add at least one frame." });
  if (format.maxDuration && total > format.maxDuration)
    out.push({ severity: "warning", message: `Total length ${total}s is over ${format.name}'s ${format.maxDuration}s limit.` });
  if (!project.enforceSafeZone)
    out.push({ severity: "warning", message: `Safe zone is off — content may sit under ${format.platform} UI. Turn it on before trafficking.` });

  const check = (layer: Layer, frameIndex: number) => {
    if (!layer.enabled) return;
    const def = getComponent(layer.type);
    if (!def) {
      out.push({ severity: "error", frameIndex, layerId: layer.id, message: `Unknown component "${layer.type}".` });
      return;
    }
    const where = { frameIndex, layerId: layer.id };
    const name = layer.label;

    if (overflowIds.includes(layer.id))
      out.push({ severity: "error", ...where, message: `${name}: text overflows its box — shorten the copy, reduce the size, or enlarge the slot.` });

    if (!BACKGROUND_TYPES.has(layer.type) && violatesSafeZone(resolveBox(layer.placement, format, project.enforceSafeZone), format))
      out.push({ severity: "warning", ...where, message: `${name} extends outside the ${format.name} safe zone.` });

    for (const f of def.fields) {
      const v = layer.props[f.key];
      if ((f.type === "text" || f.type === "textarea") && f.standIn !== false && f.default && v === f.default)
        out.push({ severity: "warning", ...where, message: `${name}: "${f.label}" still has the stand-in copy.` });
    }
    if ((layer.type === "background-image" || layer.type === "product-image") && !layer.props.image)
      out.push({ severity: "warning", ...where, message: `${name}: no image yet — a brand-color placeholder will render.` });
    if (layer.type === "background-video") {
      const src = String(layer.props.src ?? "");
      if (!src) out.push({ severity: "warning", ...where, message: `${name}: no video yet — a solid fill will render.` });
      else if (src.startsWith("data:") && src.length > 8_000_000)
        out.push({ severity: "warning", ...where, message: `${name}: the inlined video is large; host it at a public HTTPS URL instead so the import stays under HyperFrames' size cap.` });
      else if (!src.startsWith("data:") && !/^https:\/\//.test(src))
        out.push({ severity: "error", ...where, message: `${name}: video must be an uploaded file or a public https:// URL.` });
    }
    const size = Number(layer.props.size);
    if ((layer.type === "footnote" || layer.type === "isi") && Number.isFinite(size) && size * s < 18)
      out.push({ severity: "info", ...where, message: `${name}: ${Math.round(size * s)}px text may be hard to read on a phone.` });
  };

  project.frames.forEach((frame, i) => {
    frame.layers.forEach((l) => check(l, i));
    if (frame.duration < 1.5) out.push({ severity: "warning", frameIndex: i, message: `${frame.name}: ${frame.duration}s is too short to read.` });
  });
  project.overlays.forEach((l) => check(l, -1));

  const brand = project.brand;
  if (!brand.logoDataUrl && [...project.frames.flatMap((f) => f.layers), ...project.overlays].some((l) => l.enabled && l.type === "logo" && !l.props.image))
    out.push({ severity: "info", message: "No logo in the brand kit — logo slots render the brand name as a wordmark." });
  for (const [label, font] of [["Display", brand.display], ["Body", brand.body]] as const) {
    if (!font.dataUrl) out.push({ severity: "info", message: `${label} font is a system stack. Upload the brand font file to embed it (HyperFrames needs fonts inlined for brand-accurate renders).` });
  }
  return out;
}
