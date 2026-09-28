// Compiles a SocialProject into a single, self-contained HyperFrames
// composition (index.html).
//
// Contract followed (hyperframes-core + the "Send to HyperFrames" import guide):
// - one live root: data-composition-id="main", numeric data-width/-height/-duration
// - each frame is a timed `.clip.scene` section; frames tile end to end
// - one paused GSAP timeline, built synchronously, registered at window.__timelines["main"]
// - timed <video> never nested in another timed element (emitted at the root)
// - no clocks, randomness or infinite repeats; every tween ends inside its clip
// - fonts/images inline as data: URIs; runtime + GSAP from the jsDelivr CDN
// - every editable text field is a HyperFrames variable (data-var-text / data-var-src)

import gsapSource from "gsap/dist/gsap.min.js?raw";
import { colorVar, esc, getComponent, type RenderCtx, type VariableDecl } from "./components";
import { fontFaces, fontFamily } from "./brand";
import { getFormat, resolveBox, typeScale } from "./formats";
import type { Box, Layer, SocialProject } from "./types";

export const GSAP_CDN = "https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js";
export const HF_RUNTIME_CDN = "https://cdn.jsdelivr.net/npm/@hyperframes/core/dist/hyperframe.runtime.iife.js";

export interface CompiledLayer {
  /** Frame index, or -1 for project overlays. */
  frameIndex: number;
  layerId: string;
  domId: string;
  label: string;
  type: string;
  box: Box;
  start: number;
  duration: number;
}

export interface Compiled {
  html: string;
  duration: number;
  width: number;
  height: number;
  frameStarts: number[];
  layers: CompiledLayer[];
  variables: VariableDecl[];
}

export type CompileMode = "export" | "preview";

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "layer";
}

