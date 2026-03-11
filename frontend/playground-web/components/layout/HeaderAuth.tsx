"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isNativeApp } from "@/lib/platform";
import { UserCircle, LogOut, Shield, Trophy, Calendar, Users, MessageSquare, Home } from "lucide-react";

const navItems = [
  { href: "/", label: "홈", icon: Home },
  { href: "/clubs", label: "클럽", icon: Shield },
  { href: "/schedule", label: "일정", icon: Calendar },
  { href: "/team", label: "팀", icon: Users },
  { href: "/mypage", label: "MY", icon: UserCircle },
];

const desktopNavItems = [
  { href: "/clubs", label: "클럽 탐색", icon: Shield },
  { href: "/manage/league", label: "대회", icon: Trophy },
  { href: "/schedule", label: "일정", icon: Calendar },
  { href: "/team", label: "팀 관리", icon: Users },
  { href: "/community", label: "커뮤니티", icon: MessageSquare },
];

export default function HeaderAuth() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    if (isNativeApp()) setIsNative(true);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b"
        style={{ background: "var(--sidebar-bg)", borderColor: "var(--card-border)" }}
      >
        {/* 한 줄: 로고 + 네비게이션 + 유저 */}
        <div className="flex items-center justify-between px-8 lg:px-12 py-4 max-w-[1400px] mx-auto w-full">
          {/* 좌측: 로고 */}
          <Link href="/" className="font-black text-xl tracking-tight uppercase flex-shrink-0" style={{ color: "var(--text-primary)" }}>
            Playground
          </Link>

          {/* 중앙: 데스크탑 네비게이션 메뉴 */}
          <nav className="hidden md:flex items-center justify-center flex-1 gap-12 lg:gap-16 xl:gap-20 mx-8">
            {desktopNavItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors relative py-2 whitespace-nowrap ${
                    active
                      ? "text-white"
                      : "hover:text-white"
                  }`}
                  style={active ? undefined : { color: "var(--text-muted)" }}
                >
                  <Icon size={16} />
                  {label}
                  {active && (
                    <span className="absolute -bottom-4 left-0 right-0 h-0.5 bg-black dark:bg-white" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* 우측: 유저 영역 */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {loading ? (
              <div className="h-5" />
            ) : user ? (
              <>
                <span className="text-sm hidden sm:inline" style={{ color: "var(--text-muted)" }}>{user.name}님</span>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium transition-colors flex items-center gap-1 hover:text-white"
                  style={{ color: "var(--text-muted)" }}
                >
                  <LogOut size={14} />
                </button>
                <Link href="/mypage" className="transition-colors hover:text-white" style={{ color: "var(--text-muted)" }} title="마이페이지">
                  <UserCircle size={18} />
                </Link>
              </>
            ) : !isNative ? (
              <Link href="/login" className="text-sm font-medium transition-colors hover:text-white" style={{ color: "var(--text-muted)" }}>
                로그인
              </Link>
            ) : null}
          </div>
        </div>
      </header>


      {/* 모바일: 하단 고정 탭바 - 로그인 후에만 표시 */}
      {user && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t safe-area-pb"
          style={{ background: "var(--sidebar-bg)", borderColor: "var(--card-border)" }}
        >
          <div className="flex items-center justify-around px-2 py-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = href === "/" 
                ? pathname === "/" 
                : pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: active ? "var(--text-primary)" : "var(--text-muted)" }}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
