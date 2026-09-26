"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type ScrollFrameSequenceProps = {
  /** Frame URL pattern with a printf-style index placeholder, e.g. "/frames/hero/frame_%04d.webp" */
  framePath: string;
  frameCount: number;
  /** Lighter frame set for narrow viewports / reduced-motion, same pattern shape as framePath. */
  mobileFramePath: string;
  mobileFrameCount: number;
  /** width / height */
  aspectRatio: number;
  children?: ReactNode;
  /** Height of the scrollable (pinned) region, in vh units. Default 300. */
  scrollVh?: number;
};

const ScrollProgressContext = createContext(0);

export function useScrollFrameProgress() {
  return useContext(ScrollProgressContext);
}

const PRELOAD_RATIO = 0.2;

function frameUrl(pattern: string, oneBasedIndex: number) {
  return pattern.replace(/%0(\d)d/, (_match, widthStr: string) =>
    String(oneBasedIndex).padStart(Number(widthStr), "0")
  );
}

function prefersFallback() {
  if (typeof window === "undefined") return false;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  return reducedMotion || window.innerWidth < 640;
}

export default function ScrollFrameSequence({
  framePath,
  frameCount,
  mobileFramePath,
  mobileFrameCount,
  aspectRatio,
  children,
  scrollVh = 300,
}: ScrollFrameSequenceProps) {
  // Default to the mobile-safe (lighter) frame set until the client confirms
  // otherwise. Defaulting to the desktop set would make SSR always emit the
  // heavy payload for every device, then swap out from under hydration.
  const [isFallback, setIsFallback] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(-1);
  const dimsRef = useRef({ width: 0, height: 0 });

  const activeFramePath = isFallback ? mobileFramePath : framePath;
  const activeFrameCount = isFallback ? mobileFrameCount : frameCount;

  // Decide which frame set to load, and keep it in sync with viewport/motion changes.
  useEffect(() => {
    const update = () => setIsFallback(prefersFallback());
    update();
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    mql.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mql.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const drawFrame = (index: number) => {
    const canvas = canvasRef.current;
    const img = imagesRef.current[index];
    const ctx = canvas?.getContext("2d");
    const { width: cw, height: ch } = dimsRef.current;
    if (!canvas || !ctx || !img || !img.complete || !img.naturalWidth) return;
    if (cw === 0 || ch === 0) return;

    const canvasRatio = cw / ch;
    const imgRatio = img.naturalWidth / img.naturalHeight;

    let drawWidth: number;
    let drawHeight: number;
    if (imgRatio > canvasRatio) {
      drawHeight = ch;
      drawWidth = drawHeight * imgRatio;
    } else {
      drawWidth = cw;
      drawHeight = drawWidth / imgRatio;
    }
    const offsetX = (cw - drawWidth) / 2;
    const offsetY = (ch - drawHeight) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  };

  // Preload the active frame set (mobile-lite or desktop-full). Re-runs if
  // isFallback flips (e.g. resizing across the 640px line), reloading the
  // other set and resetting draw state so indices aren't read against a
  // stale image array mid-switch.
  useEffect(() => {
    let cancelled = false;
    currentFrameRef.current = -1;

    const bufferTarget = Math.max(1, Math.ceil(activeFrameCount * PRELOAD_RATIO));
    let loadedCount = 0;
    let readyFired = false;

    const images: HTMLImageElement[] = new Array(activeFrameCount);
    for (let i = 0; i < activeFrameCount; i++) {
      const img = new window.Image();
      img.onload = () => {
        if (cancelled) return;
        loadedCount += 1;
        if (!readyFired && loadedCount >= bufferTarget) {
          readyFired = true;
          setIsReady(true);
        }
        if (i === currentFrameRef.current) drawFrame(i);
      };
      img.src = frameUrl(activeFramePath, i + 1);
      images[i] = img;
    }
    imagesRef.current = images;

    return () => {
      cancelled = true;
    };
  }, [activeFramePath, activeFrameCount]);

  // Size the canvas to the sticky viewport, preserving aspectRatio with cover behavior.
  useEffect(() => {
    const canvas = canvasRef.current;
    const sticky = stickyRef.current;
    if (!canvas || !sticky) return;

    const resize = () => {
      const rect = sticky.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      dimsRef.current = { width, height };
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);

      const idx = Math.max(0, currentFrameRef.current);
      drawFrame(idx);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [aspectRatio]);

  // rAF-throttled scroll progress -> frame index. Same logic drives both the
  // mobile-lite and desktop-full sets; only activeFrameCount differs.
  useEffect(() => {
    let ticking = false;

    const update = () => {
      ticking = false;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const scrollableDistance = rect.height - window.innerHeight;
      const p =
        scrollableDistance > 0
          ? Math.min(1, Math.max(0, -rect.top / scrollableDistance))
          : 0;

      setProgress(p);

      const index = Math.floor(p * (activeFrameCount - 1));
      if (index !== currentFrameRef.current) {
        currentFrameRef.current = index;
        drawFrame(index);
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [activeFrameCount]);

  return (
    <ScrollProgressContext.Provider value={progress}>
      <div
        ref={containerRef}
        className="scroll-height relative w-full"
        style={{ "--scroll-vh": scrollVh } as CSSProperties}
      >
        <div
          ref={stickyRef}
          className="h-viewport sticky top-0 w-full overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            {children}
          </div>
        </div>
      </div>
    </ScrollProgressContext.Provider>
  );
}
