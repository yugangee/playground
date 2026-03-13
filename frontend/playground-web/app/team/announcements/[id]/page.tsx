"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Megaphone, Trash2, Calendar, User } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTeam } from "@/context/TeamContext";
import { manageFetch } from "@/lib/manageFetch";

type Announcement = {
  id: string;
  teamId: string;
  title: string;
  content: string;
  authorId: string;
  authorName?: string;
  createdAt: string;
};

export default function AnnouncementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentTeam, loading: teamLoading } = useTeam();
  
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  
  // 권한 체크를 위한 멤버 정보
  const [members, setMembers] = useState<any[]>([]);

  const AUTH_API = process.env.NEXT_PUBLIC_API_URL;
  const announcementId = params.id as string;

  // 멤버 로드
  useEffect(() => {
    if (!currentTeam?.id) return;
    fetch(`${AUTH_API}/club-members/${currentTeam.id}`)
      .then(r => r.json())
      .then(data => {
        const membersList = data.members || data || [];
        const knownRoles = ['leader', 'manager', 'treasurer', 'owner', 'coach', 'member'];
        const converted = membersList.map((m: any) => {
          const rawRoles = m.role ? m.role.split(',').map((r: string) => r.trim()) : ['member'];
          const roles = rawRoles.filter((r: string) => knownRoles.includes(r));
          if (roles.length === 0) roles.push('member');
          return { userId: m.email || m.userId, email: m.email, roles, role: roles.join(',') };
        });
        setMembers(converted);
      })
      .catch(() => setMembers([]));
  }, [currentTeam?.id]);

  // 권한 체크
  const currentMember = members.find(m => m.userId === user?.email || m.userId === user?.username || m.email === user?.email);
  const currentUserRoles = currentMember?.roles?.length ? currentMember.roles : (currentMember?.role ? currentMember.role.split(',').map((r: string) => r.trim()) : ['member']);
  const isManager = currentUserRoles.includes('manager') || currentUserRoles.includes('leader');
  const hasFullEditPermission = isManager;

  // 공지사항 로드
  useEffect(() => {
    if (!currentTeam?.id || !announcementId) return;
    setLoading(true);
    manageFetch(`/team/${currentTeam.id}/announcements`)
      .then(data => {
        const found = (data || []).find((a: Announcement) => a.id === announcementId);
        setAnnouncement(found || null);
      })
      .catch(() => setAnnouncement(null))
      .finally(() => setLoading(false));
  }, [currentTeam?.id, announcementId]);

  // 공지사항 삭제
  const deleteAnnouncement = async () => {
    if (!currentTeam?.id || !announcement || !confirm("이 공지사항을 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      await manageFetch(`/team/${currentTeam.id}/announcements/${announcement.id}`, { method: "DELETE" });
      router.push("/team/announcements");
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제에 실패했습니다");
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  if (authLoading || teamLoading) {
    return (
      <div className="max-w-4xl mx-auto pt-20 text-center">
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!user || !currentTeam) {
    return (
      <div className="max-w-4xl mx-auto pt-20 text-center space-y-4">
        <p className="text-gray-400 text-sm">로그인이 필요합니다</p>
        <Link href="/login" className="inline-block px-6 py-2 rounded-xl text-sm font-semibold border" style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-primary)", borderColor: "rgba(255,255,255,0.15)" }}>
          로그인
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pt-20 text-center">
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="max-w-4xl mx-auto pt-20 text-center space-y-4">
        <Megaphone size={40} className="text-gray-600 mx-auto" />
        <p className="text-gray-400 text-sm">공지사항을 찾을 수 없습니다</p>
        <Link href="/team/announcements" className="inline-block px-6 py-2 rounded-xl text-sm font-semibold border" style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-primary)", borderColor: "rgba(255,255,255,0.15)" }}>
          목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <Link href="/team/announcements" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
          <span className="text-sm">목록으로</span>
        </Link>
        {hasFullEditPermission && (
          <button 
            onClick={deleteAnnouncement}
            disabled={deleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            <Trash2 size={16} />
            {deleting ? "삭제 중..." : "삭제"}
          </button>
        )}
      </div>

      {/* 공지사항 내용 */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
        {/* 제목 */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-3">{announcement.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} />
              <span>{formatDate(announcement.createdAt)} {formatTime(announcement.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User size={14} />
              <span>{announcement.authorName || '관리자'}</span>
            </div>
          </div>
        </div>

        {/* 구분선 */}
        <div className="border-t border-white/10" />

        {/* 본문 */}
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{announcement.content}</p>
        </div>
      </div>

      {/* 하단 네비게이션 */}
      <div className="flex justify-center">
        <Link 
          href="/team/announcements" 
          className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: "rgba(255,255,255,0.1)", color: "var(--text-primary)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          목록으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
