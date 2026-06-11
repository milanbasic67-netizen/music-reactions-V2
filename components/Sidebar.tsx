"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Home,
  Users,
  PlusSquare,
  User,
  LogIn,
  LogOut,
  Music2,
  TrendingUp,
  CreditCard
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    }
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const navItems = [
    { label: "For You", icon: Home, href: "/" },
    { label: "Trending", icon: TrendingUp, href: "/trending" },
    { label: "Create Duet", icon: PlusSquare, href: "/songs" },
    { label: "Credits", icon: CreditCard, href: "/credits" },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[300px] h-screen sticky top-0 border-r border-white/8 bg-[#0D0D14] p-6 z-50">
      
      {/* LOGO */}
      <Link href="/" className="flex items-center gap-3 px-2 mb-12 group">
        <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-violet-900/20">
          <Music2 className="text-white w-7 h-7" />
        </div>
        <span className="text-3xl font-black tracking-tighter uppercase italic">
          Duet<span className="text-violet-400 font-black">App</span>
        </span>
      </Link>

      {/* NAVIGATION */}
      <nav className="flex-1 space-y-3">
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] px-4 mb-4">Menu</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-4 px-4 py-4 rounded-2xl font-black text-lg transition-all duration-200 ${
                isActive
                  ? "text-violet-400 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.1)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className={`w-7 h-7 ${isActive ? "stroke-[3px]" : "stroke-[2px]"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* USER / AUTH */}
      <div className="border-t border-white/8 pt-8 mt-auto space-y-3">
        {user ? (
          <>
            {/* 
                CORRECTED PROFILE LINK:
                Points to /profile, which will handle the redirect 
                to your actual username automatically.
            */}
            <Link 
              href="/profile" 
              className={`flex items-center gap-4 px-4 py-4 rounded-2xl font-black text-lg transition-all ${
                pathname === "/profile" || pathname.startsWith("/u/")
                  ? "text-white bg-white/8"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <User className="w-7 h-7" />
              <span>Profile</span>
            </Link>

            <button 
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
              className="flex items-center gap-4 px-4 py-4 w-full rounded-2xl font-black text-lg text-slate-600 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
            >
              <LogOut className="w-7 h-7" />
              <span>Log Out</span>
            </button>
          </>
        ) : (
          <div className="bg-white/5 p-6 rounded-3xl border border-white/8">
            <p className="text-slate-400 text-sm font-medium mb-4 leading-relaxed">
              Log in to record duets and follow creators.
            </p>
            <Link
              href="/login"
              className="flex items-center gap-3 px-4 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-2xl font-black text-center justify-center hover:from-violet-500 hover:to-fuchsia-500 transition-all shadow-xl shadow-violet-900/30 active:scale-95"
            >
              <LogIn className="w-6 h-6" />
              LOG IN
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}