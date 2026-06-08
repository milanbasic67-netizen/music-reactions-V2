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
  TrendingUp
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
    { label: "Za tebe", icon: Home, href: "/" },
    { label: "Trending", icon: TrendingUp, href: "/trending" },
    { label: "Snimi Duet", icon: PlusSquare, href: "/upload-song" },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[300px] h-screen sticky top-0 border-r border-zinc-800 bg-black p-6 z-50">
      
      {/* LOGO */}
      <Link href="/" className="flex items-center gap-3 px-2 mb-12 group">
        <div className="bg-red-600 p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-red-900/20">
          <Music2 className="text-white w-7 h-7" />
        </div>
        <span className="text-3xl font-black tracking-tighter uppercase italic">
          Duet<span className="text-red-600 font-black">App</span>
        </span>
      </Link>

      {/* NAVIGACIJA */}
      <nav className="flex-1 space-y-3">
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] px-4 mb-4">Meni</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-4 px-4 py-4 rounded-2xl font-black text-lg transition-all duration-200 ${
                isActive 
                  ? "text-red-600 bg-red-600/10 shadow-[0_0_20px_rgba(220,38,38,0.1)]" 
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Icon className={`w-7 h-7 ${isActive ? "stroke-[3px]" : "stroke-[2px]"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* KORISNIK / AUTH */}
      <div className="border-t border-zinc-800 pt-8 mt-auto space-y-3">
        {user ? (
          <>
            <Link 
              href={`/u/${user.user_metadata?.username || 'profile'}`}
              className={`flex items-center gap-4 px-4 py-4 rounded-2xl font-black text-lg transition-all ${
                pathname.startsWith('/u/') ? "text-white bg-zinc-900" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <User className="w-7 h-7" />
              <span>Profil</span>
            </Link>
            <button 
              onClick={() => { supabase.auth.signOut(); window.location.reload(); }}
              className="flex items-center gap-4 px-4 py-4 w-full rounded-2xl font-black text-lg text-zinc-600 hover:bg-red-600/10 hover:text-red-500 transition-all duration-300"
            >
              <LogOut className="w-7 h-7" />
              <span>Odjavi se</span>
            </button>
          </>
        ) : (
          <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800">
            <p className="text-zinc-400 text-sm font-medium mb-4 leading-relaxed">
              Prijavi se da bi mogao da snimaš duete i pratiš druge.
            </p>
            <Link 
              href="/login"
              className="flex items-center gap-3 px-4 py-4 bg-red-600 text-white rounded-2xl font-black text-center justify-center hover:bg-red-500 transition-all shadow-xl shadow-red-900/30 active:scale-95"
            >
              <LogIn className="w-6 h-6" />
              PRIJAVI SE
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}