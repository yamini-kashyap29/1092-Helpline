import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { analyticsAPI } from "@/services/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import { Target, Clock, TrendingUp, Zap } from "lucide-react";

const COLORS = ["hsl(152,56%,39%)", "hsl(38,92%,50%)", "hsl(0,72%,51%)", "hsl(217,56%,24%)", "hsl(42,55%,55%)", "hsl(220,60%,50%)"];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid hsl(220,13%,91%)",
  boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontSize: 12,
};

const quickStats = [
  { label: "AI Accuracy Rate", value: "87%", icon: Target, gradient: "from-success/10 to-success/5", iconBg: "bg-success/10", iconColor: "text-success" },
  { label: "Avg Handle Time", value: "4m 32s", icon: Clock, gradient: "from-primary/10 to-primary/5", iconBg: "bg-primary/10", iconColor: "text-primary" },
  { label: "Most Common Intent", value: "Road Complaint", icon: TrendingUp, gradient: "from-secondary/10 to-secondary/5", iconBg: "bg-secondary/10", iconColor: "text-secondary" },
  { label: "Peak Call Hour", value: "10:00 AM", icon: Zap, gradient: "from-warning/10 to-warning/5", iconBg: "bg-warning/10", iconColor: "text-warning" },
];

const tickStyle = { fontSize: 10, fill: "hsl(220,9%,46%)", fontFamily: "'DM Sans', system-ui, sans-serif" };

export default function Analytics() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    analyticsAPI.getAnalytics()
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return (
    <motion.div className="p-6">
      <div className="text-sm text-muted-foreground">Loading analytics...</div>
    </motion.div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground font-display tracking-tight">Analytics</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Performance insights and call analytics</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        {quickStats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={`premium-card p-5 bg-gradient-to-br ${s.gradient} hover:shadow-premium-lg transition-all duration-300`}>
            <div className="flex items-center justify-between mb-4">
              <span className="premium-label">{s.label}</span>
              <div className={`w-9 h-9 ${s.iconBg} rounded-xl flex items-center justify-center`}>
                <s.icon className={`w-[18px] h-[18px] ${s.iconColor}`} />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-foreground font-display tracking-tight">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="premium-card p-5">
          <h3 className="text-sm font-bold text-foreground font-display mb-5">Calls Over Time</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data?.callsOverTime || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
              <XAxis dataKey="hour" tick={tickStyle} axisLine={false} tickLine={false} />
              <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="aiHandled" stroke="hsl(152,56%,39%)" strokeWidth={2.5} name="AI Handled" dot={false} />
              <Line type="monotone" dataKey="escalated" stroke="hsl(38,92%,50%)" strokeWidth={2.5} name="Escalated" dot={false} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Sans', system-ui, sans-serif" }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="premium-card p-5">
          <h3 className="text-sm font-bold text-foreground font-display mb-5">Emotion Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data?.emotionDistribution || []} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} strokeWidth={2} stroke="hsl(0,0%,100%)">
                {(data?.emotionDistribution || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="premium-card p-5">
          <h3 className="text-sm font-bold text-foreground font-display mb-5">Language Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.languageDistribution || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
              <XAxis dataKey="language" tick={{ ...tickStyle, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="hsl(217,56%,24%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="premium-card p-5">
          <h3 className="text-sm font-bold text-foreground font-display mb-5">Escalation Reasons</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.escalationReasons || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" horizontal={false} />
              <XAxis type="number" tick={tickStyle} axisLine={false} tickLine={false} />
              <YAxis dataKey="reason" type="category" tick={tickStyle} width={150} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="hsl(0,72%,51%)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </motion.div>
  );
}