export function totalDuration(project: SocialProject): number {
  return round(project.frames.reduce((sum, f) => sum + f.duration, 0));
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

interface Unit {
  key: string;
  title: string;
  start: number;
  dur: number;
  zBase: number;
  track: number;
  rootHtml: string[];
  sections: string[];
  js: string[];
  variables: VariableDecl[];
}

/**
 * Render one timed clip (a frame, or the overlay track) into markup + timeline
 * code. `start` is the clip's time on whichever timeline will own the code:
 * absolute for the single-file export, 0 inside a sub-composition.
 */
function renderUnit(
  project: SocialProject,
  opts: { key: string; title: string; layers: Layer[]; start: number; dur: number; frameIndex: number; zBase: number; track: number },
  absStart: number,
  layersOut: CompiledLayer[],
): Unit {
  const format = getFormat(project.formatId);
  const s = typeScale(format);
  const unit: Unit = { key: opts.key, title: opts.title, start: absStart, dur: opts.dur, zBase: opts.zBase, track: opts.track, rootHtml: [], sections: [], js: [], variables: [] };
  const usedDom = new Set<string>();
  const usedVarIds = new Set<string>();
  const below: string[] = [];
  const above: string[] = [];
  let sawVideo = false;
  opts.layers.forEach((layer, i) => {
    if (!layer.enabled) return;
    const def = getComponent(layer.type);
    if (!def) return;
    let domId = `${opts.key}-${slug(layer.slotId ?? layer.type)}`;
    while (usedDom.has(domId)) domId += "-" + i;
    usedDom.add(domId);
    const box = resolveBox(layer.placement, format, project.enforceSafeZone);
    const varBase = domId.replace(/-/g, "_");
    const labelBase = `${opts.title} · ${layer.label}`;
    const register = (key: string, label: string, value: string) => {
      let id = `${varBase}_${key.replace(/[^a-zA-Z0-9]/g, "_")}`;
      while (usedVarIds.has(id)) id += "_";
      usedVarIds.add(id);
      unit.variables.push({ id, type: "string", label: `${labelBase} · ${label}`, default: value });
      return id;
    };
    const ctx: RenderCtx = {
      id: domId,
      label: labelBase,
      props: layer.props,
      box,
      format,
      s,
      start: opts.start,
      duration: opts.dur,
      brand: project.brand,
      bindText: (key, label, value) => `data-var-text="${register(key, label, value)}"`,
      // Inline (data:) images are too heavy to duplicate into the variable
      // table; only URL images become swappable variables.
      bindSrc: (key, label, value) => (value && !value.startsWith("data:") ? `data-var-src="${register(key, label, value)}"` : ""),
    };
    const out = def.render(ctx);
    layersOut.push({ frameIndex: opts.frameIndex, layerId: layer.id, domId, label: layer.label, type: layer.type, box, start: absStart, duration: opts.dur });
    if (out.rootHtml) {
      sawVideo = true;
      unit.rootHtml.push(out.rootHtml.replace("z-index: 0;", `z-index: ${opts.zBase + 1};`));
    }
    if (out.html) {
      const el = `    <div class="layer" id="${domId}" data-sb-layer="${layer.id}" style="left: ${box.x}px; top: ${box.y}px; width: ${box.w}px; height: ${box.h}px; z-index: ${i + 1}; ${out.wrapperStyle ?? ""}">${out.html}</div>`;
      (sawVideo ? above : below).push(el);
    }
    if (out.js) unit.js.push(`// ${labelBase}\n${out.js}`);
  });
  // A timed <video> can't be nested in another timed element, so it sits at
  // the root; layers stacked under it go in an underlay clip so the footage
  // lands between them and the rest of the frame.
  const main = sawVideo ? above : below;
  if (sawVideo && below.length) {
    unit.sections.push(
      `  <section id="${opts.key}-under" class="clip scene" data-start="${opts.start}" data-duration="${opts.dur}" data-track-index="${opts.track + 4}" style="z-index: ${opts.zBase};">\n${below.join("\n")}\n  </section>`,
    );
  }
  unit.sections.push(
    `  <section id="${opts.key}-scene" class="clip scene" data-start="${opts.start}" data-duration="${opts.dur}" data-track-index="${opts.track}" style="z-index: ${opts.zBase + 2};">\n${main.join("\n")}\n  </section>`,
  );
  return unit;
}

function unitSpecs(project: SocialProject) {
  const specs: { key: string; title: string; layers: Layer[]; start: number; dur: number; frameIndex: number; zBase: number; track: number }[] = [];
  let t = 0;
  project.frames.forEach((frame, i) => {
    specs.push({ key: `f${i + 1}`, title: `Frame ${i + 1}`, layers: frame.layers, start: round(t), dur: round(frame.duration), frameIndex: i, zBase: 0, track: 0 });
    t += frame.duration;
  });
  const total = totalDuration(project);
  if (project.overlays.some((l) => l.enabled) && total > 0) {
    specs.push({ key: "overlay", title: "Overlay", layers: project.overlays, start: 0, dur: total, frameIndex: -1, zBase: 10, track: 1 });
  }
  return specs;
}

function brandVariables(project: SocialProject): VariableDecl[] {
  return Object.entries(project.brand.colors).map(([role, hex]) => ({ id: `brand_${role}`, type: "color" as const, label: `Brand · ${role}`, default: hex }));
}

function baseCss(project: SocialProject): string {
  const brand = project.brand;
  const cssVars = [
    ...Object.entries(brand.colors).map(([role, hex]) => `--brand_${role}: ${hex};`),
    `--font_display: ${fontFamily(brand.display)};`,
    `--font_body: ${fontFamily(brand.body)};`,
    `--radius: ${brand.cornerRadius}px;`,
  ].join(" ");
  return `${fontFaces(brand)}
    :root { ${cssVars} }
    * { box-sizing: border-box; }
    .scene { position: absolute; inset: 0; width: 100%; height: 100%; }
    .layer { position: absolute; }
    h1, p, blockquote, ul { margin: 0; }`;
}

function indent(code: string[]): string {
  return code.join("\n").replace(/^/gm, "  ");
}

/** Single self-contained composition (Send to HyperFrames / CLI render). */
export function compileProject(project: SocialProject, mode: CompileMode = "export"): Compiled {
  const format = getFormat(project.formatId);
  const duration = totalDuration(project);
  const layersOut: CompiledLayer[] = [];
  const units = unitSpecs(project).map((spec) => renderUnit(project, spec, spec.start, layersOut));
  const variables = [...brandVariables(project), ...units.flatMap((u) => u.variables)];
  const frameStarts = units.filter((u) => u.key !== "overlay").map((u) => u.start);

  const W = format.width;
  const H = format.height;
  const head =
    mode === "export"
      ? `  <script src="${GSAP_CDN}"></script>\n  <script src="${HF_RUNTIME_CDN}"></script>`
      : `  <script>${gsapSource}</script>\n  <script>${previewShim(duration)}</script>`;

  const html = `<!doctype html>
<html lang="en" data-composition-variables="${esc(JSON.stringify(variables))}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${W}, height=${H}" />
  <title>${esc(project.name)}</title>
  <!-- Built with the Atomic Social Media Builder · ${esc(format.name)} ${W}x${H} · ${duration}s -->
${head}
  <style>
    ${baseCss(project)}
    html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: ${colorVar("background")}; }
    #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: ${colorVar("background")}; font-family: var(--font_body); -webkit-font-smoothing: antialiased; }
  </style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-width="${W}" data-height="${H}" data-duration="${duration}" data-fps="${project.fps}">
${units.flatMap((u) => u.rootHtml.map((h) => "  " + h)).join("\n")}
${units.flatMap((u) => u.sections).join("\n")}
</div>
<script>
  window.__timelines = window.__timelines || {};
  var tl = gsap.timeline({ paused: true });
${indent(units.flatMap((u) => u.js))}
  window.__timelines["main"] = tl;
</script>
</body>
</html>
`;

  return { html, duration, width: W, height: H, frameStarts, layers: layersOut, variables };
}

/**
 * Modular HyperFrames Studio project: index.html mounts one sub-composition
 * per frame (plus the overlay track), so each frame is its own editable row
 * in Studio's timeline. Returns a map of file path → contents.
 */
export function compileStudioProject(project: SocialProject): Record<string, string> {
  const format = getFormat(project.formatId);
  const W = format.width;
  const H = format.height;
  const duration = totalDuration(project);
  const files: Record<string, string> = {};
  const hosts: string[] = [];
  for (const spec of unitSpecs(project)) {
    const unit = renderUnit(project, { ...spec, start: 0 }, spec.start, []);
    const id = unit.key;
    files[`compositions/${id}.html`] = `<!doctype html>
<html lang="en" data-composition-variables="${esc(JSON.stringify(unit.variables))}">
<head>
  <meta charset="UTF-8" />
  <title>${esc(unit.title)}</title>
</head>
<body>
<template id="${id}-template">
  <style>
    ${baseCss(project)}
    #${id}-root { position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; font-family: var(--font_body); }
  </style>
  <div id="${id}-root" data-composition-id="${id}" data-start="0" data-width="${W}" data-height="${H}" data-duration="${unit.dur}">
${unit.rootHtml.map((h) => "  " + h).join("\n")}
${unit.sections.join("\n")}
  </div>
  <script>
    (function () {
      var tl = gsap.timeline({ paused: true });
${unit.js.join("\n").replace(/^/gm, "      ")}
      window.__timelines["${id}"] = tl;
    })();
  </script>
</template>
</body>
</html>
`;
    hosts.push(
      `  <div id="${id}" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${spec.start}" data-duration="${spec.dur}" data-track-index="${spec.track}" data-width="${W}" data-height="${H}" style="z-index: ${spec.zBase + 1};"></div>`,
    );
  }
  files["index.html"] = `<!doctype html>
<html lang="en" data-composition-variables="${esc(JSON.stringify(brandVariables(project)))}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${W}, height=${H}" />
  <title>${esc(project.name)}</title>
  <script src="${GSAP_CDN}"></script>
  <style>
    ${baseCss(project)}
    html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: ${colorVar("background")}; }
    #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: ${colorVar("background")}; }
  </style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-width="${W}" data-height="${H}" data-duration="${duration}" data-fps="${project.fps}">
${hosts.join("\n")}
</div>
<script>
  window.__timelines["main"] = gsap.timeline({ paused: true });
</script>
</body>
</html>
`;
  return files;
}

/**
 * Preview-only stand-in for the HyperFrames runtime: shows/hides timed clips
 * by their data-start/data-duration window and seeks the registered timeline.
 * The parent page drives it over postMessage. Never shipped in exports.
 */
function previewShim(duration: number): string {
  return `window.__timelines = {};
(function () {
  var clips = null;
  function seek(t, playing) {
    if (!clips) clips = Array.prototype.slice.call(document.querySelectorAll("[data-start]")).filter(function (el) { return !el.hasAttribute("data-composition-id"); });
    clips.forEach(function (el) {
      var s = +el.getAttribute("data-start"), d = +el.getAttribute("data-duration");
      var on = t >= s && t < s + d;
      el.style.visibility = on ? "" : "hidden";
      if (el.tagName === "VIDEO") {
        var target = t - s + (+el.getAttribute("data-media-start") || 0);
        if (on && playing) { if (el.paused) el.play().catch(function () {}); if (Math.abs(el.currentTime - target) > 0.3) el.currentTime = target; }
        else { if (!el.paused) el.pause(); if (on && Math.abs(el.currentTime - target) > 0.04) el.currentTime = target; }
      }
    });
    var tl = window.__timelines.main;
    if (tl) tl.seek(Math.min(t, ${duration}), false);
  }
  function overflow() {
    var ids = [];
    // Layout offsets, not scrollHeight: GSAP "from" transforms on elements
    // that haven't entered yet would otherwise read as overflow.
    document.querySelectorAll("[data-fit]").forEach(function (el) {
      var over = Array.prototype.some.call(el.children, function (c) {
        return c.offsetTop < -2 || c.offsetTop + c.offsetHeight > el.clientHeight + 2 || c.offsetLeft < -2 || c.offsetLeft + c.offsetWidth > el.clientWidth + 2 || c.scrollWidth > c.clientWidth + 2;
      });
      if (over) {
        var layer = el.closest("[data-sb-layer]");
        if (layer) ids.push(layer.getAttribute("data-sb-layer"));
      }
    });
    parent.postMessage({ type: "hf-overflow", ids: ids }, "*");
  }
  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "hf-seek") seek(e.data.t, e.data.playing);
  });
  window.addEventListener("load", function () {
    seek(0, false);
    overflow();
    parent.postMessage({ type: "hf-ready" }, "*");
  });
})();`;
}
