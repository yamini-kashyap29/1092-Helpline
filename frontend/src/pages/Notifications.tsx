import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, AlertTriangle, Phone, CheckCircle2, Info,
  Trash2, CheckCheck, Filter, X
} from "lucide-react";
import { PremiumButton } from "@/components/common/PremiumButton";
import { formatDateTime } from "@/utils/formatters";
import { wsManager } from "@/services/websocket";

interface Notification {
  id: string;
  type: "escalation" | "call" | "system" | "success";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const iconMap = {
  escalation: AlertTriangle,
  call: Phone,
  system: Info,
  success: CheckCircle2,
};

const colorMap = {
  escalation: { bg: "bg-destructive/8", icon: "text-destructive", dot: "bg-destructive" },
  call: { bg: "bg-primary/8", icon: "text-primary", dot: "bg-primary" },
  system: { bg: "bg-secondary/8", icon: "text-secondary", dot: "bg-secondary" },
  success: { bg: "bg-success/8", icon: "text-success", dot: "bg-success" },
};

// We'll load notifications from the backend API

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    import("@/services/api").then(({ notificationAPI }) =>
      notificationAPI.list()
        .then((res) => setNotifications(res.data))
        .catch((err) => setError(err.message || 'Failed to load notifications'))
        .finally(() => setIsLoading(false))
    );
    // Subscribe to live notification pushes
    const unsubNotif = wsManager.subscribe('notification', (data) => {
      try {
        const n = data as any;
        setNotifications((prev) => [{
          id: n.id,
          type: n.type || 'system',
          title: n.title,
          message: n.message,
          timestamp: n.timestamp || new Date().toISOString(),
          read: false
        }, ...prev]);
      } catch (e) {
        console.error('Malformed notification payload', e, data);
      }
    });

    const unsubNewCall = wsManager.subscribe('new_call', (data) => {
      // When a new call appears, refresh the list from server
      import("@/services/api").then(({ notificationAPI }) => notificationAPI.list().then(res => setNotifications(res.data)).catch(() => { }));
    });

    return () => {
      unsubNotif();
      unsubNewCall();
    };
  }, []);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = notifications.filter((n) => {
    if (filter === "unread" && n.read) return false;
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () =>
    // Optimistic update + backend call
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  import("@/services/api").then(({ notificationAPI }) => {
    // No server endpoint for mark-all implemented yet; mark individually
    notifications.slice(0, 100).forEach((n) => {
      if (!n.read) notificationAPI.markRead(n.id).catch(() => { });
    });
  });

  const markRead = (id: string) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  import("@/services/api").then(({ notificationAPI }) => notificationAPI.markRead(id).catch(() => { }));

  const deleteNotification = (id: string) =>
    // Optimistic removal + backend
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  import("@/services/api").then(({ notificationAPI }) => notificationAPI.delete(id).catch(() => { }));

  const clearAll = () => setNotifications([]);

  if (isLoading) return (
    <motion.div className="p-6"><div className="text-sm text-muted-foreground">Loading notifications...</div></motion.div>
  );

  if (error) return (
    <motion.div className="p-6 text-destructive">Error loading notifications: {error}</motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="p-6 space-y-5 max-w-4xl"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground font-display tracking-tight">
            Notifications
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <PremiumButton variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </PremiumButton>
          )}
          <PremiumButton variant="ghost" size="sm" onClick={clearAll}>
            <Trash2 className="w-3.5 h-3.5" /> Clear all
          </PremiumButton>
        </div>
      </div>

      {/* Filters */}
      <div className="premium-card p-3 flex items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground ml-1" />
        <div className="flex gap-1.5">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f
                ? "bg-primary text-primary-foreground shadow-premium-sm"
                : "text-muted-foreground hover:bg-accent"
                }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="h-5 w-px bg-border" />
        <div className="flex gap-1.5">
          {["all", "escalation", "call", "system", "success"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${typeFilter === t
                ? "bg-primary text-primary-foreground shadow-premium-sm"
                : "text-muted-foreground hover:bg-accent"
                }`}
            >
              {t === "all" ? "All Types" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map((n, i) => {
            const Icon = iconMap[n.type];
            const colors = colorMap[n.type];
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => markRead(n.id)}
                className={`premium-card p-4 flex items-start gap-4 cursor-pointer hover:shadow-premium transition-all duration-200 ${!n.read ? "border-l-[3px] border-l-primary" : ""
                  }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`w-[18px] h-[18px] ${colors.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-sm font-bold text-foreground font-display">
                      {n.title}
                    </h4>
                    {!n.read && (
                      <span className={`w-2 h-2 rounded-full ${colors.dot} flex-shrink-0`} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {n.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1.5 tabular-nums">
                    {formatDateTime(n.timestamp)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(n.id);
                  }}
                  className="p-1.5 hover:bg-accent rounded-lg transition-colors flex-shrink-0"
                  aria-label="Delete notification"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="premium-card p-12 text-center">
            <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              No notifications to show
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
