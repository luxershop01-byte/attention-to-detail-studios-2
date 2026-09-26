"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type Panel = {
  heading: string;
  slug: string;
  description: string;
};

const PANELS: Panel[] = [
  {
    heading: "Precision",
    slug: "precision",
    description:
      "Every vehicle is assessed individually before a single product touches the surface.",
  },
  {
    heading: "Craft",
    slug: "craft",
    description:
      "Correction, protection and finishing are carried out by hand, with the same care regardless of make or model.",
  },
  {
    heading: "Result",
    slug: "result",
    description:
      "A finish that looks considered, not just clean — built to last beyond a single wash.",
  },
];

function imageSrc(panel: Panel) {
  return `/images/approach/${panel.slug}.jpg`;
}

export default function ApproachPanels() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageAvailable, setImageAvailable] = useState<boolean[]>(() =>
    PANELS.map(() => false)
  );

  useEffect(() => {
    let ticking = false;

    const update = () => {
      ticking = false;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const scrollableDistance = rect.height - window.innerHeight;
      const progress =
        scrollableDistance > 0
          ? Math.min(1, Math.max(0, -rect.top / scrollableDistance))
          : 0;

      const index = Math.min(
        PANELS.length - 1,
        Math.floor(progress * PANELS.length)
      );
      setActiveIndex(index);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Probe each panel image once; only swap from placeholder to <img> after
  // it's confirmed to load, so a missing file never flashes a broken icon.
  useEffect(() => {
    let cancelled = false;
    PANELS.forEach((panel, index) => {
      const img = new window.Image();
      img.onload = () => {
        if (cancelled) return;
        setImageAvailable((prev) => {
          if (prev[index]) return prev;
          const next = [...prev];
          next[index] = true;
          return next;
        });
      };
      img.src = imageSrc(panel);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="scroll-height relative w-full"
      style={{ "--scroll-vh": PANELS.length * 100 } as CSSProperties}
    >
      <div className="h-viewport sticky top-0 w-full overflow-hidden bg-black">
        {PANELS.map((panel, index) => (
          <div
            key={panel.heading}
            className="absolute inset-0 transition-opacity duration-[600ms] ease-out"
            style={{ opacity: index === activeIndex ? 1 : 0 }}
          >
            {imageAvailable[index] ? (
              <div className="relative h-full w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc(panel)}
                  alt={panel.heading}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="max-w-xl px-6 text-center text-white">
                    <h3 className="text-4xl font-medium tracking-tight drop-shadow-md sm:text-5xl">
                      {panel.heading}
                    </h3>
                    <p className="mt-4 text-base text-neutral-200 drop-shadow-md">
                      {panel.description}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-neutral-900">
                <div className="max-w-xl px-6 text-center text-white">
                  <h3 className="text-4xl font-medium tracking-tight sm:text-5xl">
                    {panel.heading}
                  </h3>
                  <p className="mt-4 text-base text-neutral-300">
                    {panel.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
