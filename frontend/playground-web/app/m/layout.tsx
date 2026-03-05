import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Link from "next/link";
import { ChatProvider } from "@/context/ChatContext";
import { ClubProvider } from "@/context/ClubContext";
import { AuthProvider } from "@/context/AuthContext";
import { TeamProvider } from "@/context/TeamContext";
import { ThemeProvider } from "@/context/ThemeContext";
import MobileBottomNav from "@/components/MobileBottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Playground Mobile",
  description: "모바일 전용 스포츠 플랫폼",
};

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark")}catch(e){}})()` }} />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <TeamProvider>
              <ChatProvider>
                <ClubProvider>
                  <div className="flex flex-col min-h-screen">
                    {/* 모바일 헤더 */}
                    <header className="sticky top-0 z-40 border-b px-4 py-3" style={{ background: "var(--sidebar-bg)", borderColor: "var(--card-border)" }}>
                      <Link href="/m" className="font-bold text-lg tracking-tight" style={{ color: "var(--text-primary)" }}>
                        Playground
                      </Link>
                    </header>
                    
                    {/* 메인 컨텐츠 */}
                    <main className="flex-1 px-4 pt-4 pb-20">
                      {children}
                    </main>
                    
                    {/* 하단 네비게이션 */}
                    <MobileBottomNav />
                  </div>
                </ClubProvider>
              </ChatProvider>
            </TeamProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}