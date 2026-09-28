import type { Box, Placement, SocialFormat } from "./types";

// Safe zones are the regions platform UI (profile row, captions, like/share
// rail, CTA bar) sits on top of. Values are taken from each platform's
// published creative guidance where it exists and are deliberately a little
// conservative; platforms revise their UI, so verify against current specs
// before trafficking paid media.
export const FORMATS: SocialFormat[] = [
  {
    id: "ig-reels",
    platform: "Instagram",
    name: "Instagram Reels",
    width: 1080,
    height: 1920,
    aspect: "9:16",
    safeZone: { top: 250, right: 65, bottom: 670, left: 65 },
    safeZoneNote: "Meta guidance: keep ~14% top, ~35% bottom and ~6% sides free of text and logos (profile, caption, action rail).",
    recommendedDuration: 15,
    maxDuration: 90,
  },
  {
    id: "ig-story",
    platform: "Instagram",
    name: "Instagram / Facebook Stories",
    width: 1080,
    height: 1920,
    aspect: "9:16",
    safeZone: { top: 250, right: 40, bottom: 340, left: 40 },
    safeZoneNote: "Meta guidance: keep ~14% at the top (profile, progress bar) and the bottom reply/CTA area clear.",
    recommendedDuration: 15,
    maxDuration: 60,
  },
  {
    id: "ig-feed-portrait",
    platform: "Instagram",
    name: "Instagram / Facebook Feed 4:5",
    width: 1080,
    height: 1350,
    aspect: "4:5",
    safeZone: { top: 60, right: 60, bottom: 60, left: 60 },
    safeZoneNote: "No UI overlays the feed video; a 60px margin keeps content off the crop edge in grid previews.",
    recommendedDuration: 15,
    maxDuration: 60,
  },
  {
    id: "square",
    platform: "Multi",
    name: "Feed Square 1:1",
    width: 1080,
    height: 1080,
    aspect: "1:1",
    safeZone: { top: 60, right: 60, bottom: 60, left: 60 },
    safeZoneNote: "Instagram, Facebook and LinkedIn feed. 60px margin for crop tolerance.",
    recommendedDuration: 15,
    maxDuration: 60,
  },
  {
    id: "tiktok",
    platform: "TikTok",
    name: "TikTok In-Feed",
    width: 1080,
    height: 1920,
    aspect: "9:16",
    safeZone: { top: 160, right: 140, bottom: 480, left: 60 },
    safeZoneNote: "Keeps clear of the top tabs, the right-side like/comment/share rail and the bottom caption + CTA.",
    recommendedDuration: 15,
    maxDuration: 60,
  },
  {
    id: "yt-shorts",
    platform: "YouTube",
    name: "YouTube Shorts",
    width: 1080,
    height: 1920,
    aspect: "9:16",
    safeZone: { top: 240, right: 190, bottom: 420, left: 60 },
    safeZoneNote: "Avoids the Shorts header, the right action rail and the channel/title block at the bottom.",
    recommendedDuration: 15,
    maxDuration: 60,
  },
  {
    id: "landscape",
    platform: "Multi",
    name: "Landscape 16:9",
    width: 1920,
    height: 1080,
    aspect: "16:9",
    safeZone: { top: 108, right: 192, bottom: 108, left: 192 },
    safeZoneNote: "YouTube, LinkedIn, X. Title-safe box (80% of frame), matching HyperFrames Studio's guide.",
    recommendedDuration: 15,
  },
];

export function getFormat(id: string): SocialFormat {
  return FORMATS.find((f) => f.id === id) ?? FORMATS[0];
}

/** Resolve a percent placement to a pixel box on the format's canvas. */
export function resolveBox(placement: Placement, format: SocialFormat, enforceSafeZone: boolean): Box {
  const sz = format.safeZone;
  const ref =
    placement.ref === "frame" || !enforceSafeZone
      ? { x: 0, y: 0, w: format.width, h: format.height }
      : {
          x: sz.left,
          y: sz.top,
          w: format.width - sz.left - sz.right,
          h: format.height - sz.top - sz.bottom,
        };
  const r = placement.rect;
  return {
    x: Math.round(ref.x + (r.x / 100) * ref.w),
    y: Math.round(ref.y + (r.y / 100) * ref.h),
    w: Math.round((r.w / 100) * ref.w),
    h: Math.round((r.h / 100) * ref.h),
  };
}

/** True when a pixel box pokes into the platform UI area. */
export function violatesSafeZone(box: Box, format: SocialFormat): boolean {
  const sz = format.safeZone;
  return (
    box.x < sz.left - 1 ||
    box.y < sz.top - 1 ||
    box.x + box.w > format.width - sz.right + 1 ||
    box.y + box.h > format.height - sz.bottom + 1
  );
}

/** Type scale factor: component sizes are authored against a 1080px short edge. */
export function typeScale(format: SocialFormat): number {
  return Math.min(format.width, format.height) / 1080;
}
