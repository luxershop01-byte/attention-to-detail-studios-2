"use client";

import { useScrollFrameProgress } from "@/components/ScrollFrameSequence";

const FADE_IN_END = 0.15;
const FADE_OUT_START = 0.85;

function captionOpacity(progress: number) {
  if (progress <= FADE_IN_END) return progress / FADE_IN_END;
  if (progress >= FADE_OUT_START) {
    return 1 - (progress - FADE_OUT_START) / (1 - FADE_OUT_START);
  }
  return 1;
}

export default function InteriorCaption() {
  const progress = useScrollFrameProgress();

  return (
    <div
      className="interior-caption px-6 text-center text-white"
      style={{ opacity: captionOpacity(progress) }}
    >
      <h2 className="text-3xl font-semibold tracking-tight drop-shadow-md sm:text-5xl">
        Interior detailing
      </h2>
    </div>
  );
}
