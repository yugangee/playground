import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Link from "next/link";
import { Home, UserCircle } from "lucide-react";
import { ChatProvider } from "@/context/ChatContext";
import { ClubProvider } from "@/context/ClubContext";
import { AuthProvider } from "@/context/AuthContext";
import { TeamProvider } from "@/context/TeamContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ScrollToTop from "@/components/ScrollToTop";
import HeaderAuth from "@/components/layout/HeaderAuth";
import AIChatbot from "@/components/AIChatbot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Playground",
  description: "축구 선수 마켓 & 팀 관리 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark")}catch(e){}})()` }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
        <AuthProvider>
        <TeamProvider>
        <ChatProvider>
        <ClubProvider>
        <div className="flex">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <HeaderAuth />
            <main className="flex-1 px-8 pb-8">
              <ScrollToTop />
              {children}
            </main>
          </div>
        </div>
        </ClubProvider>
        </ChatProvider>
        </TeamProvider>
        </AuthProvider>
        </ThemeProvider>
        <AIChatbot />
      </body>
    </html>
  );
}
