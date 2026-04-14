"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, MessageSquare, Activity } from "lucide-react";

export default function MockHRBot() {
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Initialize WebSocket Connection
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/chat";
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("Connected to Python Backend");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // OpenAI Realtime API sends events like 'response.audio_transcript.delta'
      if (data.type === "response.audio_transcript.delta") {
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === "assistant") {
            const updatedMsg = { ...lastMsg, content: lastMsg.content + data.delta };
            return [...prev.slice(0, -1), updatedMsg];
          }
          return [...prev, { role: "assistant", content: data.delta }];
        });
      }
      
      // Note: Audio playback logic for 'response.audio.delta' would hook into an AudioContext here.
    };

    ws.onclose = () => setIsConnected(false);
    wsRef.current = ws;

    return () => ws.close();
  }, []);

  // Handle Microphone Access and Streaming
  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      // Send a commit event to OpenAI telling it we stopped talking
      wsRef.current?.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      wsRef.current?.send(JSON.stringify({ type: "response.create" }));
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = async (event) => {
          if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
            // Convert audio blob to base64 for OpenAI
            const buffer = await event.data.arrayBuffer();
            const base64Audio = Buffer.from(buffer).toString('base64');
            
            wsRef.current.send(JSON.stringify({
              type: "input_audio_buffer.append",
              audio: base64Audio
            }));
          }
        };

        // Capture audio in 250ms chunks for low latency
        mediaRecorder.start(250);
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);
      } catch (error) {
        console.error("Microphone access denied:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center p-6 font-sans">
      
      {/* Header */}
      <header className="w-full max-w-3xl flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-800 rounded-lg">
            <MessageSquare size={24} className="text-emerald-500" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">PlaceMate AI Interviewer</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">System Status</span>
          <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`} />
        </div>
      </header>

      {/* Chat Log Window */}
      <div className="flex-1 w-full max-w-3xl bg-gray-900 border border-gray-800 rounded-xl p-6 overflow-y-auto mb-6 shadow-xl">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
            <Activity size={48} className="opacity-20" />
            <p>Waiting to start interview...</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] rounded-2xl p-4 ${
                msg.role === "user" 
                  ? "bg-emerald-600 text-white" 
                  : "bg-gray-800 text-gray-200 border border-gray-700"
              }`}>
                {msg.role === "assistant" && <p className="text-xs text-emerald-400 font-bold mb-1 tracking-wider uppercase">Sarah (HR)</p>}
                <p className="leading-relaxed">{msg.content}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Controls Container */}
      <div className="w-full max-w-3xl flex justify-center pb-6">
        <button
          onClick={toggleRecording}
          disabled={!isConnected}
          className={`flex items-center gap-3 px-8 py-4 rounded-full font-semibold transition-all duration-200 shadow-lg ${
            !isConnected 
              ? "bg-gray-800 text-gray-500 cursor-not-allowed"
              : isRecording
                ? "bg-emerald-500 text-gray-950 hover:bg-emerald-400 ring-4 ring-emerald-500/30"
                : "bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
          }`}
        >
          {isRecording ? (
            <>
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Mic size={24} />
              </motion.div>
              Recording Answer...
            </>
          ) : (
            <>
              <MicOff size={24} />
              Hold to Speak
            </>
          )}
        </button>
      </div>
      
    </div>
  );
}
