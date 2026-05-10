"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Target,
  TrendingUp,
  AlertTriangle,
  Download,
  RotateCcw,
  Clock,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface QuestionScore {
  question: string;
  star_score: number;
  delivery_score: number;
  feedback: string;
}

interface ScoreData {
  overall_score: number;
  questions: QuestionScore[];
  strengths: string[];
  areas_to_improve: string[];
  error?: string;
}

interface Message {
  role: string;
  content: string;
}

interface ScorecardScreenProps {
  messages: Message[];
  sessionStartTime: number | null;
  selectedTheme: string;
  onRestart: () => void;
  backendUrl: string;
}

export default function ScorecardScreen({
  messages,
  sessionStartTime,
  selectedTheme,
  onRestart,
  backendUrl,
}: ScorecardScreenProps) {
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  // Calculate session stats
  const duration = sessionStartTime
    ? Math.floor((Date.now() - sessionStartTime) / 1000)
    : 0;
  const durationStr = `${Math.floor(duration / 60)}m ${duration % 60}s`;
  const questionCount = messages.filter(
    (m) => m.role === "assistant" && m.content.includes("?")
  ).length;

  // Build transcript
  const transcript = messages
    .map((m) => `${m.role === "assistant" ? "Sarah" : "Candidate"}: ${m.content}`)
    .join("\n\n");

  // Fetch scores from backend
  useEffect(() => {
    const fetchScores = async () => {
      try {
        const httpUrl = backendUrl.replace("ws://", "http://").replace("wss://", "https://").replace("/ws/chat", "");
        const response = await fetch(`${httpUrl}/api/score`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript }),
        });
        const data = await response.json();
        setScoreData(data);
      } catch (err) {
        console.error("Scoring failed:", err);
        setScoreData({
          overall_score: 0,
          questions: [],
          strengths: ["Unable to generate scores."],
          areas_to_improve: ["Please try again."],
          error: "Network error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (messages.length > 0) {
      fetchScores();
    } else {
      setIsLoading(false);
    }

    // Save session to localStorage for history
    const session = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      theme: selectedTheme,
      duration: durationStr,
      durationSeconds: duration,
      questionCount,
      transcript,
      messages,
    };
    const existing = JSON.parse(localStorage.getItem("placemate_sessions") || "[]");
    existing.unshift(session);
    // Keep only last 20 sessions
    localStorage.setItem("placemate_sessions", JSON.stringify(existing.slice(0, 20)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update session with score once available
  useEffect(() => {
    if (scoreData && !scoreData.error) {
      const sessions = JSON.parse(localStorage.getItem("placemate_sessions") || "[]");
      if (sessions.length > 0) {
        sessions[0].overallScore = scoreData.overall_score;
        localStorage.setItem("placemate_sessions", JSON.stringify(sessions));
      }
    }
  }, [scoreData]);

  const downloadTranscript = () => {
    const blob = new Blob([transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `placemate-interview-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score: number, max: number) => {
    const pct = score / max;
    if (pct >= 0.8) return "text-emerald-400";
    if (pct >= 0.6) return "text-amber-400";
    return "text-red-400";
  };

  const getOverallGrade = (score: number) => {
    if (score >= 85) return { grade: "Excellent", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" };
    if (score >= 70) return { grade: "Good", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" };
    if (score >= 50) return { grade: "Needs Work", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" };
    return { grade: "Keep Practicing", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" };
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-6 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-gray-800" />
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={24} className="text-emerald-400" />
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Analyzing your interview...</h2>
          <p className="text-gray-500 text-sm">Sarah is reviewing your responses</p>
        </motion.div>
      </div>
    );
  }

  const gradeInfo = scoreData ? getOverallGrade(scoreData.overall_score) : null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            <Trophy size={40} className="text-emerald-400 mx-auto mb-3" />
          </motion.div>
          <h1 className="text-2xl font-bold mb-1">Interview Complete</h1>
          <p className="text-gray-400 text-sm">Here&apos;s how you did</p>
        </div>

        {/* Overall Score */}
        {scoreData && !scoreData.error && gradeInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className={`${gradeInfo.bg} border rounded-2xl p-8 mb-6 text-center`}
          >
            <div className="text-6xl font-bold mb-2">
              <span className={gradeInfo.color}>{scoreData.overall_score}</span>
              <span className="text-2xl text-gray-500">/100</span>
            </div>
            <p className={`text-lg font-semibold ${gradeInfo.color}`}>{gradeInfo.grade}</p>
          </motion.div>
        )}

        {/* Session Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <Clock size={18} className="text-gray-500 mx-auto mb-2" />
            <p className="text-lg font-semibold">{durationStr}</p>
            <p className="text-xs text-gray-500">Duration</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <MessageSquare size={18} className="text-gray-500 mx-auto mb-2" />
            <p className="text-lg font-semibold">{questionCount}</p>
            <p className="text-xs text-gray-500">Questions</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <Target size={18} className="text-gray-500 mx-auto mb-2" />
            <p className="text-lg font-semibold capitalize">{selectedTheme === "random" ? "Mixed" : selectedTheme.split(" ").slice(0, 2).join(" ")}</p>
            <p className="text-xs text-gray-500">Focus</p>
          </div>
        </motion.div>

        {/* Strengths & Improvements */}
        {scoreData && !scoreData.error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 gap-4 mb-6"
          >
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-400">Strengths</p>
              </div>
              <ul className="space-y-2">
                {scoreData.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-400" />
                <p className="text-sm font-semibold text-amber-400">Areas to Improve</p>
              </div>
              <ul className="space-y-2">
                {scoreData.areas_to_improve.map((s, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}

        {/* Per-Question Breakdown */}
        {scoreData && scoreData.questions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-6"
          >
            <p className="text-sm font-semibold text-gray-300 mb-3">Question Breakdown</p>
            <div className="space-y-2">
              {scoreData.questions.map((q, i) => (
                <div
                  key={i}
                  className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex-1 mr-4">
                      <p className="text-sm text-gray-300 line-clamp-1">
                        Q{i + 1}: {q.question}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-500 uppercase">Star</span>
                        <span className={`text-sm font-bold ${getScoreColor(q.star_score, 5)}`}>
                          {q.star_score}/5
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-500 uppercase">Delivery</span>
                        <span className={`text-sm font-bold ${getScoreColor(q.delivery_score, 5)}`}>
                          {q.delivery_score}/5
                        </span>
                      </div>
                      {expandedQuestion === i ? (
                        <ChevronUp size={16} className="text-gray-500" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-500" />
                      )}
                    </div>
                  </button>
                  {expandedQuestion === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="px-4 pb-4 border-t border-gray-800"
                    >
                      <p className="text-sm text-gray-400 mt-3">{q.feedback}</p>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex items-center gap-4"
        >
          <button
            onClick={onRestart}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-gray-950 rounded-xl font-semibold transition-all shadow-lg"
          >
            <RotateCcw size={18} />
            Practice Again
          </button>
          <button
            onClick={downloadTranscript}
            className="flex items-center gap-2 px-5 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm font-medium transition-all"
          >
            <Download size={16} />
            Transcript
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
