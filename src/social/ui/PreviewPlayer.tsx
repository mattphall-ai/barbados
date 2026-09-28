import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CompiledLayer } from "../compile";
import type { SocialFormat } from "../types";

interface Props {
  html: string;
  format: SocialFormat;
  duration: number;
  frameStarts: number[];
  layers: CompiledLayer[];
  /** Frame currently being edited (-1 = overlays). */
  frameIndex: number;
  selectedLayerId?: string;
  onSelectLayer: (frameIndex: number, layerId: string) => void;
  onOverflow: (ids: string[]) => void;
  /** Bump to jump the playhead to the selected frame. */
  seekToFrame: number;
}

/**
 * Plays the compiled composition in a sandboxed iframe. The iframe carries a
 * small preview shim (see compile.ts) that we drive over postMessage; safe
 * zone guides and layer hit-boxes are drawn here, outside the composition,
 * the same way HyperFrames Studio keeps guides out of the render.
 */
export function PreviewPlayer({ html, format, duration, frameStarts, layers, frameIndex, selectedLayerId, onSelectLayer, onOverflow, seekToFrame }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0.3);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showSafe, setShowSafe] = useState(true);
  const [showBoxes, setShowBoxes] = useState(true);
  const timeRef = useRef(0);
  const playingRef = useRef(false);

  const post = (t: number) => frameRef.current?.contentWindow?.postMessage({ type: "hf-seek", t, playing: playingRef.current }, "*");
  const seek = (t: number) => {
    const clamped = Math.max(0, Math.min(t, Math.max(0, duration - 1 / 30)));
    timeRef.current = clamped;
    setTime(clamped);
    post(clamped);
  };

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setScale(Math.min(r.width / format.width, r.height / format.height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [format.width, format.height]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== frameRef.current?.contentWindow) return;
      if (e.data?.type === "hf-ready") post(timeRef.current);
      if (e.data?.type === "hf-overflow") onOverflow(e.data.ids ?? []);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onOverflow]);

  // Jump to the edited frame, just past its entrances.
  useEffect(() => {
    if (frameIndex < 0 || playingRef.current) return;
    const start = frameStarts[frameIndex] ?? 0;
    seek(start + 1.4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekToFrame]);

  useEffect(() => {
    if (!playing) return;
    playingRef.current = true;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      let t = timeRef.current + (now - last) / 1000;
      last = now;
      if (t >= duration) t = 0;
      seek(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      playingRef.current = false;
      post(timeRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, duration]);

  const sz = format.safeZone;
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const activeFrame = frameStarts.findIndex((s, i) => time >= s && (i === frameStarts.length - 1 || time < frameStarts[i + 1]));
  const visibleLayers = layers.filter((l) => time >= l.start && time < l.start + l.duration && !["background-image", "background-color", "background-video", "scrim"].includes(l.type) || l.layerId === selectedLayerId);

  return (
    <div className="sb-player">
      <div className="sb-stage" ref={stageRef}>
        <div className="sb-canvas" style={{ width: format.width * scale, height: format.height * scale }}>
          <iframe
            ref={frameRef}
            title="Composition preview"
            sandbox="allow-scripts"
            srcDoc={html}
            style={{ width: format.width, height: format.height, transform: `scale(${scale})` }}
          />
          {showSafe && (
            <div className="sb-safe" style={{ left: pct(sz.left, format.width), top: pct(sz.top, format.height), right: pct(sz.right, format.width), bottom: pct(sz.bottom, format.height) }}>
              <span>safe zone</span>
            </div>
          )}
          {showBoxes &&
            visibleLayers
              .filter((l) => time >= l.start && time < l.start + l.duration)
              .map((l) => (
                <button
                  key={l.layerId}
                  type="button"
                  title={l.label}
                  className={`sb-hitbox ${l.layerId === selectedLayerId ? "selected" : ""}`}
                  style={{ left: pct(l.box.x, format.width), top: pct(l.box.y, format.height), width: pct(l.box.w, format.width), height: pct(l.box.h, format.height) }}
                  onClick={() => onSelectLayer(l.frameIndex, l.layerId)}
                >
                  <span>{l.label}</span>
                </button>
              ))}
        </div>
      </div>
      <div className="sb-transport">
        <button type="button" className="sb-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="sb-scrub">
          <input type="range" min={0} max={duration} step={1 / 30} value={time} onChange={(e) => seek(Number(e.target.value))} aria-label="Timeline" />
          <div className="sb-markers">
            {frameStarts.map((s, i) => (
              <button
                type="button"
                key={i}
                className={i === activeFrame ? "active" : ""}
                style={{ left: pct(s, duration || 1), width: pct((frameStarts[i + 1] ?? duration) - s, duration || 1) }}
                onClick={() => seek(s + 0.01)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
        <span className="sb-time">
          {time.toFixed(1)}s / {duration.toFixed(1)}s
        </span>
      </div>
      <div className="sb-toggles">
        <label>
          <input type="checkbox" checked={showSafe} onChange={(e) => setShowSafe(e.target.checked)} /> Safe-zone guide
        </label>
        <label>
          <input type="checkbox" checked={showBoxes} onChange={(e) => setShowBoxes(e.target.checked)} /> Layer boxes (click to edit)
        </label>
        <span className="sb-muted">
          {format.width}×{format.height} · {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  );
}
