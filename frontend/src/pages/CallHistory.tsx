import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDateTime, formatDuration } from "@/utils/formatters";
import { EMOTIONS, LANGUAGES } from "@/utils/constants";
import type { CallData } from "@/store/callStore";
import StatusBadge from "@/components/common/StatusBadge";
import EmotionIndicator from "@/components/common/EmotionIndicator";
import ConfidenceBar from "@/components/common/ConfidenceBar";
import { Search, X, SlidersHorizontal, Loader2, AlertCircle } from "lucide-react"; // Added loaders & icons
import { historyAPI } from "@/services/api"; // 1. Imported your API bridge layer

export default function CallHistoryPage() {
  const [calls, setCalls] = useState<CallData[]>([]);
  const [search, setSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedCall, setSelectedCall] = useState<CallData | null>(null);
  
  // 2. Network state handlers for high-quality UX
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 3. Replaced mock dataset generation with live backend API requests
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    historyAPI.getCallRecords()
      .then((res) => {
        setCalls(res.data);
      })
      .catch((err) => {
        console.error("Database connection failure:", err);
        setError("Unable to read call data records. Please verify server connectivity.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return calls.filter((c) => {
      if (search && !c.callId.toLowerCase().includes(search.toLowerCase()) && !c.issue.toLowerCase().includes(search.toLowerCase())) return false;
      if (languageFilter !== "All" && c.language !== languageFilter) return false;
      if (statusFilter !== "All" && c.status !== statusFilter) return false;
      return true;
    });
  }, [calls, search, languageFilter, statusFilter]);

  const statusVariant = (s: string) => {
    if (s === "resolved") return "success" as const;
    if (s === "escalated") return "warning" as const;
    return "danger" as const;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="p-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground font-display tracking-tight">Call History</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Browse and search past call records</p>
      </div>

      {/* Filters */}
      <div className="premium-card p-4 flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Call ID or issue..."
            className="premium-input w-full pl-10"
            aria-label="Search calls"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="premium-select"
            aria-label="Filter by language"
          >
            <option value="All">All Languages</option>
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="premium-select"
          aria-label="Filter by status"
        >
          <option value="All">All Status</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
          <option value="missed">Missed</option>
        </select>
        <span className="text-xs text-muted-foreground font-semibold bg-accent px-3 py-1.5 rounded-lg font-display">{filtered.length} results</span>
      </div>

      {/* Table & Network Status Views */}
      <div className="premium-card overflow-hidden">
        {isLoading ? (
          // Spinner during network transaction lifetimes
          <div className="p-20 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Reading live communication logs...</p>
          </div>
        ) : error ? (
          // Safe error UI boundary
          <div className="p-16 flex flex-col items-center justify-center space-y-2 text-destructive">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-accent/50">
                  {["Call ID", "Date & Time", "Duration", "Language", "Emotion", "Intent", "Confidence", "Status", "Handled By", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 premium-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.slice(0, 30).map((call, i) => (
                  <motion.tr
                    key={call.callId + i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-accent/40 transition-colors duration-150"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold">{call.callId}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground tabular-nums">{formatDateTime(call.startTime)}</td>
                    <td className="px-5 py-3.5 font-mono text-xs tabular-nums">{formatDuration(call.duration)}</td>
                    <td className="px-5 py-3.5"><StatusBadge label={call.language} variant="info" /></td>
                    <td className="px-5 py-3.5"><EmotionIndicator emotion={call.emotion} size="sm" /></td>
                    <td className="px-5 py-3.5 text-xs max-w-[120px] truncate">{call.intent}</td>
                    <td className="px-5 py-3.5 w-28"><ConfidenceBar score={call.confidence} showLabel={false} /></td>
                    <td className="px-5 py-3.5"><StatusBadge label={call.status} variant={statusVariant(call.status)} /></td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{call.handledBy}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => setSelectedCall(call)} className="text-primary text-xs font-semibold hover:underline underline-offset-2 font-display">
                        Details
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {!isLoading && !error && filtered.length === 0 && (
          <div className="p-10 text-center text-muted-foreground text-sm">No calls match your filters</div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-end justify-center sm:items-center"
            onClick={() => setSelectedCall(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl border border-border/60"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-border/60 flex items-center justify-between sticky top-0 bg-card z-10 rounded-t-2xl">
                <h3 className="font-bold text-foreground font-display">Call Details — {selectedCall.callId}</h3>
                <button onClick={() => setSelectedCall(null)} className="p-1.5 hover:bg-accent rounded-lg transition-colors" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="premium-label">Language</span><p className="font-semibold mt-0.5">{selectedCall.language}</p></div>
                  <div><span className="premium-label">Emotion</span><p className="font-semibold mt-0.5">{EMOTIONS[selectedCall.emotion]?.label || selectedCall.emotion}</p></div>
                  <div><span className="premium-label">Status</span><p className="mt-0.5"><StatusBadge label={selectedCall.status} variant={statusVariant(selectedCall.status)} /></p></div>
                  <div><span className="premium-label">Intent</span><p className="font-semibold mt-0.5">{selectedCall.intent}</p></div>
                  <div><span className="premium-label">Location</span><p className="font-semibold mt-0.5">{selectedCall.location || "Unknown"}</p></div>
                  <div><span className="premium-label">Handled By</span><p className="font-semibold mt-0.5">{selectedCall.handledBy}</p></div>
                </div>

                <div>
                  <h4 className="text-sm font-bold mb-3 text-foreground font-display">Transcript</h4>
                  <div className="space-y-2 bg-accent/50 rounded-xl p-4 max-h-60 overflow-y-auto scrollbar-thin">
                    {selectedCall.transcript && selectedCall.transcript.length > 0 ? (
                      selectedCall.transcript.map((line, idx) => (
                        <div key={line.id || idx} className={`text-sm ${line.speaker === "citizen" ? "" : "text-right"}`}>
                          <span className="text-xs text-muted-foreground capitalize font-medium">{line.speaker}: </span>
                          <span>{line.text}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No transcripts logged for this conversation string.</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold mb-3 text-foreground font-display">Verification History</h4>
                  <div className="space-y-1.5">
                    {selectedCall.verifications && selectedCall.verifications.length > 0 ? (
                      selectedCall.verifications.map((v, index) => (
                        <div key={v.attempt || index} className="text-sm flex items-center gap-2">
                          <span className="text-muted-foreground font-medium">Attempt #{v.attempt}:</span>
                          <StatusBadge label={v.result || "pending"} variant={v.result === "confirmed" ? "success" : v.result === "incorrect" ? "danger" : "warning"} />
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No dynamic verification checkpoints run during this workflow cycle.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}