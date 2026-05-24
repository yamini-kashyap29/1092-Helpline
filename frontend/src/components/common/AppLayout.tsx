import { Outlet } from "react-router-dom";
import Header from "@/components/common/Header";
import Sidebar from "@/components/common/Sidebar";
import { useEffect } from "react";
import { wsManager } from "@/services/websocket";
import toast from "react-hot-toast";

export default function AppLayout() {
  useEffect(() => {
    try {
      wsManager.connect('/dashboard');
      const unsub = wsManager.subscribe('notification', (data) => {
        try {
          const n: any = data as any;
          toast.custom((t) => (
            <div className="p-3 bg-white rounded-xl shadow-lg border">
              <div className="font-bold">{n.title}</div>
              <div className="text-sm text-muted-foreground">{n.message}</div>
            </div>
          ));
        } catch (e) {
          console.error('Invalid notification payload', e, data);
        }
      });

      return () => {
        unsub();
        wsManager.disconnect();
      };
    } catch (err) {
      console.error('WS init failed', err);
    }
  }, []);
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
