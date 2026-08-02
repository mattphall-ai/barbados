import JSZip from "jszip";
import type { BrandFoundation, ExtractedItem, Project } from "../types";
import { buildBrandDesignKit, buildCopyAgentKnowledgeBase } from "./build";

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "brand";
}

function dataUrlToBytes(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { mime, bytes };
}

function extFor(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("svg")) return "svg";
  if (mime.includes("webp")) return "webp";
  return "bin";
}

/**
 * Builds a downloadable .zip package simulating a DAM (Digital Asset
 * Management) export: a manifest describing the two connected systems, plus
 * the approved image assets referenced by them.
 */
export async function downloadDamPackage(project: Project): Promise<void> {
  const zip = new JSZip();
  const copyAgent = buildCopyAgentKnowledgeBase(project);
  const designKit = buildBrandDesignKit(project);

  zip.file("copy-agent-knowledge-base.json", JSON.stringify(copyAgent, null, 2));
  zip.file("brand-design-kit.json", JSON.stringify(designKit, null, 2));

  const assets = zip.folder("assets");
  const foundation = project.foundation as BrandFoundation;
  const imageSections: ExtractedItem<{ name?: string; dataUrl?: string }>[] = [
    ...(foundation.creativeSystem.logos as unknown as ExtractedItem<{ name?: string; dataUrl?: string }>[]),
    ...(foundation.creativeSystem.masterAssets as unknown as ExtractedItem<{ name?: string; dataUrl?: string }>[]),
  ];

  let count = 0;
  for (const item of imageSections) {
    if (item.status !== "approved") continue;
    const dataUrl = item.value.dataUrl;
    if (!dataUrl) continue;
    const decoded = dataUrlToBytes(dataUrl);
    if (!decoded) continue;
    count += 1;
    const filename = `${slug(item.value.name ?? `asset-${count}`)}.${extFor(decoded.mime)}`;
    assets?.file(filename, decoded.bytes);
  }

  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        schema: "atomic-dam-export-manifest@1",
        project: project.name,
        exportedAt: new Date().toISOString(),
        contents: {
          copyAgentKnowledgeBase: "copy-agent-knowledge-base.json",
          brandDesignKit: "brand-design-kit.json",
          assetCount: count,
        },
      },
      null,
      2,
    ),
  );

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(project.name)}-dam-export.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
