"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, MessageSquare, Activity } from "lucide-react";

export default function MockHRBot() {
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<any>(null);

  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);

  const playAudioChunk = async (base64Audio: string) => {
    // Initialize the playback context on the first run (Gemini outputs 24kHz audio)
    if (!playbackContextRef.current) {
      playbackContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = playbackContextRef.current;

    // Decode Base64 string to raw binary
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Convert 16-bit PCM binary back to Float32 for the Web Audio API
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    // Create an audio buffer and load the data
    const buffer = ctx.createBuffer(1, float32Array.length, 24000);
    buffer.getChannelData(0).set(float32Array);

    // Create a source node and connect it to the speakers
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    // Schedule the audio to play exactly when the last chunk finishes
    const currentTime = ctx.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }
    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += buffer.duration;
  };

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
      // Gemini Realtime API sends events like 'response.audio_transcript.delta'
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
      if (data.type === "response.audio.delta") {
        playAudioChunk(data.delta);
      }
    };

    ws.onclose = () => setIsConnected(false);
    wsRef.current = ws;

    return () => ws.close();
  }, []);

  // Handle Microphone Access and Raw PCM Streaming
  const toggleRecording = async () => {
    if (isRecording) {
      if (audioContextRef.current) {
        // Clean up the audio nodes to free memory
        const { stream, audioContext, processor, gainNode } = audioContextRef.current;
        processor.disconnect();
        gainNode.disconnect();
        audioContext.close();
        stream.getTracks().forEach((track: any) => track.stop());
        audioContextRef.current = null;
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Force exactly 16kHz sample rate for the Gemini Live API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);
        
        // Create a script processor to capture raw audio data (buffer size 4096, 1 input channel, 1 output channel)
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (event) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const inputData = event.inputBuffer.getChannelData(0);
            
            // Convert Float32 audio to Int16 PCM (The exact format Gemini requires)
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              let s = Math.max(-1, Math.min(1, inputData[i]));
              pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            
            // Fast conversion from PCM Int16Array to Base64
            const uint8 = new Uint8Array(pcmData.buffer);
            let binary = '';
            for (let i = 0; i < uint8.byteLength; i++) {
              binary += String.fromCharCode(uint8[i]);
            }
            const base64Audio = btoa(binary);

            // Stream directly to our Python backend
            wsRef.current.send(JSON.stringify({
              type: "input_audio_buffer.append",
              audio: base64Audio
            }));
          }
        };

        source.connect(processor);
        
        // Connect to a dummy gain node to prevent awful audio feedback loop
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;
        processor.connect(gainNode);
        gainNode.connect(audioContext.destination);

        audioContextRef.current = { stream, audioContext, processor, gainNode };
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
