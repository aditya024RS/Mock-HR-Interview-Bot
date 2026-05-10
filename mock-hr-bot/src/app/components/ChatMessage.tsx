"use client";

import React from "react";
import { motion } from "framer-motion";

interface ChatMessageProps {
  role: string;
  content: string;
  index: number;
}

export default function ChatMessage({ role, content, index }: ChatMessageProps) {
  const isUser = role === "user";
  // Strip any asterisk-wrapped text (e.g., **Thinking**) from assistant messages
  const cleanContent = content.replace(/\*\*.*?\*\*/g, "").trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`mb-4 flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-5 py-3.5 ${
          isUser
            ? "bg-emerald-600 text-white"
            : "bg-gray-800/80 text-gray-200 border border-gray-700/60"
        }`}
      >
        {!isUser && (
          <p className="text-[11px] text-emerald-400 font-semibold mb-1 tracking-wider uppercase">
            Sarah (HR)
          </p>
        )}
        <p className="leading-relaxed text-[15px]">{cleanContent}</p>
      </div>
    </motion.div>
  );
}
