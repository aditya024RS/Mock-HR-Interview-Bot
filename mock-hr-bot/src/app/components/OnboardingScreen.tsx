"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle,
  ChevronRight,
  History,
  Shuffle,
  Shield,
  MessageSquare,
  Lightbulb,
} from "lucide-react";

interface OnboardingScreenProps {
  themes: string[];
  selectedTheme: string;
  onThemeSelect: (theme: string) => void;
  onStartInterview: () => void;
  onOpenHistory: () => void;
  hasHistory: boolean;
}

export default function OnboardingScreen({
  themes,
  selectedTheme,
  onThemeSelect,
  onStartInterview,
  onOpenHistory,
  hasHistory,
}: OnboardingScreenProps) {
  const [micStatus, setMicStatus] = useState<"idle" | "testing" | "granted" | "denied">("idle");
  const [micLevel, setMicLevel] = useState(0);
  const micCleanupRef = React.useRef<(() => void) | null>(null);

  const testMicrophone = async () => {
    setMicStatus("testing");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let animFrame: number;

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setMicLevel(average / 128);
        animFrame = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // Store cleanup for when component unmounts or user proceeds
      micCleanupRef.current = () => {
        cancelAnimationFrame(animFrame);
        stream.getTracks().forEach((t) => t.stop());
        audioContext.close();
      };

      setMicStatus("granted");
    } catch {
      setMicStatus("denied");
    }
  };

  useEffect(() => {
    return () => {
      micCleanupRef.current?.();
    };
  }, []);

  const handleStart = () => {
    micCleanupRef.current?.();
    onStartInterview();
  };

  const steps = [
    { icon: <Mic size={20} />, title: "Connect", desc: "Grant mic access to speak with Sarah" },
    { icon: <MessageSquare size={20} />, title: "Interview", desc: "Answer behavioral questions in real-time" },
    { icon: <Sparkles size={20} />, title: "Get Feedback", desc: "Receive a detailed scorecard & tips" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center gap-3 mb-4"
          >
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              <Shield size={32} className="text-emerald-400" />
            </div>
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome to PlaceMate</h1>
          <p className="text-gray-400 text-lg">
            Practice behavioral interviews with Sarah, your AI interviewer.
          </p>
        </div>

        {/* How it Works */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 text-center"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3 text-emerald-400">
                {step.icon}
              </div>
              <p className="font-semibold text-sm mb-1">{step.title}</p>
              <p className="text-xs text-gray-500">{step.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* STAR Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-amber-400" />
            <p className="text-sm font-semibold text-amber-400">Pro Tip: Use the STAR Method</p>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { letter: "S", word: "Situation", tip: "Set the scene" },
              { letter: "T", word: "Task", tip: "Your responsibility" },
              { letter: "A", word: "Action", tip: "What you did" },
              { letter: "R", word: "Result", tip: "The outcome" },
            ].map((item) => (
              <div key={item.letter} className="text-center">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-sm flex items-center justify-center mx-auto mb-1">
                  {item.letter}
                </div>
                <p className="text-xs text-gray-300 font-medium">{item.word}</p>
                <p className="text-[10px] text-gray-500">{item.tip}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Theme Selector */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mb-8"
        >
          <p className="text-sm font-semibold text-gray-300 mb-3">Choose a focus topic</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onThemeSelect("random")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                selectedTheme === "random"
                  ? "bg-emerald-500 text-gray-950"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
              }`}
            >
              <Shuffle size={12} />
              Surprise me
            </button>
            {themes.map((theme) => (
              <button
                key={theme}
                onClick={() => onThemeSelect(theme)}
                className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                  selectedTheme === theme
                    ? "bg-emerald-500 text-gray-950"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
                }`}
              >
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Mic Test */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mb-8"
        >
          {micStatus === "idle" && (
            <button
              onClick={testMicrophone}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm font-medium transition-all"
            >
              <Mic size={16} />
              Test Your Microphone
            </button>
          )}
          {micStatus === "testing" && (
            <div className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-400">
              <div className="animate-spin w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full" />
              Requesting microphone access...
            </div>
          )}
          {micStatus === "granted" && (
            <div className="w-full flex items-center justify-between px-5 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle size={16} />
                Microphone connected
              </div>
              {/* Mini waveform preview */}
              <div className="flex items-center gap-[2px] h-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-full bg-emerald-400 transition-transform duration-75"
                    style={{
                      height: "100%",
                      transform: `scaleY(${0.2 + micLevel * (1 - Math.abs(i - 2) * 0.2) * 0.8})`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          {micStatus === "denied" && (
            <div className="w-full flex items-center gap-2 px-5 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
              <MicOff size={16} />
              Microphone access denied. Please enable it in your browser settings.
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex items-center gap-4"
        >
          <button
            onClick={handleStart}
            disabled={micStatus === "denied"}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-base transition-all shadow-lg ${
              micStatus === "denied"
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-400 text-gray-950 hover:shadow-emerald-500/20 hover:shadow-xl"
            }`}
          >
            Start Interview
            <ChevronRight size={18} />
          </button>
          {hasHistory && (
            <button
              onClick={onOpenHistory}
              className="flex items-center gap-2 px-5 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm font-medium transition-all"
            >
              <History size={16} />
              History
            </button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
