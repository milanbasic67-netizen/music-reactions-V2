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
  title: "DuetApp",
  description: "Record and share musical duets",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DuetApp",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  themeColor: "#7C3AED",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} h-full bg-[#0D0D14] text-white`}>
        
        {/* MAIN FLEX CONTAINER */}
        <div className="flex min-h-screen">
          
          {/* SIDEBAR - Visible only on lg screens */}
          <Sidebar />

          {/* PAGE CONTENT */}
          <main className="flex-1 relative flex flex-col min-w-0">
            {children}
            
            {/* MOBILE NAVIGATION - Hidden on desktop */}
            <div className="lg:hidden">
                <BottomNav />
            </div>
          </main>

        </div>
      </body>
    </html>
  );
}