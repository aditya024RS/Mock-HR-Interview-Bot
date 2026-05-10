"use client";

import React from "react";

export default function TypingIndicator() {
  return (
    <div className="mb-4 flex justify-start">
      <div className="bg-gray-800/80 border border-gray-700/60 rounded-2xl px-5 py-3.5">
        <p className="text-[11px] text-emerald-400 font-semibold mb-1.5 tracking-wider uppercase">
          Sarah (HR)
        </p>
        <div className="flex items-center gap-1.5">
          <span className="typing-dot w-2 h-2 rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
          <span className="typing-dot w-2 h-2 rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
          <span className="typing-dot w-2 h-2 rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
