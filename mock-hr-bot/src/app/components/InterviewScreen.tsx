"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  SkipForward,
  Square,
  MessageSquare,
} from "lucide-react";
import ChatMessage from "./ChatMessage";
import InterviewTimer from "./InterviewTimer";
import AudioWaveform from "./AudioWaveform";
import TypingIndicator from "./TypingIndicator";

interface Message {
  role: string;
  content: string;
}

interface InterviewScreenProps {
  messages: Message[];
  liveTranscript: string;
  isRecording: boolean;
  isConnected: boolean;
  isSarahThinking: boolean;
  isSarahSpeaking: boolean;
  audioLevel: number;
  sessionStartTime: number | null;
  questionCount: number;
  onToggleRecording: () => void;
  onSkipQuestion: () => void;
  onEndInterview: () => void;
}

export default function InterviewScreen({
  messages,
  liveTranscript,
  isRecording,
  isConnected,
  isSarahThinking,
  isSarahSpeaking,
  audioLevel,
  sessionStartTime,
  questionCount,
  onToggleRecording,
  onSkipQuestion,
  onEndInterview,
}: InterviewScreenProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages (Feature #11)
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveTranscript, isSarahThinking]);

  // Spacebar shortcut to toggle mic (Feature #11)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only toggle if not typing in an input field
      if (
        e.code === "Space" &&
        e.target === document.body &&
        isConnected
      ) {
        e.preventDefault();
        onToggleRecording();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isConnected, onToggleRecording]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center p-6 font-sans">
      {/* Header */}
      <header className="w-full max-w-3xl flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-800 rounded-lg">
            <MessageSquare size={22} className="text-emerald-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">PlaceMate AI Interviewer</h1>
            {questionCount > 0 && (
              <p className="text-xs text-gray-500">Question {questionCount} of ~8</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <InterviewTimer startTime={sessionStartTime} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {isConnected ? "Live" : "Offline"}
            </span>
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  : "bg-red-500"
              }`}
            />
          </div>
        </div>
      </header>

      {/* Chat Log Window */}
      <div
        className="flex-1 w-full max-w-3xl bg-gray-900/50 border border-gray-800/60 rounded-xl p-6 overflow-y-auto mb-6 shadow-xl scroll-smooth"
        role="log"
        aria-live="polite"
        aria-label="Interview conversation"
        style={{ maxHeight: "calc(100vh - 280px)" }}
      >
        {messages.length === 0 && !isSarahThinking ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4 py-20">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <MessageSquare size={28} className="text-emerald-500/50" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-gray-950 animate-pulse" />
              </div>
            </div>
            <p className="text-sm">Connecting to Sarah...</p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <ChatMessage
                key={index}
                role={msg.role}
                content={msg.content}
                index={index}
              />
            ))}

            {/* Live User Transcript Bubble */}
            {isRecording && liveTranscript && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex justify-end"
              >
                <div className="max-w-[80%] rounded-2xl px-5 py-3.5 bg-emerald-600/40 text-white border border-emerald-500/40 border-dashed">
                  <p className="leading-relaxed text-[15px]">
                    {liveTranscript}{" "}
                    <span className="animate-pulse text-emerald-300">●</span>
                  </p>
                </div>
              </motion.div>
            )}

            {/* Sarah is thinking indicator */}
            {isSarahThinking && <TypingIndicator />}
          </>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Controls Container */}
      <div className="w-full max-w-3xl">
        {/* Sarah speaking indicator */}
        {isSarahSpeaking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 mb-3 text-xs text-emerald-400"
          >
            <div className="flex items-center gap-[2px] h-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-[2px] bg-emerald-400 rounded-full animate-pulse"
                  style={{
                    height: `${6 + Math.random() * 6}px`,
                    animationDelay: `${i * 100}ms`,
                  }}
                />
              ))}
            </div>
            Sarah is speaking...
          </motion.div>
        )}

        <div className="flex items-center justify-center gap-4">
          {/* Skip Button */}
          <button
            onClick={onSkipQuestion}
            disabled={!isConnected}
            className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Skip current question"
          >
            <SkipForward size={16} />
            Skip
          </button>

          {/* Mic Button */}
          <button
            onClick={onToggleRecording}
            disabled={!isConnected}
            className={`flex items-center gap-3 px-8 py-4 rounded-full font-semibold transition-all duration-200 shadow-lg ${
              !isConnected
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : isRecording
                  ? "bg-emerald-500 text-gray-950 hover:bg-emerald-400 ring-4 ring-emerald-500/30"
                  : "bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
            }`}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? (
              <>
                <AudioWaveform audioLevel={audioLevel} isActive={true} barCount={5} />
                <span>Recording...</span>
              </>
            ) : (
              <>
                <MicOff size={22} />
                <span>Hold to Speak</span>
              </>
            )}
          </button>

          {/* End Interview Button */}
          <button
            onClick={onEndInterview}
            className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 border border-gray-700 rounded-xl text-sm font-medium transition-all"
            aria-label="End interview"
          >
            <Square size={14} />
            End
          </button>
        </div>

        {/* Keyboard shortcut hint */}
        <p className="text-center text-[11px] text-gray-600 mt-3">
          Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 text-[10px]">Space</kbd> to toggle microphone
        </p>
      </div>
    </div>
  );
}
