// File → data: URL helpers. Assets are inlined because a "Send to
// HyperFrames" composition must be self-contained; large photos are
// downscaled so projects stay small enough to persist and import.

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Read an image, downscaling so its long edge is at most `maxEdge` px. SVG/GIF pass through. */
export async function readImage(file: File, maxEdge = 2160): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  if (/svg|gif/.test(file.type)) return dataUrl;
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  if (scale === 1 && file.size < 1_500_000) return dataUrl;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  // PNG keeps transparency for cut-out product shots and logos.
  return file.type === "image/png" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.86);
}
