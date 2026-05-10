"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface InterviewTimerProps {
  startTime: number | null; // timestamp in ms
}

export default function InterviewTimer({ startTime }: InterviewTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  if (!startTime) return null;

  return (
    <div className="flex items-center gap-2 text-gray-400 text-sm font-mono">
      <Clock size={14} className="text-emerald-500/70" />
      <span>{display}</span>
    </div>
  );
}
