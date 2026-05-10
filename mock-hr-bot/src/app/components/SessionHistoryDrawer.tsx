"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, MessageSquare, Trophy, Trash2 } from "lucide-react";

interface Session {
  id: string;
  date: string;
  theme: string;
  duration: string;
  durationSeconds: number;
  questionCount: number;
  overallScore?: number;
}

interface SessionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SessionHistoryDrawer({
  isOpen,
  onClose,
}: SessionHistoryDrawerProps) {
  const [sessions, setSessions] = React.useState<Session[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      const stored = JSON.parse(localStorage.getItem("placemate_sessions") || "[]");
      setSessions(stored);
    }
  }, [isOpen]);

  const clearHistory = () => {
    localStorage.removeItem("placemate_sessions");
    setSessions([]);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-gray-900 border-l border-gray-800 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-lg font-semibold">Past Sessions</h2>
              <div className="flex items-center gap-2">
                {sessions.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={12} />
                    Clear
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Close history"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-4">
              {sessions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-3">
                  <Clock size={32} className="opacity-30" />
                  <p className="text-sm">No past sessions yet</p>
                  <p className="text-xs text-gray-600">
                    Complete an interview to see it here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session, i) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium text-gray-200 capitalize">
                            {session.theme === "random"
                              ? "Mixed Topics"
                              : session.theme}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(session.date)}
                          </p>
                        </div>
                        {session.overallScore !== undefined && session.overallScore > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <Trophy size={12} className="text-emerald-400" />
                            <span className="text-sm font-bold text-emerald-400">
                              {session.overallScore}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {session.duration}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare size={12} />
                          {session.questionCount} questions
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
