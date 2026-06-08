import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DuetApp - Pevaj sa svima",
  description: "Platforma za muzičke duete i reakcije",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${geistSans.variable} ${geistMono.variable} h-full bg-black text-white`}>
        
        {/* GLAVNI FLEX KONTEJNER */}
        <div className="flex min-h-screen">
          
          {/* SIDEBAR - Vidljiv samo na lg ekranima */}
          <Sidebar />

          {/* SADRŽAJ STRANICE */}
          <main className="flex-1 relative flex flex-col min-w-0">
            {children}
            
            {/* MOBILNA NAVIGACIJA - Sakrivena na desktopu */}
            <div className="lg:hidden">
                <BottomNav />
            </div>
          </main>

        </div>
      </body>
    </html>
  );
}