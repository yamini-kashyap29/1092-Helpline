import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Headphones, History, BarChart3, Settings,
  ChevronLeft, ChevronRight, Bell
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";

const links = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/history", icon: History, label: "Call History" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const location = useLocation();

  return (
    <aside
      className={`${sidebarCollapsed ? "w-[72px]" : "w-60"
        } bg-sidebar flex flex-col transition-all duration-300 relative`}
      style={{
        background: "linear-gradient(180deg, hsl(217 56% 20%) 0%, hsl(217 56% 15%) 100%)",
      }}
    >
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-7 w-6 h-6 bg-card border border-border/60 rounded-full flex items-center justify-center shadow-premium hover:shadow-premium-lg transition-all z-10 hover:scale-110"
        aria-label="Toggle sidebar"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-foreground" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-foreground" />
        )}
      </button>

      <nav className="flex-1 py-5 space-y-1 px-3">
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <NavLink
              key={link.label}
              to={link.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group ${isActive
                  ? "bg-white/12 text-white shadow-sm backdrop-blur-sm"
                  : "text-white/55 hover:bg-white/8 hover:text-white/90"
                }`}
              aria-label={link.label}
            >
              <link.icon className={`w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200 ${isActive ? "" : "group-hover:scale-110"}`} />
              {!sidebarCollapsed && (
                <span className="font-medium tracking-tight">{link.label}</span>
              )}
              {isActive && !sidebarCollapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-secondary" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {!sidebarCollapsed && (
        <div className="p-4 border-t border-white/10 mx-3 mb-3">
          <p className="text-[10px] text-white/30 text-center font-medium tracking-wide uppercase">
            v1.0.0 • Govt of Karnataka
          </p>
        </div>
      )}
    </aside>
  );
}
