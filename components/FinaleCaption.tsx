"use client";

import { useScrollFrameProgress } from "@/components/ScrollFrameSequence";

const FADE_IN_START = 0.85;

function captionOpacity(progress: number) {
  if (progress <= FADE_IN_START) return 0;
  return (progress - FADE_IN_START) / (1 - FADE_IN_START);
}

export default function FinaleCaption() {
  const progress = useScrollFrameProgress();

  return (
    <div
      className="finale-caption px-6 text-center text-white"
      style={{ opacity: captionOpacity(progress) }}
    >
      <h2 className="text-4xl font-semibold tracking-tight drop-shadow-md sm:text-6xl">
        Refuse Ordinary — ATD Studios
      </h2>
    </div>
  );
}
