"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import OnboardingScreen from "./components/OnboardingScreen";
import InterviewScreen from "./components/InterviewScreen";
import ScorecardScreen from "./components/ScorecardScreen";
import SessionHistoryDrawer from "./components/SessionHistoryDrawer";

// Extend the Window interface to include the experimental Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type Phase = "onboarding" | "interview" | "scorecard";

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/chat";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function MockHRBot() {
  // ----- Phase Management -----
  const [phase, setPhase] = useState<Phase>("onboarding");

  // ----- Onboarding State -----
  const [themes, setThemes] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState("random");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);

  // ----- Interview State -----
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSarahThinking, setIsSarahThinking] = useState(false);
  const [isSarahSpeaking, setIsSarahSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [questionCount, setQuestionCount] = useState(0);

  // ----- Reconnection State (Feature #7) -----
  const [reconnecting, setReconnecting] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  // ----- Refs -----
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<{
    stream: MediaStream;
    audioContext: AudioContext;
    processor: ScriptProcessorNode;
    gainNode: GainNode;
  } | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);
  const speechRecognitionRef = useRef<any>(null);
  const userStoppedSpeakingRef = useRef(false);

  // ----- Fetch Themes on Mount -----
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/themes`)
      .then((res) => res.json())
      .then((data) => setThemes(data.themes || []))
      .catch(() => {
        // Fallback themes if API is down
        setThemes([
          "handling a tight deadline under pressure",
          "dealing with a difficult coworker or team conflict",
          "failing at a major task and how they recovered",
        ]);
      });

    // Check if there are past sessions
    const stored = localStorage.getItem("placemate_sessions");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setHasHistory(parsed.length > 0);
      } catch {
        setHasHistory(false);
      }
    }
  }, []);

  // ----- Audio Playback -----
  const playAudioChunk = useCallback(async (base64Audio: string) => {
    if (!playbackContextRef.current) {
      playbackContextRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
        sampleRate: 24000,
      });
    }
    const ctx = playbackContextRef.current;

    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const buffer = ctx.createBuffer(1, float32Array.length, 24000);
    buffer.getChannelData(0).set(float32Array);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }
    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += buffer.duration;
  }, []);

  // ----- WebSocket Connection -----
  const connectWebSocket = useCallback(() => {
    const themeParam = selectedTheme !== "random" ? `?theme=${encodeURIComponent(selectedTheme)}` : "";
    const ws = new WebSocket(`${WS_BASE_URL}${themeParam}`);

    ws.onopen = () => {
      console.log("Connected to Python Backend");
      setIsConnected(true);
      setReconnecting(false);
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "response.audio_transcript.delta") {
        // Start the timer on first Sarah message
        setSessionStartTime((prev) => prev || Date.now());
        setIsSarahThinking(false);
        setIsSarahSpeaking(true);

        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === "assistant") {
            const updatedMsg = { ...lastMsg, content: lastMsg.content + data.delta };
            return [...prev.slice(0, -1), updatedMsg];
          }
          return [...prev, { role: "assistant", content: data.delta }];
        });
      }

      if (data.type === "response.audio.delta") {
        setIsSarahSpeaking(true);
        playAudioChunk(data.delta);
      }

      if (data.type === "response.done") {
        setIsSarahSpeaking(false);
        // Update question count — count assistant messages containing "?"
        setMessages((prev) => {
          const count = prev.filter(
            (m) => m.role === "assistant" && m.content.includes("?")
          ).length;
          setQuestionCount(count);
          return prev;
        });
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsSarahSpeaking(false);

      // Reconnection logic (Feature #7)
      if (phase === "interview" && reconnectAttemptsRef.current < maxReconnectAttempts) {
        setReconnecting(true);
        const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000; // 1s, 2s, 4s
        reconnectAttemptsRef.current += 1;
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

        setTimeout(() => {
          // Save messages to sessionStorage before reconnecting
          sessionStorage.setItem("placemate_messages", JSON.stringify(messages));
          connectWebSocket();
        }, delay);
      } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        setReconnecting(false);
      }
    };

    ws.onerror = () => {
      console.error("WebSocket error");
    };

    wsRef.current = ws;
  }, [selectedTheme, phase, playAudioChunk, messages]);

  // ----- Start Interview -----
  const startInterview = useCallback(() => {
    setPhase("interview");
    setMessages([]);
    setLiveTranscript("");
    setSessionStartTime(null);
    setQuestionCount(0);
    setIsSarahThinking(true); // Show thinking while waiting for greeting
    connectWebSocket();
  }, [connectWebSocket]);

  // ----- End Interview -----
  const endInterview = useCallback(() => {
    // Stop recording if active
    if (audioContextRef.current) {
      const { stream, audioContext, processor, gainNode } = audioContextRef.current;
      processor.disconnect();
      gainNode.disconnect();
      audioContext.close();
      stream.getTracks().forEach((track) => track.stop());
      audioContextRef.current = null;
    }
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
    setIsRecording(false);

    // Close WebSocket
    if (wsRef.current) {
      reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent reconnection
      wsRef.current.close();
      wsRef.current = null;
    }

    setPhase("scorecard");
  }, []);

  // ----- Restart (back to onboarding) -----
  const restartInterview = useCallback(() => {
    setPhase("onboarding");
    setMessages([]);
    setLiveTranscript("");
    setSessionStartTime(null);
    setQuestionCount(0);
    setIsConnected(false);
    setIsSarahThinking(false);
    setIsSarahSpeaking(false);
    setSelectedTheme("random");
    setHasHistory(true); // We just finished a session
    reconnectAttemptsRef.current = 0;
  }, []);

  // ----- Toggle Recording -----
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      if (audioContextRef.current) {
        const { stream, audioContext, processor, gainNode } = audioContextRef.current;
        processor.disconnect();
        gainNode.disconnect();
        audioContext.close();
        stream.getTracks().forEach((track) => track.stop());
        audioContextRef.current = null;
      }

      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }

      // Commit live transcript to chat
      setLiveTranscript((currentTranscript) => {
        if (currentTranscript.trim()) {
          setMessages((prev) => [...prev, { role: "user", content: currentTranscript }]);
        }
        return "";
      });

      setIsRecording(false);
      setAudioLevel(0);
      // Mark that user stopped speaking -> Sarah should be thinking
      userStoppedSpeakingRef.current = true;
      setIsSarahThinking(true);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // 1. Local Speech-to-Text for user chat bubble
        const SpeechRecognitionAPI =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
          const recognition = new SpeechRecognitionAPI();
          recognition.continuous = true;
          recognition.interimResults = true;

          recognition.onresult = (event: any) => {
            let finalTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              finalTranscript += event.results[i][0].transcript;
            }
            setLiveTranscript(finalTranscript);
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
        }

        // 2. PCM Encoder for Gemini
        const audioContext = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
          sampleRate: 16000,
        });
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (event) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const inputData = event.inputBuffer.getChannelData(0);

            // Compute RMS audio level for waveform visualizer (Feature #2)
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
              sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / inputData.length);
            setAudioLevel(Math.min(1, rms * 5)); // Amplify for visual effect

            // Convert Float32 → Int16 PCM
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }

            // Int16Array → Base64
            const uint8 = new Uint8Array(pcmData.buffer);
            let binary = "";
            for (let i = 0; i < uint8.byteLength; i++) {
              binary += String.fromCharCode(uint8[i]);
            }
            const base64Audio = btoa(binary);

            wsRef.current.send(
              JSON.stringify({
                type: "input_audio_buffer.append",
                audio: base64Audio,
              })
            );
          }
        };

        source.connect(processor);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;
        processor.connect(gainNode);
        gainNode.connect(audioContext.destination);

        audioContextRef.current = { stream, audioContext, processor, gainNode };
        setIsRecording(true);
        userStoppedSpeakingRef.current = false;
        setIsSarahThinking(false);
      } catch (error) {
        console.error("Microphone access denied:", error);
      }
    }
  }, [isRecording]);

  // ----- Skip Question -----
  const skipQuestion = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "skip_question" }));
      setMessages((prev) => [...prev, { role: "user", content: "(Skipped question)" }]);
      setIsSarahThinking(true);
    }
  }, []);

  // ----- Cleanup on Unmount -----
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        reconnectAttemptsRef.current = maxReconnectAttempts;
        wsRef.current.close();
      }
      if (audioContextRef.current) {
        audioContextRef.current.processor.disconnect();
        audioContextRef.current.gainNode.disconnect();
        audioContextRef.current.audioContext.close();
        audioContextRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <>
      {/* Reconnection Banner (Feature #7) */}
      {reconnecting && (
        <div className="reconnect-banner fixed top-0 left-0 right-0 z-50 bg-amber-500/20 border-b border-amber-500/30 px-4 py-2.5 text-center">
          <p className="text-sm text-amber-300 flex items-center justify-center gap-2">
            <span className="animate-spin w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full inline-block" />
            Connection lost. Reconnecting... (attempt{" "}
            {reconnectAttemptsRef.current}/{maxReconnectAttempts})
          </p>
        </div>
      )}

      {/* Connection Failed Banner */}
      {!isConnected &&
        !reconnecting &&
        phase === "interview" &&
        reconnectAttemptsRef.current >= maxReconnectAttempts && (
          <div className="reconnect-banner fixed top-0 left-0 right-0 z-50 bg-red-500/20 border-b border-red-500/30 px-4 py-2.5 text-center">
            <p className="text-sm text-red-300 flex items-center justify-center gap-3">
              Connection failed.
              <button
                onClick={() => {
                  reconnectAttemptsRef.current = 0;
                  connectWebSocket();
                }}
                className="px-3 py-1 bg-red-500/30 hover:bg-red-500/50 rounded-lg text-xs font-semibold transition-colors"
              >
                Restart Connection
              </button>
            </p>
          </div>
        )}

      {/* Phase Router */}
      {phase === "onboarding" && (
        <OnboardingScreen
          themes={themes}
          selectedTheme={selectedTheme}
          onThemeSelect={setSelectedTheme}
          onStartInterview={startInterview}
          onOpenHistory={() => setHistoryOpen(true)}
          hasHistory={hasHistory}
        />
      )}

      {phase === "interview" && (
        <InterviewScreen
          messages={messages}
          liveTranscript={liveTranscript}
          isRecording={isRecording}
          isConnected={isConnected}
          isSarahThinking={isSarahThinking}
          isSarahSpeaking={isSarahSpeaking}
          audioLevel={audioLevel}
          sessionStartTime={sessionStartTime}
          questionCount={questionCount}
          onToggleRecording={toggleRecording}
          onSkipQuestion={skipQuestion}
          onEndInterview={endInterview}
        />
      )}

      {phase === "scorecard" && (
        <ScorecardScreen
          messages={messages}
          sessionStartTime={sessionStartTime}
          selectedTheme={selectedTheme}
          onRestart={restartInterview}
          backendUrl={WS_BASE_URL}
        />
      )}

      {/* Session History Drawer (accessible from onboarding) */}
      <SessionHistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}
