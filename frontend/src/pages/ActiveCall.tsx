import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCallStore, type TranscriptLine } from "@/store/callStore";
import { useUIStore } from "@/store/uiStore";
import { generateMockCall } from "@/utils/mockData";
import { formatDuration, formatTime } from "@/utils/formatters";
import { EMOTIONS, URGENCY_LEVELS } from "@/utils/constants";
import type { EmotionType } from "@/utils/constants";
import { wsManager } from "@/services/websocket";
import { callAPI } from "@/services/api";
import ConfidenceBar from "@/components/common/ConfidenceBar";
import EmotionIndicator from "@/components/common/EmotionIndicator";
import StatusBadge from "@/components/common/StatusBadge";
import { PremiumButton } from "@/components/common/PremiumButton";
import {
  PhoneOff, AlertTriangle, Hand, Copy, Clock, FileText, Lightbulb,
  CheckCircle, XCircle, MinusCircle, ChevronRight, Zap,
  Mic, Square, Search, Filter, Edit3, Check, X
} from "lucide-react";
import toast from "react-hot-toast";

export default function ActiveCall() {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const { currentCall, setCurrentCall, appendTranscript, updateCurrentCallField } = useCallStore();
  const { showEscalationOverlay, setEscalationOverlay } = useUIStore();
  const [elapsed, setElapsed] = useState(0);
  const [showVerification, setShowVerification] = useState(false);
  const [escalationCountdown, setEscalationCountdown] = useState(0);
  const [isManualControl, setIsManualControl] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Agent live mic bridge (post-escalation)
  const [isLive, setIsLive] = useState(false);
  const agentStreamRef = useRef<MediaStream | null>(null);
  const agentRecorderRef = useRef<MediaRecorder | null>(null);

  // Audio recording state (for call logging)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Transcript search/filter state
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [speakerFilter, setSpeakerFilter] = useState<"all" | "citizen" | "ai" | "agent">("all");
  const [showTranscriptFilters, setShowTranscriptFilters] = useState(false);

  // Inline verification editing
  const [editingVerification, setEditingVerification] = useState(false);
  const [verificationSentence, setVerificationSentence] = useState(
    "You are reporting a water supply issue in Rajajinagar, Bengaluru?"
  );

  // Loading states for API calls
  const [escalating, setEscalating] = useState(false);
  const [takingControl, setTakingControl] = useState(false);
  const [endingCall, setEndingCall] = useState(false);

  // Agent Live Mic Bridge (post-escalation)
  const startAgentMic = useCallback(async () => {
    if (isLive) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      agentStreamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      agentRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          const buf = await e.data.arrayBuffer();
          const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
          wsManager.send({ type: "agent_audio_chunk", data: b64 });
        }
      };
      recorder.start(1500); // send every 1.5s
      setIsLive(true);
      toast.success("🎙️ Your microphone is now LIVE to the citizen");
    } catch {
      toast.error("Microphone access denied");
    }
  }, [isLive]);

  const stopAgentMic = useCallback(() => {
    agentRecorderRef.current?.stop();
    agentStreamRef.current?.getTracks().forEach((t) => t.stop());
    agentRecorderRef.current = null;
    agentStreamRef.current = null;
    setIsLive(false);
  }, []);

  useEffect(() => {
    wsManager.connect(`/agent/${callId}`);

    const unsubTranscript = wsManager.subscribe("transcript_update", (data) => {
      appendTranscript(data as TranscriptLine);
    });

    const unsubEmotion = wsManager.subscribe("emotion_update", (data) => {
      const { emotion } = data as { emotion: EmotionType };
      updateCurrentCallField({ emotion });
    });

    const unsubConfidence = wsManager.subscribe("confidence_update", (data) => {
      const { confidence, reason } = data as { confidence: number; reason: string };
      updateCurrentCallField({ confidence, confidenceReason: reason });
    });

    const unsubVerification = wsManager.subscribe("verification_trigger", () => {
      setShowVerification(true);
    });

    const unsubAiInsight = wsManager.subscribe("ai_insight_update", (data) => {
      updateCurrentCallField(data as Partial<typeof currentCall>);
    });

    const unsubEscalation = wsManager.subscribe("escalation_required", () => {
      toast.error("⚠️ Auto-escalation triggered — HIGH urgency detected!", { duration: 5000 });
      setIsManualControl(true);
      startAgentMic();
    });

    const unsubCitizenAudio = wsManager.subscribe("citizen_audio", (data) => {
      const { data: b64 } = data as { data: string };
      if (b64) {
        const audio = new Audio("data:audio/webm;codecs=opus;base64," + b64);
        audio.play().catch(() => {});
      }
    });

    let simulationInterval: ReturnType<typeof setInterval> | null = null;

    callAPI.getCallDetails(callId || "CALL-0001")
      .then(res => {
        setCurrentCall(res.data);
        
        const mockLines = [
          { speaker: "citizen" as const, text: "Wait, I also have a problem with the electricity near my house." },
          { speaker: "ai" as const, text: "I understand. I am logging the power outage issue as well." },
          { speaker: "citizen" as const, text: "Thank you. When will it be fixed?" },
          { speaker: "ai" as const, text: "The department has been notified. Expected resolution within 4 hours." }
        ];
        
        let lineIdx = 0;
        simulationInterval = setInterval(() => {
          if (lineIdx < mockLines.length) {
            appendTranscript({
              id: Date.now().toString(),
              ...mockLines[lineIdx],
              timestamp: new Date().toISOString()
            });
            lineIdx++;
          } else if (simulationInterval) {
            clearInterval(simulationInterval);
          }
        }, 5000);
      })
      .catch(() => {
        const call = generateMockCall({ callId: callId || "CALL-0001" });
        setCurrentCall(call);
      });

    return () => {
      unsubTranscript();
      unsubEmotion();
      unsubConfidence();
      unsubVerification();
      unsubAiInsight();
      unsubEscalation();
      unsubCitizenAudio();
      stopAgentMic();
      wsManager.disconnect();
      if (simulationInterval) clearInterval(simulationInterval);
    };
  }, [callId, setCurrentCall, appendTranscript, updateCurrentCallField, startAgentMic, stopAgentMic]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [currentCall?.transcript]);

  // ── Call recording (for logs) ──────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        toast.success("Recording saved and attached to call");
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
    } catch {
      toast.error("Microphone access denied");
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  }, []);

  const handleEscalate = async () => {
    setEscalating(true);
    setEscalationOverlay(true);
    setEscalationCountdown(3);

    try {
      await callAPI.updateSeverity(callId || "", "critical");
    } catch { /* fallback */ }

    const ctr = setInterval(() => {
      setEscalationCountdown((c) => {
        if (c <= 1) {
          clearInterval(ctr);
          setTimeout(() => {
            setEscalationOverlay(false);
            setEscalating(false);
            setIsManualControl(true);
            startAgentMic();
            toast.success("You are now LIVE with the citizen");
          }, 1000);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const handleTakeControl = async () => {
    setTakingControl(true);
    try {
      const apiObj = callAPI as unknown as Record<string, (id: string, payload: Record<string, string>) => Promise<unknown>>;
      if (typeof apiObj.updateInterpretation === 'function') {
        await apiObj.updateInterpretation(callId || "", { mode: "manual" });
      }
    } catch { /* fallback */ }
    setIsManualControl(true);
    setTakingControl(false);
    startAgentMic();
    toast.success("Manual control activated — mic is LIVE");
  };

  const handleEndCall = async () => {
    setEndingCall(true);
    try {
      await callAPI.endCall(callId || "");
    } catch { /* fallback */ }
    setEndingCall(false);
    setCallEnded(true);
    toast.success("Call ended");
    setTimeout(() => navigate("/dashboard"), 1500);
  };

  const handleVerification = async (result: "confirmed" | "incorrect" | "partial") => {
    setShowVerification(false);
    try {
      const apiObj = callAPI as unknown as Record<string, (id: string, val: string) => Promise<unknown>>;
      if (typeof apiObj.submitVerification === 'function') {
        await apiObj.submitVerification(callId || "", result);
      }
    } catch { /* fallback */ }
    
    updateCurrentCallField({
      verifications: [
        ...(currentCall?.verifications || []),
        { attempt: (currentCall?.verifications?.length || 0) + 1, sentence: verificationSentence, result },
      ],
    });
    toast.success(`Verification: ${result}`);
  };

  const handleCopyTranscript = () => {
    const text = currentCall?.transcript.map((l) => `[${l.speaker}] ${l.text}`).join("\n") || "";
    navigator.clipboard.writeText(text);
    toast.success("Transcript copied");
  };

  const filteredTranscript = useMemo(() => {
    if (!currentCall) return [];
    return currentCall.transcript.filter((line) => {
      if (speakerFilter !== "all" && line.speaker !== speakerFilter) return false;
      if (transcriptSearch && !line.text.toLowerCase().includes(transcriptSearch.toLowerCase())) return false;
      return true;
    });
  }, [currentCall, speakerFilter, transcriptSearch]);

  if (!currentCall) return null;
  const urgencyConfig = URGENCY_LEVELS[currentCall.urgency || "low"];

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex gap-4 p-4 h-[calc(100vh-4.25rem)] overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-72 flex-shrink-0 space-y-4 overflow-y-auto scrollbar-thin">
          <div className="premium-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground font-display">Call Info</h3>
              <span className="font-mono text-[11px] text-muted-foreground bg-accent px-2 py-0.5 rounded-md">{currentCall.callId}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground bg-accent/60 rounded-xl p-3">
              <Clock className="w-4 h-4" />
              <span className="font-mono font-bold text-foreground tabular-nums">{formatDuration(elapsed)}</span>
            </div>
            <div className="flex gap-2">
              <StatusBadge label={currentCall.language || "English"} variant="info" />
              {currentCall.dialect && <StatusBadge label={currentCall.dialect} variant="default" />}
              {isManualControl && <StatusBadge label="Manual" variant="warning" />}
            </div>
            <div className="flex items-center gap-3 p-3 bg-accent/40 rounded-xl">
              <EmotionIndicator emotion={currentCall.emotion || "neutral"} size="lg" />
              <div>
                <p className="text-sm font-semibold text-foreground">{EMOTIONS[currentCall.emotion || "neutral"].label}</p>
                <p className="text-xs text-muted-foreground">Current emotion</p>
              </div>
            </div>
            <div>
              <span className={`inline-flex px-3.5 py-1.5 rounded-xl text-xs font-bold ${urgencyConfig.color}`}>
                {urgencyConfig.label} URGENCY
              </span>
            </div>
          </div>

          {/* Audio Recording Control */}
          <div className="premium-card p-4 space-y-3">
            <h3 className="text-sm font-bold text-foreground font-display flex items-center gap-2">
              <Mic className="w-4 h-4 text-primary" /> Audio Recording
            </h3>
            <div className="flex items-center gap-2">
              {!isRecording ? (
                <PremiumButton variant="primary" size="sm" onClick={startRecording} className="flex-1">
                  <Mic className="w-3.5 h-3.5" /> Start Recording
                </PremiumButton>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-1 px-3 py-2 bg-destructive/8 rounded-xl">
                    <span className="w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-destructive font-mono tabular-nums">
                      {formatDuration(recordingDuration)}
                    </span>
                  </div>
                  <PremiumButton variant="danger" size="icon" onClick={stopRecording}>
                    <Square className="w-3.5 h-3.5" />
                  </PremiumButton>
                </>
              )}
            </div>
            {audioUrl && (
              <div className="space-y-2">
                <audio src={audioUrl} controls className="w-full h-8 rounded-lg" />
                <p className="text-[10px] text-muted-foreground">
                  Recording attached to {currentCall.callId}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <PremiumButton variant="danger" className="w-full" onClick={handleEscalate} disabled={escalating || callEnded}>
              <AlertTriangle className="w-4 h-4" /> {escalating ? "Escalating..." : "Escalate to Human"}
            </PremiumButton>
            <PremiumButton variant="primary" className="w-full" onClick={handleTakeControl} disabled={takingControl || isManualControl || callEnded}>
              <Hand className="w-4 h-4" /> {isManualControl ? "Manual Active" : takingControl ? "Switching..." : "Take Manual Control"}
            </PremiumButton>
            <PremiumButton variant="outline" className="w-full" onClick={handleEndCall} disabled={endingCall || callEnded}>
              <PhoneOff className="w-4 h-4" /> {endingCall ? "Ending..." : callEnded ? "Call Ended" : "End Call"}
            </PremiumButton>
          </div>
        </div>

        {/* CENTER PANEL — Transcript */}
        <div className="flex-1 premium-card flex flex-col min-w-0">
          <div className="p-4 border-b border-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground font-display">Live Transcript</h3>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowTranscriptFilters(!showTranscriptFilters)}
                  className={`p-2 rounded-lg transition-colors ${showTranscriptFilters ? "bg-primary/10 text-primary" : "hover:bg-accent text-muted-foreground"}`}
                  aria-label="Toggle filters"
                >
                  <Filter className="w-4 h-4" />
                </button>
                <button onClick={handleCopyTranscript} className="p-2 hover:bg-accent rounded-lg transition-colors" aria-label="Copy transcript">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <AnimatePresence>
              {showTranscriptFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="flex items-center gap-2 pt-1">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                      <input
                        value={transcriptSearch}
                        onChange={(e) => setTranscriptSearch(e.target.value)}
                        placeholder="Search transcript..."
                        className="premium-input w-full pl-9 pr-3 py-2 text-xs"
                      />
                    </div>
                    <select
                      value={speakerFilter}
                      onChange={(e) => setSpeakerFilter(e.target.value as typeof speakerFilter)}
                      className="premium-input text-xs px-3 py-2"
                    >
                      <option value="all">All Speakers</option>
                      <option value="citizen">Citizen</option>
                      <option value="ai">AI</option>
                      <option value="agent">Agent</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div ref={transcriptRef} className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-thin">
            <AnimatePresence>
              {filteredTranscript.map((line) => (
                <motion.div key={line.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}
                  className={`flex ${line.speaker === "citizen" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                    line.speaker === "citizen" ? "bg-primary text-primary-foreground rounded-bl-md"
                    : line.speaker === "ai" ? "bg-secondary text-secondary-foreground rounded-br-md"
                    : "bg-success text-success-foreground rounded-br-md"
                  }`}>
                    <p className="text-[10px] opacity-70 mb-0.5 capitalize font-semibold">{line.speaker}</p>
                    <p>{line.text}</p>
                    <p className="text-[10px] opacity-50 mt-1 tabular-nums">{formatTime(line.timestamp)}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Inline Verification */}
            <AnimatePresence>
              {showVerification && (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                  className="bg-accent border-2 border-primary/15 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-secondary" />
                    <p className="text-xs text-muted-foreground font-semibold">AI is verifying understanding...</p>
                  </div>
                  <div className="flex items-start gap-2">
                    {editingVerification ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          value={verificationSentence}
                          onChange={(e) => setVerificationSentence(e.target.value)}
                          className="premium-input flex-1 text-sm py-2"
                          autoFocus
                        />
                        <button onClick={() => setEditingVerification(false)} className="p-1.5 hover:bg-accent rounded-lg"><Check className="w-4 h-4 text-success" /></button>
                        <button onClick={() => setEditingVerification(false)} className="p-1.5 hover:bg-accent rounded-lg"><X className="w-4 h-4 text-muted-foreground" /></button>
                      </div>
                    ) : (
                      <>
                        <p className="text-base font-semibold text-foreground font-display flex-1">
                          "{verificationSentence}"
                        </p>
                        <button onClick={() => setEditingVerification(true)} className="p-1.5 hover:bg-accent rounded-lg flex-shrink-0" aria-label="Edit verification">
                          <Edit3 className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2.5">
                    {(["confirmed", "incorrect", "partial"] as const).map((r, i) => {
                      const icons = [CheckCircle, XCircle, MinusCircle];
                      const labels = ["Confirmed", "Not Correct", "Partial"];
                      const variants = ["success", "danger", "warning"] as const;
                      const Icon = icons[i];
                      return (
                        <PremiumButton key={r} variant={variants[i]} size="sm" className="flex-1"
                          onClick={() => handleVerification(r)}>
                          <Icon className="w-3.5 h-3.5" />{labels[i]}
                        </PremiumButton>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT PANEL — AI Insights */}
        <div className="w-80 flex-shrink-0 overflow-y-auto space-y-4 scrollbar-thin">
          <div className="premium-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground font-display flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Understanding
            </h3>
            {[{ label: "Intent", value: currentCall.intent }, { label: "Location", value: currentCall.location }, { label: "Issue", value: currentCall.issue }].map((item) => (
              <div key={item.label}>
                <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{item.label}</label>
                <input type="text" defaultValue={item.value || ""}
                  className="premium-input w-full text-sm mt-1"
                  aria-label={item.label} />
              </div>
            ))}
          </div>

          <div className="premium-card p-5">
            <h3 className="text-sm font-bold text-foreground font-display mb-3">Confidence Score</h3>
            <ConfidenceBar score={currentCall.confidence || 85} reason={currentCall.confidenceReason} />
          </div>

          <div className="premium-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground font-display">Sentiment Analysis</h3>
            <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-xl">
              <EmotionIndicator emotion={currentCall.emotion || "neutral"} size="md" />
              <div>
                <p className="text-sm font-semibold text-foreground">{EMOTIONS[currentCall.emotion || "neutral"].label}</p>
                <p className="text-xs text-muted-foreground">Urgency: {currentCall.urgency || "low"}</p>
              </div>
            </div>
            <div className="flex gap-1">
              {(currentCall.emotionHistory || []).map((eh, i) => (
                <div key={i} className="w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-bold"
                  style={{ backgroundColor: (EMOTIONS[eh.emotion as EmotionType]?.color || "#ccc") + "22", color: EMOTIONS[eh.emotion as EmotionType]?.color || "#333" }}
                  title={eh.emotion}>{eh.emotion ? eh.emotion.charAt(0) : "N"}</div>
              ))}
            </div>
          </div>

          <div className="premium-card p-5 space-y-2.5">
            <h3 className="text-sm font-bold text-foreground font-display flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-secondary" /> Suggested Actions
            </h3>
            {(currentCall.suggestedActions || []).map((action) => (
              <motion.button key={action} whileHover={{ scale: 1.01 }}
                className="w-full text-left text-sm px-3.5 py-2.5 bg-accent/60 rounded-xl hover:bg-accent transition-all duration-200 flex items-center justify-between group">
                <span className="font-medium">{action}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </motion.button>
            ))}
          </div>

          <div className="premium-card p-5 space-y-2.5">
            <h3 className="text-sm font-bold text-foreground font-display">Verification Status</h3>
            <p className="text-xs text-muted-foreground font-medium">Attempts: {currentCall.verifications?.length || 0}</p>
            {(currentCall.verifications || []).map((v) => (
              <div key={v.attempt} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-medium">#{v.attempt}</span>
                <StatusBadge label={v.result || "pending"} variant={v.result === "confirmed" ? "success" : v.result === "incorrect" ? "danger" : "warning"} />
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Escalation Overlay */}
      <AnimatePresence>
        {showEscalationOverlay && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="bg-card rounded-2xl border-4 animate-pulse-border p-10 max-w-md text-center space-y-5 shadow-2xl"
              style={{ borderColor: "hsl(var(--destructive))" }}>
              <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-extrabold text-destructive font-display">ESCALATING TO HUMAN AGENT</h2>
              <p className="text-sm text-muted-foreground">
                Transferring context and call data to next available agent...
              </p>
              <div className="text-5xl font-extrabold text-foreground font-display tabular-nums">
                {escalationCountdown > 0 ? escalationCountdown : "Connected!"}
              </div>
              <p className="text-xs text-muted-foreground">Agent joining in {escalationCountdown}...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}