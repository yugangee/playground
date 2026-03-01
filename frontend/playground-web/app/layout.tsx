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
import PWAInstallBanner from "@/components/PWAInstallBanner"
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import PushNotificationSetup from "@/components/PushNotificationSetup";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Playground — 아마추어 스포츠 플랫폼",
  description: "팀 관리, 경기 일정, 회비 정산을 한 곳에서",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Playground",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
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
        <meta name="theme-color" content="#7c3aed" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
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
                      <main className="flex-1 px-8 pt-8 pb-8">
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
        <PWAInstallBanner />
        <PushNotificationSetup />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
