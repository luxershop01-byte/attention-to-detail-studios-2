"use client";

import { useEffect, useRef, useState } from "react";

type Service = {
  category: string;
  name: string;
  slug: string;
  description: string;
};

const SERVICES: Service[] = [
  {
    category: "Exterior",
    name: "Paint Correction",
    slug: "paint-correction",
    description:
      "Swirl marks, light scratches and oxidation are carefully removed by hand, restoring depth and clarity to the paint without altering its original character.",
  },
  {
    category: "Protection",
    name: "Ceramic Coating",
    slug: "ceramic-coating",
    description:
      "A durable ceramic layer is applied to guard the finish against UV, road grime and everyday wear, keeping the paint sharp long after it leaves the bay.",
  },
  {
    category: "Interior",
    name: "Interior Deep Clean",
    slug: "interior-deep-clean",
    description:
      "Every surface, stitch and vent is cleaned and conditioned by hand, turning the cabin back into a space that feels as considered as the day it was new.",
  },
  {
    category: "Protection",
    name: "PPF Wrap",
    slug: "ppf-wrap",
    description:
      "Paint protection film is fitted with precision across high-impact panels, preserving the factory finish while staying nearly invisible to the eye.",
  },
  {
    category: "Mechanical",
    name: "Engine Bay Detail",
    slug: "engine-bay",
    description:
      "The engine bay is degreased, cleaned and dressed with the same care as the exterior, so what's under the hood matches what's on top.",
  },
  {
    category: "Exterior",
    name: "Window Tinting",
    slug: "window-tinting",
    description:
      "Tint is applied for privacy, heat rejection and a cleaner exterior profile, fitted precisely to each panel with no bubbling or edge lift.",
  },
];

function imageSrc(service: Service) {
  return `/images/services/${service.slug}.jpg`;
}

export default function ServicesList() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [supportsHover, setSupportsHover] = useState(true);
  const [imageAvailable, setImageAvailable] = useState<boolean[]>(() =>
    SERVICES.map(() => false)
  );
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Desktop hover vs. mobile auto-cycle-on-scroll.
  useEffect(() => {
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setSupportsHover(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  // Probe each service image once; only swap a row from placeholder to <img>
  // after it's confirmed to load, so a missing file never flashes a broken icon.
  useEffect(() => {
    let cancelled = false;
    SERVICES.forEach((service, index) => {
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
      img.src = imageSrc(service);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Mobile: whichever row crosses the center band becomes active.
  useEffect(() => {
    if (supportsHover) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = rowRefs.current.findIndex((el) => el === entry.target);
          if (index !== -1) setActiveIndex(index);
        });
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
    );
    rowRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [supportsHover]);

  return (
    <section
      id="services"
      className="scroll-mt-24 bg-black py-24 text-white sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        <p className="max-w-xl text-sm text-neutral-400">
          Every detail is treated with intent, from exterior correction to
          interior refinement and full protective finishes.
        </p>
        <h2 className="mt-4 text-4xl font-medium tracking-tight sm:text-5xl">
          Services
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-20">
          <div className="relative order-first aspect-[4/5] w-full self-start overflow-hidden rounded-sm bg-neutral-900 lg:sticky lg:top-24 lg:order-none">
            {SERVICES.map((service, index) => (
              <div
                key={service.slug}
                className="absolute inset-0 transition-opacity duration-[400ms] ease-out"
                style={{ opacity: index === activeIndex ? 1 : 0 }}
              >
                {imageAvailable[index] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageSrc(service)}
                    alt={service.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-neutral-900 px-6">
                    <span className="text-center text-lg text-neutral-500">
                      {service.name}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="order-last lg:order-none">
            {SERVICES.map((service, index) => (
              <div
                key={service.slug}
                ref={(el) => {
                  rowRefs.current[index] = el;
                }}
                onMouseEnter={
                  supportsHover ? () => setActiveIndex(index) : undefined
                }
                className="border-b border-white/10 py-8 first:border-t"
              >
                <p className="text-xs text-neutral-500">{service.category}</p>
                <h3 className="mt-2 text-3xl font-medium tracking-tight">
                  {service.name}
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-400">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
