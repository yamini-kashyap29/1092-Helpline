import React from "react";
import { Link } from "react-router-dom";
import { Phone, ShieldCheck, UserCog, Activity, Clock, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

const Index = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-red-100">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <ShieldAlert size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">1092 Helpline</span>
          </div>
          <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors flex items-center gap-2">
            <UserCog size={18} />
            Agent Portal
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-6">
              <Activity size={14} />
              AI-Powered Emergency Response
            </div>
            <h1 className="text-6xl lg:text-7xl font-extrabold leading-[1.1] mb-8 text-slate-900 tracking-tight">
              Safety is just <br />
              <span className="text-primary">one call away.</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-lg leading-relaxed">
              Connect instantly with our intelligent responder.
              Real-time translation, emergency detection, and automated dispatch.
            </p>

            {/* Mobile hero image (shows on small screens) */}
            <div className="mb-6 lg:hidden">
              <img
                src="https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&q=80&w=1000"
                alt="Emergency response illustration"
                className="w-full rounded-2xl object-cover h-48"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/login"
                className="h-16 px-8 rounded-2xl border-2 border-slate-200 text-slate-700 font-bold text-lg flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                Agent Login
              </Link>
            </div>

            <div className="mt-12 flex items-center gap-8 grayscale opacity-50">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck size={20} />
                Govt. Trusted
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Clock size={20} />
                24/7 Service
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:flex items-center justify-end"
          >
            <div className="absolute inset-0 bg-primary/20 blur-[120px] opacity-20 rounded-full" />
            <div className="relative w-full max-w-lg bg-slate-50 border border-slate-100 rounded-[3rem] p-4 shadow-inner overflow-hidden transform translate-x-12">
              <div className="aspect-[4/5] overflow-hidden rounded-[2.5rem]">
                <img
                  src="https://images.unsplash.com/photo-1576091160550-2173dad99978?auto=format&fit=crop&q=80&w=1000"
                  alt="Emergency Services"
                  className="w-full h-full object-cover grayscale-[0.2] hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="absolute bottom-10 left-10 right-10 bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-2xl">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active AI Node 01</span>
                </div>
                <p className="text-slate-900 font-bold leading-snug">Emergency services integrated with real-time analysis.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Stats Section */}
      <section className="py-20 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12">
          {[
            { label: "Response Time", value: "< 2s" },
            { label: "Success Rate", value: "99.8%" },
            { label: "AI Accuracy", value: "96.4%" },
            { label: "Active Nodes", value: "420+" },
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-3xl font-extrabold text-slate-900 mb-1">{stat.value}</div>
              <div className="text-sm font-medium text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Index;
