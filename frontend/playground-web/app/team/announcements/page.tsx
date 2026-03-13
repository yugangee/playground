"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Megaphone, Plus, X, ChevronRight } from "lucide-react";
import Link from "next/link";
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

export default function AnnouncementsPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentTeam, loading: teamLoading } = useTeam();
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", content: "" });
  const [saving, setSaving] = useState(false);
  
  // 권한 체크를 위한 멤버 정보
  const [members, setMembers] = useState<any[]>([]);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

  const AUTH_API = process.env.NEXT_PUBLIC_API_URL;

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

  // 멤버 이름 로드
  useEffect(() => {
    if (members.length === 0) return;
    fetch(`${AUTH_API}/users`)
      .then(r => r.json())
      .then(data => {
        const users = data.users || [];
        const nameMap: Record<string, string> = {};
        users.forEach((u: any) => {
          const key = u.email || u.username || u.sub;
          if (key && u.name) nameMap[key] = u.name;
        });
        setMemberNames(nameMap);
      })
      .catch(() => {});
  }, [members.length]);

  // 권한 체크
  const currentMember = members.find(m => m.userId === user?.email || m.userId === user?.username || m.email === user?.email);
  const currentUserRoles = currentMember?.roles?.length ? currentMember.roles : (currentMember?.role ? currentMember.role.split(',').map((r: string) => r.trim()) : ['member']);
  const isManager = currentUserRoles.includes('manager') || currentUserRoles.includes('leader');
  const hasFullEditPermission = isManager;

  // 공지사항 로드
  useEffect(() => {
    if (!currentTeam?.id) return;
    setLoading(true);
    manageFetch(`/team/${currentTeam.id}/announcements`)
      .then(data => setAnnouncements(data || []))
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  }, [currentTeam?.id]);

  // 공지사항 생성
  const createAnnouncement = async () => {
    if (!currentTeam?.id || !createForm.title.trim() || !createForm.content.trim()) return;
    setSaving(true);
    try {
      const authorName = user?.name || memberNames[user?.email || ''] || user?.email?.split('@')[0] || '관리자';
      const newAnnouncement = await manageFetch(`/team/${currentTeam.id}/announcements`, {
        method: "POST",
        body: JSON.stringify({ 
          title: createForm.title.trim(), 
          content: createForm.content.trim(),
          authorName 
        }),
      });
      setAnnouncements(prev => [newAnnouncement, ...prev]);
      setCreateForm({ title: "", content: "" });
      setShowCreateModal(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "공지사항 등록에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  // 공지사항 삭제
  const deleteAnnouncement = async (id: string) => {
    if (!currentTeam?.id || !confirm("이 공지사항을 삭제하시겠습니까?")) return;
    try {
      await manageFetch(`/team/${currentTeam.id}/announcements/${id}`, { method: "DELETE" });
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      setSelectedAnnouncement(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제에 실패했습니다");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const getFirstLine = (content: string) => {
    const firstLine = content.split('\n')[0];
    return firstLine.length > 60 ? firstLine.slice(0, 60) + '...' : firstLine;
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/team" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <Megaphone size={20} style={{ color: 'var(--text-primary)' }} />
            <h1 className="text-xl font-bold text-white">공지사항</h1>
          </div>
        </div>
        {hasFullEditPermission && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: "#000", color: "#fff" }}
          >
            <Plus size={16} />
            새 공지
          </button>
        )}
      </div>

      {/* 팀 이름 */}
      <div className="text-sm text-gray-500">
        {currentTeam.name}
      </div>

      {/* 공지사항 목록 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12">
          <Megaphone size={40} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">등록된 공지사항이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((notice) => (
            <button
              key={notice.id}
              onClick={() => setSelectedAnnouncement(notice)}
              className="block w-full bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-semibold text-white truncate flex-1 mr-3">{notice.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500">{formatDate(notice.createdAt)}</span>
                  <ChevronRight size={16} className="text-gray-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400 truncate flex-1 mr-3">{getFirstLine(notice.content)}</p>
                <span className="text-xs text-gray-500 shrink-0">{notice.authorName || '관리자'}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 공지사항 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "var(--modal-overlay)" }} onClick={() => setShowCreateModal(false)}>
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold">공지사항 등록</span>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">제목</label>
                <input
                  value={createForm.title}
                  onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="공지사항 제목을 입력하세요"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30 placeholder:text-gray-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">내용</label>
                <textarea
                  value={createForm.content}
                  onChange={e => setCreateForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="공지사항 내용을 입력하세요"
                  rows={6}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30 placeholder:text-gray-600 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="flex-1 py-2 rounded-lg text-sm bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={createAnnouncement}
                disabled={saving || !createForm.title.trim() || !createForm.content.trim()}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-black hover:bg-gray-900 disabled:opacity-50 transition-colors"
              >
                {saving ? "등록 중..." : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 공지사항 상세 모달 */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "var(--modal-overlay)" }} onClick={() => setSelectedAnnouncement(null)}>
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold">공지사항</span>
              <button onClick={() => setSelectedAnnouncement(null)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <h3 className="text-white font-semibold text-lg">{selectedAnnouncement.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{formatDate(selectedAnnouncement.createdAt)}</span>
                  <span className="text-xs text-gray-600">·</span>
                  <span className="text-xs text-gray-500">{selectedAnnouncement.authorName || '관리자'}</span>
                </div>
              </div>
              <div className="border-t border-white/10 pt-3">
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{selectedAnnouncement.content}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {hasFullEditPermission && (
                <button 
                  onClick={() => deleteAnnouncement(selectedAnnouncement.id)}
                  className="flex-1 py-2 rounded-lg text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                >
                  삭제
                </button>
              )}
              <button 
                onClick={() => setSelectedAnnouncement(null)} 
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
