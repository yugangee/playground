"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Search, Zap, Users, Trophy, Calendar, BarChart2 } from "lucide-react";

const quickActions = [
  { href: "/m/clubs", icon: Search, label: "클럽 탐색", color: "var(--brand-primary)" },
  { href: "/m/video", icon: Zap, label: "AI 분석", color: "#059669" },
  { href: "/m/team", icon: Users, label: "팀 관리", color: "#2563eb" },
  { href: "/m/report", icon: BarChart2, label: "리포트", color: "#7c3aed" },
];

export default function MobilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* 인사말 */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          {user ? `안녕하세요, ${user.name}님!` : "Playground"}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          모바일에서 더 편리하게
        </p>
      </div>

      {/* 퀵 액션 */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          빠른 실행
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map(({ href, icon: Icon, label, color }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all active:scale-95"
              style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `${color}20` }}
              >
                <Icon size={24} style={{ color }} />
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* 최근 활동 */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          최근 활동
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <div className="w-10 h-10 rounded-full bg-[var(--brand-primary-light)] flex items-center justify-center">
              <Trophy size={18} className="text-[var(--brand-primary)]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                기자협회 대회 참가
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                2시간 전
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Zap size={18} className="text-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                영상 분석 완료
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                1일 전
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 데스크톱 버전 링크 */}
      <div className="text-center pt-8">
        <Link
          href="/"
          className="text-sm text-[var(--brand-primary)] underline"
        >
          데스크톱 버전으로 보기
        </Link>
      </div>
    </div>
  );
}