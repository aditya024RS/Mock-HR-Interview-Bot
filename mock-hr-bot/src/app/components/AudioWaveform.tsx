"use client";

import React from "react";

interface AudioWaveformProps {
  audioLevel: number; // 0 to 1
  isActive: boolean;
  barCount?: number;
}

export default function AudioWaveform({
  audioLevel,
  isActive,
  barCount = 5,
}: AudioWaveformProps) {
  if (!isActive) return null;

  return (
    <div className="flex items-center gap-[3px] h-8" aria-label="Audio level indicator">
      {Array.from({ length: barCount }).map((_, i) => {
        // Create a wave pattern — center bars are taller
        const distFromCenter = Math.abs(i - Math.floor(barCount / 2));
        const baseScale = 1 - distFromCenter * 0.15;
        const scale = 0.2 + audioLevel * baseScale * 0.8;

        return (
          <div
            key={i}
            className="w-[4px] rounded-full bg-emerald-400 transition-transform duration-75"
            style={{
              height: "100%",
              transform: `scaleY(${scale})`,
              opacity: 0.5 + audioLevel * 0.5,
              animationDelay: `${i * 60}ms`,
            }}
          />
        );
      })}
    </div>
  );
}
