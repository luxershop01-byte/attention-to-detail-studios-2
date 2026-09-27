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

/** A decoded frame ready for drawImage — ImageBitmap where supported, HTMLImageElement as fallback. */
type DecodedFrame = ImageBitmap | HTMLImageElement;

const ScrollProgressContext = createContext(0);

export function useScrollFrameProgress() {
  return useContext(ScrollProgressContext);
}

// How many frames on each side of the current position to load immediately
// (not idle-deferred) once a scene starts loading.
const PRIORITY_WINDOW = 8;

function frameUrl(pattern: string, oneBasedIndex: number) {
  return pattern.replace(/%0(\d)d/, (_match, widthStr: string) =>
    String(oneBasedIndex).padStart(Number(widthStr), "0")
  );
}

function frameDims(frame: DecodedFrame) {
  return frame instanceof HTMLImageElement
    ? { w: frame.naturalWidth, h: frame.naturalHeight }
    : { w: frame.width, h: frame.height };
}

// Decode off the main thread via createImageBitmap when available — much
// cheaper for repeated canvas drawImage() calls than relying on an <img>'s
// implicit decode. Falls back to Image().decode() where unsupported.
async function loadFrame(url: string): Promise<DecodedFrame> {
  if (typeof createImageBitmap === "function") {
    const response = await fetch(url);
    const blob = await response.blob();
    return createImageBitmap(blob);
  }
  const img = new window.Image();
  img.src = url;
  await img.decode();
  return img;
}

const requestIdle: (cb: () => void) => number =
  typeof window !== "undefined" && "requestIdleCallback" in window
    ? (cb) => window.requestIdleCallback(cb)
    : (cb) => window.setTimeout(cb, 1);

const cancelIdle: (handle: number) => void =
  typeof window !== "undefined" && "cancelIdleCallback" in window
    ? (handle) => window.cancelIdleCallback(handle)
    : (handle) => window.clearTimeout(handle);

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
  const framesRef = useRef<(DecodedFrame | undefined)[]>([]);
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
    const frame = framesRef.current[index];
    const ctx = canvas?.getContext("2d");
    const { width: cw, height: ch } = dimsRef.current;
    if (!canvas || !ctx || !frame) return;
    if (cw === 0 || ch === 0) return;

    const { w: fw, h: fh } = frameDims(frame);
    if (!fw || !fh) return;

    const canvasRatio = cw / ch;
    const imgRatio = fw / fh;

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
    ctx.drawImage(frame, offsetX, offsetY, drawWidth, drawHeight);
  };

  // Load the active frame set (mobile-lite or desktop-full), gated on the
  // section actually being near the viewport so off-screen scenes don't
  // compete for bandwidth with the one the user is currently scrolling
  // through. Once triggered, the frame nearest the current scroll position
  // loads first, then a small window around it, then the rest backfills in
  // the background via requestIdleCallback so it never blocks anything more
  // urgent. Re-runs if isFallback flips (e.g. resizing across the 640px
  // line), reloading the other set.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let idleHandle: number | null = null;
    framesRef.current = new Array(activeFrameCount);
    currentFrameRef.current = -1;

    const estimateCurrentIndex = () => {
      const rect = container.getBoundingClientRect();
      const scrollableDistance = rect.height - window.innerHeight;
      const p =
        scrollableDistance > 0
          ? Math.min(1, Math.max(0, -rect.top / scrollableDistance))
          : 0;
      return Math.round(p * (activeFrameCount - 1));
    };

    const loadOne = async (index: number) => {
      if (cancelled || framesRef.current[index]) return;
      try {
        const frame = await loadFrame(frameUrl(activeFramePath, index + 1));
        if (cancelled) return;
        framesRef.current[index] = frame;
        if (index === currentFrameRef.current) drawFrame(index);
      } catch {
        // A single frame failing to load shouldn't break the sequence.
      }
    };

    const backfill = (queue: number[]) => {
      if (cancelled || queue.length === 0) return;
      idleHandle = requestIdle(() => {
        const next = queue.shift();
        if (next !== undefined) {
          loadOne(next).finally(() => backfill(queue));
        }
      });
    };

    const start = async () => {
      const centerIndex = Math.max(
        0,
        Math.min(activeFrameCount - 1, estimateCurrentIndex())
      );
      const windowStart = Math.max(0, centerIndex - PRIORITY_WINDOW);
      const windowEnd = Math.min(
        activeFrameCount - 1,
        centerIndex + PRIORITY_WINDOW
      );

      const priorityIndices: number[] = [];
      for (let i = windowStart; i <= windowEnd; i++) priorityIndices.push(i);

      await Promise.all(priorityIndices.map(loadOne));
      if (cancelled) return;
      setIsReady(true);

      const remaining = Array.from(
        { length: activeFrameCount },
        (_, i) => i
      )
        .filter((i) => i < windowStart || i > windowEnd)
        .sort((a, b) => Math.abs(a - centerIndex) - Math.abs(b - centerIndex));

      backfill(remaining);
    };

    let observer: IntersectionObserver | null = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          observer?.disconnect();
          observer = null;
          start();
        }
      },
      { rootMargin: "50% 0px" }
    );
    observer.observe(container);

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (idleHandle !== null) cancelIdle(idleHandle);
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
      if (ctx) {
        // Resizing the canvas resets all context state, so re-apply both
        // the DPR transform and smoothing settings every time. "medium"
        // is a deliberate middle ground — "high" costs real time per draw
        // on every scroll-driven redraw, and at these frame sizes the
        // visual difference from "medium" is negligible.
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "medium";
      }

      const idx = Math.max(0, currentFrameRef.current);
      drawFrame(idx);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [aspectRatio]);

  // rAF-throttled scroll progress -> frame index. Only redraws when the
  // resolved index actually changes, never on every scroll event/rAF tick.
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
