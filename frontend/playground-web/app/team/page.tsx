"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarDays, TrendingUp, Users, Shield, UserPlus, X, Copy, Check, Send, MessageCircle, Crown, Pencil, Swords, Plus, CheckCircle, Wallet, TrendingDown, Bot, Trash2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTeam } from "@/context/TeamContext";
import { useRouter } from "next/navigation";
import { tryRefreshTokens, clearTokens } from "@/lib/tokenRefresh";
import { manageFetch } from "@/lib/manageFetch";
import type { TeamMember } from "@/types/manage";

function TimeSelect({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const items = placeholder === "시" ? Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')) : ["00","10","20","30","40","50"];
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} className={`relative ${className || ""}`}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white text-sm text-left flex items-center justify-between outline-none focus:border-white/30">
        <span className={value ? "text-white" : "text-gray-600"}>{value || placeholder}</span>
        <span className="text-gray-500 text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 border border-white/10 rounded-lg overflow-y-auto" style={{maxHeight: "168px", background: "var(--dropdown-bg, var(--card-bg, #1a1a1a))"}}>
          {items.map(item => (
            <button key={item} type="button" onClick={() => { onChange(item); setOpen(false); }}
              className={`w-full px-3 py-2 text-sm text-left hover:bg-white/10 transition-colors ${value === item ? "text-white font-semibold bg-white/5" : "text-gray-300"}`}>
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Auth API fetch — /matches, /activities, /clubs (레이팅 시스템용, G-1b 유지)
const AUTH_API = process.env.NEXT_PUBLIC_API_URL;

// 가입 신청 타입
type JoinRequest = {
  requestId: string;
  clubId: string;
  email: string;
  name: string;
  position: string;
  status: string;
  createdAt: string;
};

// 커스텀 확인 모달 타입
type ConfirmModalState = {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  type?: 'confirm' | 'alert';
};

// 커스텀 확인 모달 컴포넌트
function ConfirmModal({ state, onClose }: { state: ConfirmModalState; onClose: () => void }) {
  if (!state.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: "var(--card-bg, #1a1a1a)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <h3 className="text-lg font-bold text-white">{state.title}</h3>
        <p className="text-sm text-gray-300 whitespace-pre-line">{state.message}</p>
        <div className="flex gap-3 pt-2">
          {state.type !== 'alert' && (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
            >
              {state.cancelText || '취소'}
            </button>
          )}
          <button
            onClick={() => { state.onConfirm(); onClose(); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: "#fff", color: "#000" }}
          >
            {state.confirmText || '확인'}
          </button>
        </div>
      </div>
    </div>
  );
}

async function authFetch(path: string, options: RequestInit = {}) {
  const getToken = () => typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const buildReq = () => ({
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  let res = await fetch(`${AUTH_API}${path}`, buildReq());
  if (res.status === 401) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) {
      res = await fetch(`${AUTH_API}${path}`, buildReq());
    } else {
      clearTokens();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new Error("세션이 만료되었습니다. 다시 로그인해 주세요.");
    }
  }
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

const sportTypeLabel: Record<string, string> = {
  soccer: "축구", futsal: "풋살", basketball: "농구", baseball: "야구",
  volleyball: "배구", ice_hockey: "아이스하키",
  running: "러닝크루", snowboard: "스노보드", badminton: "배드민턴",
};
const COMPETITIVE_SPORT_TYPES = new Set(["soccer", "futsal", "basketball", "baseball", "volleyball", "ice_hockey"]);
const CASUAL_SPORT_TYPES = new Set(["running", "snowboard", "badminton"]);

const positionColor: Record<string, string> = {
  GK: "bg-yellow-500/20 text-yellow-400",
  DF: "bg-blue-500/20 text-blue-400",
  MF: "bg-green-500/20 text-green-400",
  FW: "bg-red-500/20 text-red-400",
  C: "bg-purple-500/20 text-purple-400",
  PG: "bg-green-500/20 text-green-400",
  SG: "bg-green-500/20 text-green-400",
  SF: "bg-blue-500/20 text-blue-400",
  PF: "bg-blue-500/20 text-blue-400",
};

type ChatMsg = { from: "me" | "them"; text: string };
type Proposal = { id: number; team: string; date: string; venue: string };

export default function TeamPage() {
  const { user, loading } = useAuth();
  const { teams, currentTeam, setCurrentTeam, isLeader, loading: teamLoading } = useTeam();

  // Auth club ID — 레이팅/매치 시스템(Auth API)용 (G-1b)
  const authClubId = user?.teamId ?? user?.teamIds?.[0] ?? null;

  // Manage API 멤버
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberEditing, setMemberEditing] = useState(false);
  const [editingMember, setEditingMember] = useState<{ userId: string; position: string; roles?: string[] } | null>(null);
  const [editForm, setEditForm] = useState({ position: "", roles: [] as string[] });

  const [attendance, setAttendance] = useState<Record<string, boolean | null>>({});
  const [completedManageMatches, setCompletedManageMatches] = useState<any[]>([]);

  // 초대 링크 (Manage API)
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // currentTeam이 바뀌면 Auth API club-members에서 멤버 로드 (통합)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!currentTeam) { setMembers([]); return; }
    setLoadingMembers(true);
    // Auth API의 club-members 사용 (마이페이지/클럽탐색과 동일)
    fetch(`${AUTH_API}/club-members/${currentTeam.id}`)
      .then(r => r.json())
      .then((data) => {
        const membersList = data.members || data || [];
        // Auth API 형식을 TeamMember 형식으로 변환
        // 알려진 역할만 허용 (알 수 없는 역할은 member로 처리)
        const knownRoles = ['leader', 'manager', 'treasurer', 'owner', 'coach', 'member'];
        const converted = membersList.map((m: any) => {
          const rawRoles = m.role ? m.role.split(',').map((r: string) => r.trim()) : ['member'];
          const roles = rawRoles.filter((r: string) => knownRoles.includes(r));
          if (roles.length === 0) roles.push('member');
          // 알려진 포지션만 허용 (positionColor에 있는 값)
          const knownPositions = ['GK', 'DF', 'MF', 'FW', 'C', 'PG', 'SG', 'SF', 'PF'];
          const position = knownPositions.includes(m.position) ? m.position : '';
          return {
            userId: m.email || m.userId,
            name: m.name || m.email?.split('@')[0] || '-',
            email: m.email,
            position,
            jerseyNumber: m.jerseyNumber || m.number || null,
            roles,
            role: roles.join(','),
          };
        });
        setMembers(converted);
      })
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [currentTeam?.id]);

  // 멤버 이름 매핑 (Auth API의 /users에서 가져옴)
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [memberNumbers, setMemberNumbers] = useState<Record<string, number>>({});
  useEffect(() => {
    if (members.length === 0 || !currentTeam) return;
    fetch(`${AUTH_API}/users`)
      .then(r => r.json())
      .then(data => {
        const users = data.users || [];
        const nameMap: Record<string, string> = {};
        const numberMap: Record<string, number> = {};
        users.forEach((u: any) => {
          const key = u.email || u.username || u.sub;
          if (key && u.name) nameMap[key] = u.name;
          // 등번호: teamNumbers[clubId]
          if (key && u.teamNumbers && u.teamNumbers[currentTeam.id]) {
            numberMap[key] = u.teamNumbers[currentTeam.id];
          }
        });
        setMemberNames(nameMap);
        setMemberNumbers(numberMap);
      })
      .catch(() => {});
  }, [members.length, currentTeam?.id]);

  // 모집중 상태
  const [recruiting, setRecruiting] = useState(false);
  const [recruitingLoading, setRecruitingLoading] = useState(false);

  // Auth API — 매치·활동 (G-1b: 레이팅 시스템 의존성으로 Auth API 유지)
  const [matches, setMatches] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [allClubs, setAllClubs] = useState<any[]>([]);
  const [goalModal, setGoalModal] = useState<any>(null);
  const [goalSelections, setGoalSelections] = useState<Record<string, number>>({});
  const [activityForm, setActivityForm] = useState({ date: "", venue: "" });
  const [scoreModal, setScoreModal] = useState<any>(null);
  const [scoreForm, setScoreForm] = useState({ ourScore: "", theirScore: "" });
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({ open: false, title: '', message: '', onConfirm: () => {} });
  const router = useRouter();

  useEffect(() => {
    if (!authClubId) return;
    authFetch(`/matches?clubId=${authClubId}`).then(d => setMatches(d.matches || [])).catch(() => {});
    authFetch(`/activities?clubId=${authClubId}`).then(d => setActivities(d.activities || [])).catch(() => {});
    authFetch('/clubs').then(d => {
      const clubs = d.clubs || [];
      setAllClubs(clubs);
    }).catch(() => {});
  }, [authClubId]);

  // currentTeam이 바뀌면 해당 팀의 가입 신청 목록 조회
  useEffect(() => {
    if (!currentTeam?.id) return;
    fetch(`${AUTH_API}/join-requests?clubId=${currentTeam.id}`).then(r => r.json()).then(d => setJoinRequests((d.requests || d || []).filter((r: any) => r.status === 'pending'))).catch(() => {});
  }, [currentTeam?.id]);

  // currentTeam이 바뀌면 recruiting 상태 업데이트
  useEffect(() => {
    if (!currentTeam?.id || allClubs.length === 0) return;
    const myClub = allClubs.find((c: any) => c.clubId === currentTeam.id);
    if (myClub) setRecruiting(!!myClub.recruiting);
  }, [currentTeam?.id, allClubs]);

  const clubNameMap: Record<string, string> = {};
  allClubs.forEach((c: any) => { clubNameMap[c.clubId] = c.name; });

  const doToggleRecruiting = async () => {
    if (!currentTeam?.id) return;
    setRecruitingLoading(true);
    try {
      await fetch(`${AUTH_API}/clubs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId: currentTeam.id, recruiting: !recruiting }),
      });
      setRecruiting(!recruiting);
    } catch (e) { console.error('모집 상태 변경 실패', e); }
    setRecruitingLoading(false);
  };

  const toggleRecruiting = () => {
    if (!currentTeam?.id) return;
    // 모집 해제 시 확인 모달
    if (recruiting) {
      setConfirmModal({
        open: true,
        title: '팀원 모집 해제',
        message: '팀원 모집을 해제하시겠습니까?\n클럽 탐색에서 모집중 표시가 사라집니다.',
        confirmText: '해제',
        cancelText: '취소',
        onConfirm: doToggleRecruiting,
      });
    } else {
      doToggleRecruiting();
    }
  };

  const isCompetitive = currentTeam ? COMPETITIVE_SPORT_TYPES.has(currentTeam.sportType ?? '') : false;
  const isCasual = currentTeam ? CASUAL_SPORT_TYPES.has(currentTeam.sportType ?? '') : false;

  const proposedMatches = matches.filter(m => m.status === "proposed" && m.awayClubId === authClubId);
  const confirmedMatches = matches.filter(m => m.status === "confirmed").sort((a: any, b: any) => (b.confirmedAt || "").localeCompare(a.confirmedAt || ""));
  const scheduledMatches = matches.filter(m => ["scheduled", "homeSubmitted", "awaySubmitted", "disputed"].includes(m.status));

  // 확인된 경기에서 전적/승률 계산
  const wins = confirmedMatches.filter((m: any) => {
    const isHome = m.homeClubId === authClubId;
    return (isHome ? m.homeScore : m.awayScore) > (isHome ? m.awayScore : m.homeScore);
  }).length;
  const draws = confirmedMatches.filter((m: any) => {
    const isHome = m.homeClubId === authClubId;
    return (isHome ? m.homeScore : m.awayScore) === (isHome ? m.awayScore : m.homeScore);
  }).length;
  const losses = confirmedMatches.length - wins - draws;
  const record = confirmedMatches.length > 0 ? `${wins}승 ${draws}무 ${losses}패` : "0승 0무 0패";
  const winRate = confirmedMatches.length > 0 ? Math.round(wins / confirmedMatches.length * 100) : 0;

  // Match APIs (Auth API)
  async function acceptMatchAPI(matchId: string) {
    try {
      await authFetch(`/matches/${matchId}/accept`, { method: "PUT" });
      setMatches(prev => prev.map(m => m.matchId === matchId ? { ...m, status: "scheduled" } : m));
    } catch { alert("수락 실패"); }
  }
  async function declineMatchAPI(matchId: string) {
    try {
      await authFetch(`/matches/${matchId}/decline`, { method: "PUT" });
      setMatches(prev => prev.filter(m => m.matchId !== matchId));
    } catch { alert("거절 실패"); }
  }
  async function submitScoreAPI() {
    if (!scoreModal || !user) return;
    const ourScore = parseInt(scoreForm.ourScore);
    const theirScore = parseInt(scoreForm.theirScore);
    if (isNaN(ourScore) || isNaN(theirScore)) { alert("스코어를 입력하세요"); return; }
    try {
      const data = await authFetch(`/matches/${scoreModal.matchId}/score`, {
        method: "PUT",
        body: JSON.stringify({ clubId: authClubId, userEmail: user.email, ourScore, theirScore }),
      });
      authFetch(`/matches?clubId=${authClubId}`).then(d => setMatches(d.matches || [])).catch(() => {});
      setScoreModal(null);
      setScoreForm({ ourScore: "", theirScore: "" });
      alert(data.message);
    } catch { alert("스코어 입력 실패"); }
  }
  async function addGoalsAPI() {
    if (!goalModal || !user) return;
    const goals = Object.entries(goalSelections).filter(([, count]) => count > 0).map(([scorer, count]) => ({ scorer, club: authClubId, count }));
    if (goals.length === 0) { alert("골 기록을 선택하세요"); return; }
    try {
      await authFetch(`/matches/${goalModal.matchId}/goals`, {
        method: "PUT",
        body: JSON.stringify({ clubId: authClubId, userEmail: user.email, goals }),
      });
      authFetch(`/matches?clubId=${authClubId}`).then(d => setMatches(d.matches || [])).catch(() => {});
      setGoalModal(null);
      setGoalSelections({});
    } catch { alert("골 기록 추가 실패"); }
  }
  async function createActivityAPI() {
    if (!user || !currentTeam) return;
    if (!activityForm.date) { alert("날짜를 입력하세요"); return; }
    try {
      await authFetch('/activities', {
        method: "POST",
        body: JSON.stringify({ clubId: authClubId, sport: sportTypeLabel[currentTeam.sportType ?? ''] ?? currentTeam.sportType, date: activityForm.date, venue: activityForm.venue, createdBy: user.email }),
      });
      authFetch(`/activities?clubId=${authClubId}`).then(d => setActivities(d.activities || [])).catch(() => {});
      setActivityForm({ date: "", venue: "" });
    } catch { alert("활동 생성 실패"); }
  }
  async function joinActivityAPI(activityId: string) {
    if (!user) return;
    try {
      await authFetch(`/activities/${activityId}/join`, { method: "PUT", body: JSON.stringify({ email: user.email }) });
      authFetch(`/activities?clubId=${authClubId}`).then(d => setActivities(d.activities || [])).catch(() => {});
    } catch { alert("참가 실패"); }
  }
  async function completeActivityAPI(activityId: string) {
    if (!user) return;
    try {
      await authFetch(`/activities/${activityId}/complete`, { method: "PUT", body: JSON.stringify({ email: user.email }) });
      authFetch(`/activities?clubId=${authClubId}`).then(d => setActivities(d.activities || [])).catch(() => {});
    } catch { alert("완료 실패"); }
  }

  // 멤버 수정 (Manage API)
  async function saveEditMember() {
    if (!editingMember || !currentTeam) return;
    try {
      const member = members.find(m => m.userId === editingMember.userId);
      const email = member?.email || editingMember.userId;
      const roles = editForm.roles?.length ? editForm.roles : ['member'];
      const role = roles.join(',');
      // Auth API (playground-club-members)에 저장
      await fetch(`${AUTH_API}/club-members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", clubId: currentTeam.id, email, role, position: editForm.position }),
      });
      setMembers(prev => prev.map(m => m.userId === editingMember.userId ? { ...m, position: editForm.position, roles, role } : m));
      setEditingMember(null);
    } catch { alert("멤버 수정에 실패했습니다"); }
  }

  // 멤버 삭제 (Manage API)
  async function deleteMemberAPI(userId: string) {
    if (!currentTeam) return;
    setConfirmModal({
      open: true,
      title: '멤버 제거',
      message: '이 멤버를 팀에서 제거하시겠습니까?',
      confirmText: '제거',
      cancelText: '취소',
      onConfirm: async () => {
        try {
          await manageFetch(`/team/${currentTeam.id}/members/${userId}`, { method: 'DELETE' });
          setMembers(prev => prev.filter(m => m.userId !== userId));
        } catch (e) {
          setConfirmModal({ open: true, title: '오류', message: e instanceof Error ? e.message : '멤버 삭제에 실패했습니다', onConfirm: () => {}, type: 'alert' });
        }
      },
    });
  }

  // 가입 신청 수락 실행
  async function doAcceptJoinRequest(requestId: string, applicantName: string) {
    try {
      await fetch(`${AUTH_API}/join-requests/${requestId}/accept`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerEmail: user?.email }),
      });
      setJoinRequests(prev => prev.filter(r => r.requestId !== requestId));
      // 멤버 목록 새로고침
      if (currentTeam) {
        const res = await fetch(`${AUTH_API}/club-members/${currentTeam.id}`);
        const data = await res.json();
        const membersList = data.members || data || [];
        const knownRoles = ['leader', 'manager', 'treasurer', 'owner', 'coach', 'member'];
        const converted = membersList.map((m: any) => {
          const rawRoles = m.role ? m.role.split(',').map((r: string) => r.trim()) : ['member'];
          const roles = rawRoles.filter((r: string) => knownRoles.includes(r));
          if (roles.length === 0) roles.push('member');
          const knownPositions = ['GK', 'DF', 'MF', 'FW', 'C', 'PG', 'SG', 'SF', 'PF'];
          const position = knownPositions.includes(m.position) ? m.position : '';
          return { userId: m.email || m.userId, name: m.name || m.email?.split('@')[0] || '-', email: m.email, position, jerseyNumber: m.jerseyNumber || m.number || null, roles, role: roles.join(',') };
        });
        setMembers(converted);
      }
      setConfirmModal({ open: true, title: '승인 완료', message: `${applicantName}님이 팀에 추가되었습니다.`, onConfirm: () => {}, type: 'alert' });
    } catch {
      setConfirmModal({ open: true, title: '오류', message: '수락에 실패했습니다', onConfirm: () => {}, type: 'alert' });
    }
  }

  // 가입 신청 수락
  function acceptJoinRequest(requestId: string, applicantName: string) {
    setConfirmModal({
      open: true,
      title: '가입 신청 승인',
      message: `${applicantName}님의 가입 신청을 승인하시겠습니까?`,
      confirmText: '승인',
      cancelText: '취소',
      onConfirm: () => doAcceptJoinRequest(requestId, applicantName),
    });
  }

  // 가입 신청 거절 실행
  async function doRejectJoinRequest(requestId: string) {
    try {
      await fetch(`${AUTH_API}/join-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerEmail: user?.email }),
      });
      setJoinRequests(prev => prev.filter(r => r.requestId !== requestId));
    } catch {
      setConfirmModal({ open: true, title: '오류', message: '거절에 실패했습니다', onConfirm: () => {}, type: 'alert' });
    }
  }

  // 가입 신청 거절
  function rejectJoinRequest(requestId: string, applicantName: string) {
    setConfirmModal({
      open: true,
      title: '가입 신청 거절',
      message: `${applicantName}님의 가입 신청을 거절하시겠습니까?`,
      confirmText: '거절',
      cancelText: '취소',
      onConfirm: () => doRejectJoinRequest(requestId),
    });
  }

  // 초대 링크 (Manage API)
  async function openInvite() {
    if (!currentTeam) return;
    setInviteOpen(true);
    setInviteUrl("");
    setInviteLoading(true);
    try {
      const data = await manageFetch(`/team/${currentTeam.id}/invite`, { method: "POST" });
      setInviteUrl(data.inviteUrl ?? "");
    } catch { setInviteUrl(""); }
    finally { setInviteLoading(false); }
  }

  function copy() {
    navigator.clipboard.writeText(inviteUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  }

  // 권한 체크
  const currentMember = members.find(m => m.userId === user?.username);
  const currentUserRoles = currentMember?.role ? [currentMember.role] : ['member'];
  const isManager = currentUserRoles.includes('manager');
  const isTreasurer = currentUserRoles.includes('treasurer');
  const hasFullEditPermission = isLeader || isManager; // 주장 또는 관리자
  const hasTreasurerPermission = isTreasurer; // 총무

  // 채팅 목업 (경기 제안 UI용)
  const [pending, setPending] = useState<number[]>([]);
  const [chatTeam, setChatTeam] = useState<Proposal | null>(null);
  const [msgs, setMsgs] = useState<Record<number, ChatMsg[]>>({});
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, chatTeam]);

  function accept(p: Proposal) {
    setPending(prev => prev.filter(id => id !== p.id));
    setMsgs(prev => ({ ...prev, [p.id]: [{ from: "them", text: `안녕하세요! ${p.date} ${p.venue}에서 경기 제안드립니다. 가능하신가요?` }] }));
    setChatTeam(p);
  }
  function decline(id: number) { setPending(prev => prev.filter(i => i !== id)); }
  function sendMsg() {
    if (!input.trim() || !chatTeam) return;
    const id = chatTeam.id;
    setMsgs(prev => ({ ...prev, [id]: [...(prev[id] ?? []), { from: "me", text: input }] }));
    setInput("");
    setTimeout(() => setMsgs(prev => ({ ...prev, [id]: [...(prev[id] ?? []), { from: "them", text: "네 확인했습니다! 일정 맞추죠!" }] })), 800);
  }

  if (loading || teamLoading) {
    return <div className="max-w-4xl mx-auto pt-20 text-center"><p className="text-gray-500 text-sm">로딩 중...</p></div>;
  }

  if (!user) {
    const demoClub = {
      name: "서울 FC 썬더", sport: "축구", record: "12승 3무 2패",
      members: 15, winRate: 71, areas: [{ sido: "서울", sigungu: "강남" }],
      styles: ["공격적", "빠른 패스"], image: null,
    };
    const demoMembers = [
      { userId: "demo1", name: "김민수", position: "GK", roles: ["member"] },
      { userId: "demo2", name: "이서준", position: "DF", roles: ["manager"] },
      { userId: "demo3", name: "박지훈", position: "DF", roles: ["member"] },
      { userId: "demo4", name: "최도윤", position: "MF", roles: ["treasurer"] },
      { userId: "demo5", name: "강시우", position: "MF", roles: ["member"] },
      { userId: "demo6", name: "윤하준", position: "FW", roles: ["leader", "manager"] },
    ];
    return <TeamPageContent club={demoClub} members={demoMembers} isDemo={true} />;
  }

  if (teams.length === 0 || !currentTeam) {
    return (
      <div className="max-w-4xl mx-auto pt-20 text-center space-y-4">
        <Shield size={40} className="text-gray-600 mx-auto" />
        <p className="text-gray-400 text-sm">소속된 팀이 없습니다</p>
        <Link href="/clubs" className="inline-block px-6 py-2 rounded-xl text-sm font-semibold border" style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-primary)", borderColor: "rgba(255,255,255,0.15)" }}>
          클럽 탐색
        </Link>
      </div>
    );
  }

  const sportName = sportTypeLabel[currentTeam.sportType ?? ''] ?? currentTeam.sportType ?? '-';
  const teamArea = currentTeam.region ?? '';

  // Manage API 팀 데이터를 기존 club 인터페이스에 맞게 변환
  const club = {
    name: currentTeam.name,
    sport: sportName,
    record,
    winRate,
    members: members.length,
    areas: teamArea ? [{ sido: teamArea, sigungu: '' }] : [],
    styles: [],
    image: currentTeam.logoUrl ?? null,
    description: currentTeam.description,
  };

  return (
    <TeamPageContent
      club={club}
      members={members}
      isDemo={false}
      record={record}
      areas={teamArea}
      styles=""
      memberEditing={memberEditing}
      setMemberEditing={setMemberEditing}
      editingMember={editingMember}
      setEditingMember={(m: any) => {
        if (m) setEditingMember({ userId: m.userId, position: m.position || '', roles: m.role ? [m.role] : ['member'] });
        else setEditingMember(null);
      }}
      editForm={editForm}
      setEditForm={setEditForm}
      saveEditMember={saveEditMember}
      onInviteClick={openInvite}
      inviteOpen={inviteOpen}
      setInviteOpen={setInviteOpen}
      inviteUrl={inviteUrl}
      inviteLoading={inviteLoading}
      copy={copy}
      copied={copied}
      attendance={attendance}
      setAttendance={setAttendance}
      pending={pending}
      accept={accept}
      decline={decline}
      chatTeam={chatTeam}
      setChatTeam={setChatTeam}
      msgs={msgs}
      input={input}
      setInput={setInput}
      sendMsg={sendMsg}
      bottomRef={bottomRef}
      proposedMatches={proposedMatches}
      confirmedMatches={confirmedMatches}
      completedManageMatches={completedManageMatches}
      setCompletedManageMatches={setCompletedManageMatches}
      scheduledMatches={scheduledMatches}
      acceptMatchAPI={acceptMatchAPI}
      declineMatchAPI={declineMatchAPI}
      submitScoreAPI={submitScoreAPI}
      addGoalsAPI={addGoalsAPI}
      clubNameMap={clubNameMap}
      isCompetitive={isCompetitive}
      isCasual={isCasual}
      isLeaderUser={isLeader}
      isManagerUser={isManager}
      isTreasurerUser={isTreasurer}
      hasFullEditPermission={hasFullEditPermission}
      hasTreasurerPermission={hasTreasurerPermission}
      currentUser={user}
      authClubId={authClubId}
      scoreModal={scoreModal}
      setScoreModal={setScoreModal}
      scoreForm={scoreForm}
      setScoreForm={setScoreForm}
      goalModal={goalModal}
      setGoalModal={setGoalModal}
      goalSelections={goalSelections}
      setGoalSelections={setGoalSelections}
      activities={activities}
      activityForm={activityForm}
      setActivityForm={setActivityForm}
      createActivityAPI={createActivityAPI}
      joinActivityAPI={joinActivityAPI}
      completeActivityAPI={completeActivityAPI}
      router={router}
      loadingMembers={loadingMembers}
      deleteMemberAPI={deleteMemberAPI}
      currentTeam={currentTeam}
      teams={teams}
      onTeamChange={setCurrentTeam}
      memberNames={memberNames}
      memberNumbers={memberNumbers}
      recruiting={recruiting}
      recruitingLoading={recruitingLoading}
      toggleRecruiting={toggleRecruiting}
      joinRequests={joinRequests}
      acceptJoinRequest={acceptJoinRequest}
      rejectJoinRequest={rejectJoinRequest}
    />
  );
}

function TeamPageContent({
  club, members, isDemo,
  record, areas, styles,
  memberEditing = false, setMemberEditing = () => {},
  editingMember = null, setEditingMember = () => {},
  editForm = { position: "" }, setEditForm = () => {},
  saveEditMember = () => {},
  onInviteClick = () => {}, inviteOpen = false, setInviteOpen = () => {},
  inviteUrl = "", inviteLoading = false, copy = () => {}, copied = false,
  attendance = {}, setAttendance = () => {},
  pending = [], accept = () => {}, decline = () => {},
  chatTeam = null, setChatTeam = () => {},
  msgs = {}, input = "", setInput = () => {}, sendMsg = () => {},
  bottomRef = null,
  proposedMatches = [], confirmedMatches = [], scheduledMatches = [], completedManageMatches = [],
  setCompletedManageMatches = (_: any[]) => {},
  acceptMatchAPI, declineMatchAPI, submitScoreAPI, addGoalsAPI,
  clubNameMap = {}, isCompetitive = false, isCasual = false,
  isLeaderUser = false, isManagerUser = false, isTreasurerUser = false,
  hasFullEditPermission = false, hasTreasurerPermission = false,
  currentUser = null, authClubId = null,
  scoreModal = null, setScoreModal = () => {},
  scoreForm = { ourScore: "", theirScore: "" }, setScoreForm = () => {},
  goalModal = null, setGoalModal = () => {},
  goalSelections = {}, setGoalSelections = () => {},
  activities = [], activityForm = { date: "", venue: "" }, setActivityForm = () => {},
  createActivityAPI, joinActivityAPI, completeActivityAPI,
  router = null, loadingMembers = false,
  deleteMemberAPI = () => {},
  currentTeam = null,
  teams = [],
  onTeamChange = null,
  memberNames = {} as Record<string, string>,
  memberNumbers = {} as Record<string, number>,
  recruiting = false,
  recruitingLoading = false,
  toggleRecruiting = () => {},
  joinRequests = [] as JoinRequest[],
  acceptJoinRequest = (_id: string, _name: string) => {},
  rejectJoinRequest = (_id: string, _name: string) => {},
}: any) {
  if (!club) {
    return (
      <div className="max-w-4xl mx-auto pt-20 text-center space-y-4">
        <Shield size={40} className="text-gray-600 mx-auto" />
        <p className="text-gray-400 text-sm">소속된 팀이 없습니다</p>
        <Link href="/clubs" className="inline-block px-6 py-2 rounded-xl text-sm font-semibold border" style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-primary)", borderColor: "rgba(255,255,255,0.15)" }}>
          클럽 탐색
        </Link>
      </div>
    );
  }

  // Manage API completed 경기를 confirmedMatches 형식으로 변환해 합산
  const manageConfirmed = completedManageMatches.map((m: any) => ({
    ...m,
    matchId: m.id,
    status: "confirmed",
    confirmedAt: m.updatedAt || m.createdAt || "",
    homeScore: m.ourScore,
    awayScore: m.theirScore,
    homeClubId: authClubId,
    _fromManage: true,
  }));
  const allConfirmed = [...(confirmedMatches ?? []), ...manageConfirmed]
    .sort((a: any, b: any) => (b.confirmedAt || "").localeCompare(a.confirmedAt || ""));

  const manageWins = completedManageMatches.filter((m: any) => m.result === "win").length;
  const manageDraws = completedManageMatches.filter((m: any) => m.result === "draw").length;
  const manageLosses = completedManageMatches.filter((m: any) => m.result === "loss").length;

  const authWins = (confirmedMatches ?? []).filter((m: any) => {
    const isHome = m.homeClubId === authClubId;
    return isHome ? (m.homeScore ?? 0) > (m.awayScore ?? 0) : (m.awayScore ?? 0) > (m.homeScore ?? 0);
  }).length;
  const authDraws = (confirmedMatches ?? []).filter((m: any) => (m.homeScore ?? 0) === (m.awayScore ?? 0)).length;
  const authLosses = (confirmedMatches ?? []).length - authWins - authDraws;

  const totalWins = authWins + manageWins;
  const totalDraws = authDraws + manageDraws;
  const totalLosses = authLosses + manageLosses;
  const totalGames = allConfirmed.length;
  const computedRecord = totalGames > 0 ? `${totalWins}승 ${totalDraws}무 ${totalLosses}패` : null;
  const computedWinRate = totalGames > 0 ? Math.round(totalWins / totalGames * 100) : null;

  const finalRecord = computedRecord || record || club.record || "0승 0무 0패";
  const finalWinRate = computedWinRate ?? club.winRate ?? 0;
  const finalAreas = areas || (club.areas || []).map((a: any) => [a.sido, a.sigungu].filter(Boolean).join(" ")).join(", ");
  const finalStyles = styles || (club.styles || []).join(", ");

  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ type: "경기", awayTeamId: "", date: "", time: "", venue: "" });
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [manageMatches, setManageMatches] = useState<any[]>([]);
  const [matchAttendance, setMatchAttendance] = useState<Record<string, string>>({});
  const [scheduleEditMode, setScheduleEditMode] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editMatchForm, setEditMatchForm] = useState({ date: "", time: "", venue: "" });
  const [resultMatchId, setResultMatchId] = useState<string | null>(null);
  const [resultForm, setResultForm] = useState({ ourScore: "", theirScore: "", scorers: [] as { userId: string; name: string; goals: number; assists: number }[] });
  const [resultSaving, setResultSaving] = useState(false);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  const loadManageMatches = async () => {
    if (!currentTeam?.id) return;
    try {
      const data = await manageFetch(`/schedule/matches?teamId=${currentTeam.id}`);
      if (!Array.isArray(data)) return;
      setManageMatches(data.filter((m: any) => m.status === "pending" || m.status === "accepted" || !m.status));
      setCompletedManageMatches(data.filter((m: any) => m.status === "completed"));
    } catch {}
  };

  useEffect(() => { loadManageMatches(); }, [currentTeam?.id]);

  const respondAttendance = async (matchId: string, status: string) => {
    // currentUser는 AuthContext에서 오는 user 객체
    // user.name이 비어있으면 email의 @ 앞부분 사용
    const userName = currentUser?.name || (currentUser?.email?.split('@')[0]) || currentUser?.username || "나";
    const userId = currentUser?.email || currentUser?.username || "me";
    try {
      await manageFetch(`/schedule/matches/${matchId}/attendance`, { 
        method: "PUT", 
        body: JSON.stringify({ status, userName }) 
      });
      setMatchAttendance(prev => ({ ...prev, [matchId]: status }));
      setManageMatches(prev => prev.map(m => {
        if (m.id !== matchId) return m;
        const filtered = (m.attendances ?? []).filter((a: any) => a.userId !== userId);
        return { ...m, attendances: [...filtered, { userId, userName, status }] };
      }));
    } catch {}
  };

  const saveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam?.id) return;
    setScheduleSaving(true);
    try {
      const scheduledAt = scheduleForm.date && scheduleForm.time ? `${scheduleForm.date}T${scheduleForm.time}:00` : "";
      await manageFetch("/schedule/matches", {
        method: "POST",
        body: JSON.stringify({ homeTeamId: currentTeam.id, type: scheduleForm.type, awayTeamId: scheduleForm.awayTeamId, scheduledAt, venue: scheduleForm.venue }),
      });
      setScheduleForm({ type: "경기", awayTeamId: "", date: "", time: "", venue: "" });
      setShowScheduleForm(false);
      await loadManageMatches();
    } catch {
      alert("등록에 실패했습니다");
    } finally {
      setScheduleSaving(false);
    }
  };

  const openEditMatch = (m: any) => {
    const dt = m.scheduledAt ? new Date(m.scheduledAt) : null;
    setEditMatchForm({
      date: dt ? `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}` : "",
      time: dt ? `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}` : "",
      venue: m.venue || "",
    });
    setEditingMatchId(m.id);
  };

  const saveEditMatch = async (matchId: string) => {
    try {
      const scheduledAt = editMatchForm.date && editMatchForm.time ? `${editMatchForm.date}T${editMatchForm.time}:00` : "";
      await manageFetch(`/schedule/matches/${matchId}`, { method: "PATCH", body: JSON.stringify({ scheduledAt, venue: editMatchForm.venue }) });
      setManageMatches(prev => prev.map(m => m.id !== matchId ? m : { ...m, scheduledAt, venue: editMatchForm.venue }));
      setEditingMatchId(null);
    } catch { alert("수정에 실패했습니다"); }
  };

  const cancelMatch = async (matchId: string) => {
    if (!confirm("일정을 취소하시겠습니까?")) return;
    try {
      await manageFetch(`/schedule/matches/${matchId}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) });
      setManageMatches(prev => prev.filter(m => m.id !== matchId));
      setEditingMatchId(null);
    } catch { alert("취소에 실패했습니다"); }
  };

  const submitResult = async () => {
    if (!resultMatchId || !currentTeam?.id) return;
    setResultSaving(true);
    try {
      const our = parseInt(resultForm.ourScore);
      const their = parseInt(resultForm.theirScore);
      const result = our > their ? "win" : our < their ? "loss" : "draw";
      const resultMatch = manageMatches.find(m => m.id === resultMatchId);
      const attendees = (resultMatch?.attendances ?? [])
        .filter((a: any) => a.status === "accepted")
        .map((a: any) => ({ oderId: a.userId, userName: a.userName }));
      await manageFetch(`/schedule/matches/${resultMatchId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed", ourScore: our, theirScore: their, scorers: resultForm.scorers, result, attendees }),
      });
      await loadManageMatches();
      setResultMatchId(null);
      setResultForm({ ourScore: "", theirScore: "", scorers: [] as { userId: string; name: string; goals: number; assists: number }[] });
      setScheduleEditMode(false);
      setEditingMatchId(null);
    } catch { alert("결과 저장에 실패했습니다"); }
    finally { setResultSaving(false); }
  };

  return (
    <div>
      {/* 경기 결과 입력 모달 */}
      {resultMatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "var(--modal-overlay)" }} onClick={() => setResultMatchId(null)}>
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white font-semibold">경기 결과 입력</span>
                {(() => {
                  const rm = manageMatches.find(m => m.id === resultMatchId);
                  const opponent = rm?.awayTeamName || rm?.awayTeamId || "";
                  const venue = rm?.venue || "";
                  const dt = rm?.scheduledAt ? new Date(rm.scheduledAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "";
                  return (opponent || venue || dt) ? (
                    <p className="text-xs text-gray-400 mt-0.5">{[dt, opponent ? `vs ${opponent}` : "", venue].filter(Boolean).join(" · ")}</p>
                  ) : null;
                })()}
              </div>
              <button onClick={() => setResultMatchId(null)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">스코어</label>
              <div className="flex items-center justify-center gap-3">
                <input type="number" min="0" value={resultForm.ourScore} onChange={e => setResultForm(f => ({ ...f, ourScore: e.target.value }))}
                  placeholder="우리" className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white text-sm text-center outline-none focus:border-white/30" />
                <span className="text-gray-400 font-bold text-lg">:</span>
                <input type="number" min="0" value={resultForm.theirScore} onChange={e => setResultForm(f => ({ ...f, theirScore: e.target.value }))}
                  placeholder="상대" className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white text-sm text-center outline-none focus:border-white/30" />
              </div>
              {resultForm.ourScore !== "" && resultForm.theirScore !== "" && (
                <p className={`text-xs font-semibold text-center pt-1 ${parseInt(resultForm.ourScore) > parseInt(resultForm.theirScore) ? "text-green-400" : parseInt(resultForm.ourScore) < parseInt(resultForm.theirScore) ? "text-red-400" : "text-gray-400"}`}>
                  {parseInt(resultForm.ourScore) > parseInt(resultForm.theirScore) ? "승리" : parseInt(resultForm.ourScore) < parseInt(resultForm.theirScore) ? "패배" : "무승부"}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400">득점 / 도움 선수</label>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {members.map((mem: any) => {
                  const uid = mem.userId || mem.name;
                  const scorer = resultForm.scorers.find(s => s.userId === uid);
                  const selected = !!scorer;
                  return (
                    <div key={uid} className="rounded-lg overflow-hidden" style={selected ? { border: "1px solid rgba(139,92,246,0.4)", background: "rgba(139,92,246,0.08)" } : { border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                      <button type="button"
                        onClick={() => setResultForm(f => ({
                          ...f,
                          scorers: selected
                            ? f.scorers.filter(s => s.userId !== uid)
                            : [...f.scorers, { userId: uid, name: mem.name || mem.userId, goals: 0, assists: 0 }]
                        }))}
                        className="w-full px-3 py-2 text-xs font-medium text-left transition-colors"
                        style={selected ? { color: "#c4b5fd" } : { color: "var(--text-secondary)" }}>
                        {mem.name || mem.userId}
                      </button>
                      {selected && (
                        <div className="flex items-center gap-3 px-3 pb-2">
                          {/* 득점 */}
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500 text-xs w-8">⚽ 득점</span>
                            <button type="button" onClick={() => setResultForm(f => ({ ...f, scorers: f.scorers.map(s => s.userId === uid ? { ...s, goals: Math.max(0, s.goals - 1) } : s) }))}
                              className="w-6 h-6 rounded bg-white/10 text-white text-sm flex items-center justify-center hover:bg-white/20">−</button>
                            <span className="text-white text-xs w-5 text-center font-bold">{scorer.goals}</span>
                            <button type="button" onClick={() => setResultForm(f => ({ ...f, scorers: f.scorers.map(s => s.userId === uid ? { ...s, goals: s.goals + 1 } : s) }))}
                              className="w-6 h-6 rounded bg-white/10 text-white text-sm flex items-center justify-center hover:bg-white/20">+</button>
                          </div>
                          {/* 도움 */}
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500 text-xs w-8">🅰️ 도움</span>
                            <button type="button" onClick={() => setResultForm(f => ({ ...f, scorers: f.scorers.map(s => s.userId === uid ? { ...s, assists: Math.max(0, (s.assists||0) - 1) } : s) }))}
                              className="w-6 h-6 rounded bg-white/10 text-white text-sm flex items-center justify-center hover:bg-white/20">−</button>
                            <span className="text-white text-xs w-5 text-center font-bold">{scorer.assists || 0}</span>
                            <button type="button" onClick={() => setResultForm(f => ({ ...f, scorers: f.scorers.map(s => s.userId === uid ? { ...s, assists: (s.assists||0) + 1 } : s) }))}
                              className="w-6 h-6 rounded bg-white/10 text-white text-sm flex items-center justify-center hover:bg-white/20">+</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {(() => {
              const totalGoals = resultForm.scorers.reduce((sum, s) => sum + Number(s.goals), 0);
              const our = resultForm.ourScore === "" ? null : Number(resultForm.ourScore);
              const goalsMatch = our === null || totalGoals === our;
              return (
                <>
                  {our !== null && (
                    <p className={`text-xs text-center ${goalsMatch ? "text-green-400" : "text-red-400"}`}>
                      득점 합계 {totalGoals} / 우리 스코어 {our} {goalsMatch ? "✓ 일치" : "— 스코어와 일치해야 합니다"}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => setResultMatchId(null)} className="flex-1 py-2 rounded-lg text-sm bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors">취소</button>
                    <button onClick={submitResult} disabled={resultSaving || !resultForm.ourScore || !resultForm.theirScore || !goalsMatch}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-black hover:bg-gray-900 disabled:opacity-50 transition-colors">
                      {resultSaving ? "저장 중..." : "저장"}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {isDemo && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center mb-6">
          <Users size={24} className="mx-auto mb-3" style={{ color: 'var(--text-primary)' }} />
          <p className="text-white font-semibold mb-2">로그인하고 내 팀을 관리하세요</p>
          <p className="text-gray-400 text-sm mb-4">현재 샘플 데이터로 표시하고 있습니다</p>
          <Link href="/login" className="inline-block px-6 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 border" style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-primary)", borderColor: "rgba(255,255,255,0.15)" }}>
            로그인
          </Link>
        </div>
      )}
      <div>
      <div className="max-w-5xl mx-auto px-2 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">팀 관리</h1>
        {!isDemo && teams && teams.length > 1 && (
          <select
            value={currentTeam?.id || ''}
            onChange={e => { 
              const t = teams.find((team: any) => team.id === e.target.value); 
              if (t && onTeamChange) onTeamChange(t); 
            }}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
          >
            {teams.map((t: any) => (
              <option key={t.id} value={t.id} style={{ background: "var(--dropdown-bg)", color: "var(--text-primary)" }}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* 우리 팀 정보 */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 팀 로고 */}
            <div className="relative group">
              {club.image ? (
                <img src={club.image} alt={club.name} className="w-16 h-16 rounded-xl object-cover border border-white/10" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                  <Shield size={24} className="text-gray-500" />
                </div>
              )}
              {!isDemo && hasFullEditPermission && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Pencil size={16} className="text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !currentTeam?.id) return;
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const base64 = reader.result as string;
                      try {
                        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clubs`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ clubId: currentTeam.id, logoUrl: base64 }),
                        });
                        window.location.reload();
                      } catch { alert("로고 변경에 실패했습니다"); }
                    };
                    reader.readAsDataURL(file);
                  }} />
                </label>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{club.name}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {finalAreas}{finalStyles ? ` · ${finalStyles}` : ""}
                {club.description ? ` · ${club.description}` : ""}
              </p>
            </div>
          </div>
          {!isDemo && (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleRecruiting}
                disabled={recruitingLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border disabled:opacity-50"
                style={recruiting
                  ? { background: "#000000", color: "#ffffff", borderColor: "#000000" }
                  : { background: "rgba(255,255,255,0.08)", color: "var(--text-primary)", borderColor: "rgba(255,255,255,0.15)" }}
              >
                <Users size={13} />{recruiting ? "모집중" : "모집 시작"}
              </button>
              <button
                onClick={() => onInviteClick()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border"
                style={{ background: "#ffffff", color: "#000000", borderColor: "#ffffff" }}
              >
                <UserPlus size={13} />선수 초대
              </button>
            </div>
          )}
        </div>

        {/* 팀 기본 정보 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "종목", value: club.sport || "-" },
            { label: "전적", value: finalRecord },
            { label: "멤버", value: `${club.members || members.length}명` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-lg p-3 text-center">
              <p className="font-bold text-sm text-black">{value}</p>
              <p className="text-gray-500 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* 선수 명단 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-gray-400" />
            <span className="text-sm text-gray-400">
              선수 명단 ({members.length}명)
              {loadingMembers && <span className="ml-1 text-xs text-gray-600">로딩중...</span>}
            </span>
          </div>
          {!isDemo && hasFullEditPermission && (
            <button
              onClick={() => { setMemberEditing(!memberEditing); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
            >
              <Pencil size={12} />
              {memberEditing ? "완료" : "수정"}
            </button>
          )}
        </div>

        {/* 운영진 */}
        {(() => {
          const staffRoles = ['leader', 'manager', 'treasurer', 'owner', 'coach'];
          const staffMembers = members.filter((m: any) => {
            const roles = m.roles?.length ? m.roles : (m.role ? [m.role] : []);
            return roles.some((r: string) => staffRoles.includes(r));
          });
          if (staffMembers.length === 0) return null;
          return (
            <div className="space-y-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">운영진</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {staffMembers.map((m: any, i: number) => {
                  const memberRoles = m.roles?.length ? m.roles : (m.role ? [m.role] : []);
                  const isLeaderMember = memberRoles.includes('leader');
                  const isManagerMember = memberRoles.includes('manager');
                  const displayName = memberNames[m.userId] || memberNames[m.email] || m.name || (m.userId ? m.userId.slice(0, 8) + '…' : m.email || '-');
                  const roleLabels = memberRoles
                    .filter((r: string) => staffRoles.includes(r))
                    .map((r: string) => r === 'leader' ? '주장' : r === 'manager' ? '관리자' : r === 'treasurer' ? '총무' : r === 'owner' ? '단장' : r === 'coach' ? '감독' : '');
                  return (
                    <div key={m.userId || m.email || i}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 bg-white"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isLeaderMember && <Crown size={12} className="text-yellow-500 shrink-0" />}
                        <span className="text-black text-sm font-medium truncate">{displayName}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {roleLabels.map((label: string, idx: number) => (
                          <span key={idx} className="text-xs px-2 py-0.5 rounded-full font-semibold bg-black text-white">{label}</span>
                        ))}
                        {memberEditing && !isDemo && hasFullEditPermission && (
                          <button onClick={(e) => { e.stopPropagation(); setEditingMember(m); setEditForm({ position: m.position || "", roles: m.roles || (m.role ? [m.role] : ['member']) }); }}
                            className="text-gray-500 hover:text-white transition-colors ml-1"><Pencil size={11} /></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 전체 명단 */}
        <div className="space-y-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">전체 명단</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {[...members].sort((a, b) => {
            const numA = a.jerseyNumber ?? 9999;
            const numB = b.jerseyNumber ?? 9999;
            return numA - numB;
          }).map((m: any, i: number) => {
            const memberRoles = m.roles?.length ? m.roles : (m.role ? [m.role] : []);
            const isLeaderMember = memberRoles.includes('leader');
            const isManagerMember = memberRoles.includes('manager');
            const displayName = memberNames[m.userId] || memberNames[m.email] || m.name || (m.userId ? m.userId.slice(0, 8) + '…' : m.email || '-');
            const jerseyNum = memberNumbers[m.userId] || memberNumbers[m.email] || m.jerseyNumber;
            return (
              <div key={m.userId || m.email || i}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 ${isLeaderMember ? "bg-white border border-white/50" : "bg-white"}`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isLeaderMember && <Crown size={12} className="text-yellow-500 shrink-0" />}
                  {jerseyNum && (
                    <span className="text-xs font-bold text-gray-500 shrink-0">#{jerseyNum}</span>
                  )}
                  <span className="text-black text-sm font-medium truncate">{displayName}</span>
                  {m.position && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${positionColor[m.position] || "bg-gray-200 text-gray-600"}`}>{m.position}</span>
                  )}
                  {memberRoles.length > 0 && (() => {
                    const roleLabel: Record<string, string> = { leader: '주장', manager: '관리자', treasurer: '총무', member: '멤버' };
                    const label = memberRoles.map((r: string) => roleLabel[r] || r).join('·');
                    return <span className="text-[10px] text-gray-400 shrink-0">{label}</span>;
                  })()}
                </div>
                <div className="flex gap-1 shrink-0">
                  {memberEditing && !isDemo && hasFullEditPermission && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingMember(m); setEditForm({ position: m.position || "", roles: m.roles || (m.role ? [m.role] : ['member']) }); }}
                      className="text-gray-500 hover:text-white transition-colors"
                    >
                      <Pencil size={11} />
                    </button>
                  )}
                  {memberEditing && !isDemo && hasFullEditPermission && !isLeaderMember && !isManagerMember && currentUser?.username !== m.userId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMemberAPI(m.userId); }}
                      className="text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {members.length === 0 && !loadingMembers && (
            <p className="text-xs text-gray-600 col-span-full text-center py-2">아직 등록된 멤버가 없습니다</p>
          )}
          </div>
        </div>

        {/* 신청자 명단 */}
        {!isDemo && hasFullEditPermission && joinRequests.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <Send size={14} className="text-gray-400" />
              <span className="text-sm text-gray-400">가입 신청 ({joinRequests.length}명)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {joinRequests.map((req) => (
                <div key={req.requestId} className="flex items-center justify-between rounded-lg px-3 py-2 bg-yellow-500/5 border border-yellow-500/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-white text-sm font-medium truncate">{req.name}</span>
                    {req.position && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${positionColor[req.position] || "bg-white/10 text-gray-400"}`}>{req.position}</span>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => acceptJoinRequest(req.requestId, req.name)}
                      className="text-xs px-2 py-1 rounded font-semibold" style={{ background: "#000", color: "#fff" }}>
                      승인
                    </button>
                    <button
                      onClick={() => rejectJoinRequest(req.requestId, req.name)}
                      className="text-xs px-2 py-1 rounded font-semibold text-gray-500 hover:text-red-400">
                      거절
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 공지사항 */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)' }}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          <h2 className="text-sm font-semibold text-gray-300">공지사항</h2>
        </div>
        <div className="space-y-3">
          {[
            { date: "2026.03.10", title: "3/15(토) vs FC 블루 경기 안내", content: "서경대 운동장 14시 집합. 유니폼 지참 필수." },
            { date: "2026.03.08", title: "3월 회비 납부 안내", content: "3월 회비 30,000원 15일까지 납부 부탁드립니다." },
            { date: "2026.03.05", title: "3/18(화) 정기 훈련 공지", content: "성북구 풋살장 19시. 개인 음료 준비해주세요." },
          ].map((notice, i) => (
            <div key={i} className="bg-white rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-black">{notice.title}</span>
                <span className="text-xs text-gray-500">{notice.date}</span>
              </div>
              <p className="text-xs text-gray-600">{notice.content}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 경기 일정 */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} style={{ color: 'var(--text-primary)' }} />
              <h2 className="text-sm font-semibold text-gray-300">다음 일정</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setScheduleEditMode(v => !v); setEditingMatchId(null); }}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${scheduleEditMode ? "bg-purple-600" : "bg-white/10 hover:bg-white/20"}`}>
                <Pencil size={13} className="text-gray-300" />
              </button>
              <button onClick={() => setShowScheduleForm(v => !v)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <Plus size={14} className="text-gray-300" />
              </button>
            </div>
          </div>

          {showScheduleForm && (
            <form onSubmit={saveSchedule} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">유형</label>
                <div className="flex gap-2">
                  {["경기", "훈련", "기타"].map(t => (
                    <button key={t} type="button" onClick={() => setScheduleForm(f => ({ ...f, type: t }))}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                      style={scheduleForm.type === t ? { background: "var(--btn-solid-bg)", color: "#fff" } : { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)", border: "1px solid var(--chip-inactive-border)" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {scheduleForm.type === "경기" && (
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs text-gray-400">상대 팀 ID</label>
                    <input value={scheduleForm.awayTeamId} onChange={e => setScheduleForm(f => ({ ...f, awayTeamId: e.target.value }))}
                      placeholder="상대 팀 ID" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30 placeholder:text-gray-600" />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">날짜</label>
                  <input required type="date" value={scheduleForm.date} onChange={e => setScheduleForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">시간</label>
                  <div className="flex gap-1">
                    <TimeSelect placeholder="시" value={scheduleForm.time.split(":")[0] || ""} onChange={v => setScheduleForm(f => ({ ...f, time: `${v}:${f.time.split(":")[1] || "00"}` }))} className="flex-1" />
                    <TimeSelect placeholder="분" value={scheduleForm.time.split(":")[1] || ""} onChange={v => setScheduleForm(f => ({ ...f, time: `${f.time.split(":")[0] || "00"}:${v}` }))} className="flex-1" />
                  </div>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs text-gray-400">장소</label>
                  <input required value={scheduleForm.venue} onChange={e => setScheduleForm(f => ({ ...f, venue: e.target.value }))}
                    placeholder="잠실 구장" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30 placeholder:text-gray-600" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowScheduleForm(false)} className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors">취소</button>
                <button type="submit" disabled={scheduleSaving} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-colors bg-black hover:bg-gray-900">
                  {scheduleSaving ? "등록 중..." : "등록"}
                </button>
              </div>
            </form>
          )}

          {/* Manage API 경기 일정 */}
          {manageMatches.length > 0 ? (
            <div className="space-y-3">
              {manageMatches.map((m: any) => {
                const dt = m.scheduledAt ? new Date(m.scheduledAt) : null;
                const dateStr = dt ? `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}` : "";
                const timeStr = dt ? `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}` : "";
                const myStatus = matchAttendance[m.id] ?? m.myAttendance ?? null;
                const attending = (m.attendances ?? []).filter((a: any) => a.status === "accepted");
                const notAttending = (m.attendances ?? []).filter((a: any) => a.status === "declined");
                // 이름 찾기: members 목록 우선(가장 정확), 없으면 userName, 그것도 없으면 이메일 앞부분
                const findName = (a: any) => {
                  const member = members.find((mem: any) => mem.userId === a.userId || mem.email === a.userId);
                  if (member?.name) return member.name;
                  if (a.userName && !a.userName.includes('@')) return a.userName;
                  return a.userId?.split('@')[0] || a.userName?.split('@')[0] || "?";
                };
                const isEditing = scheduleEditMode && editingMatchId === m.id;
                return (
                  <div key={m.id} className="bg-white rounded-lg p-4 space-y-3">
                    {/* 카드 헤더 */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${m.type === "경기" ? "text-black" : m.type === "훈련" ? "text-black" : "bg-gray-200 text-gray-600"}`}
                            style={m.type === "경기" ? { background: "#87CEEB" } : m.type === "훈련" ? { background: "#90EE90" } : {}}>
                            {m.type || "경기"}
                          </span>
                          {m.type === "경기" && <p className="text-black font-medium text-sm">vs {m.awayTeamName || m.awayTeamId || "상대팀"}</p>}
                          {m.type !== "경기" && <p className="text-black font-medium text-sm">{m.venue || "장소 미정"}</p>}
                        </div>
                        <p className="text-gray-500 text-xs">{dateStr} {timeStr}{m.type === "경기" ? ` · ${m.venue || "장소 미정"}` : ""}</p>
                      </div>
                      {scheduleEditMode && (
                        <button onClick={() => editingMatchId === m.id ? setEditingMatchId(null) : openEditMatch(m)}
                          className="text-gray-400 hover:text-black transition-colors shrink-0 ml-2">
                          <Pencil size={13} />
                        </button>
                      )}
                    </div>

                    {/* 편집 모드 */}
                    {isEditing && (
                      <div className="space-y-3 pt-2 border-t border-white/10">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs text-gray-400">날짜</label>
                            <input type="date" value={editMatchForm.date} onChange={e => setEditMatchForm(f => ({ ...f, date: e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-white/30" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-gray-400">시간</label>
                            <div className="flex gap-1">
                              <TimeSelect placeholder="시" value={editMatchForm.time.split(":")[0] || ""} onChange={v => setEditMatchForm(f => ({ ...f, time: `${v}:${f.time.split(":")[1] || "00"}` }))} className="flex-1" />
                              <TimeSelect placeholder="분" value={editMatchForm.time.split(":")[1] || ""} onChange={v => setEditMatchForm(f => ({ ...f, time: `${f.time.split(":")[0] || "00"}:${v}` }))} className="flex-1" />
                            </div>
                          </div>
                          <div className="space-y-1 col-span-2">
                            <label className="text-xs text-gray-400">장소</label>
                            <input value={editMatchForm.venue} onChange={e => setEditMatchForm(f => ({ ...f, venue: e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-white/30" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveEditMatch(m.id)} className="flex-1 py-1.5 rounded-md text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition-colors">저장</button>
                          <button onClick={() => setEditingMatchId(null)} className="flex-1 py-1.5 rounded-md text-xs font-semibold bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors">수정취소</button>
                        </div>
                      </div>
                    )}

                    {/* 경기완료/취소 — 수정모드에서만 표시 */}
                    {scheduleEditMode && (
                      <div className="flex gap-2">
                        <button onClick={() => { setResultMatchId(m.id); setResultForm({ ourScore: "", theirScore: "", scorers: [] }); }}
                          className="flex-1 py-1.5 rounded-md text-xs font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">경기완료</button>
                        <button onClick={() => cancelMatch(m.id)} className="flex-1 py-1.5 rounded-md text-xs font-semibold bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors">경기취소</button>
                      </div>
                    )}

                    {/* 참석/불참 버튼 */}
                    {!isEditing && (
                      <div className="flex gap-2">
                        <button onClick={() => respondAttendance(m.id, "accepted")}
                          className="flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors"
                          style={myStatus === "accepted" ? { background: "#ADD8E6", color: "#000000" } : { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)" }}>
                          참석
                        </button>
                        <button onClick={() => respondAttendance(m.id, "declined")}
                          className="flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors"
                          style={myStatus === "declined" ? { background: "#FF4500", color: "#ffffff" } : { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)" }}>
                          불참
                        </button>
                      </div>
                    )}

                    {/* 참석/불참 명단 */}
                    {(attending.length > 0 || notAttending.length > 0) && (
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        {attending.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-green-400 font-semibold">참석 ({attending.length})</span>
                            <div className="flex flex-wrap gap-1">
                              {attending.map((a: any, j: number) => (
                                <span key={j} className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-400">{findName(a)}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {notAttending.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-red-400 font-semibold">불참 ({notAttending.length})</span>
                            <div className="flex flex-wrap gap-1">
                              {notAttending.map((a: any, j: number) => (
                                <span key={j} className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400">{findName(a)}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-600 text-center py-4">등록된 경기 일정이 없습니다</p>
          )}
          
          {proposedMatches && proposedMatches.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 pt-1">경기 제안 받음</p>
              {proposedMatches.map((m: any) => (
                <div key={m.matchId} className="border border-white/20 bg-white/5 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-white font-medium text-sm">{clubNameMap?.[m.homeClubId] || m.homeClubId}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{m.sport} · {m.createdAt?.slice(0, 10)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => acceptMatchAPI?.(m.matchId)} className="flex-1 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1" style={{ background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)", color: "var(--text-primary)" }}>수락</button>
                    <button onClick={() => declineMatchAPI?.(m.matchId)} className="flex-1 py-1.5 rounded-md text-xs font-semibold bg-white/5 text-gray-400 hover:text-white transition-colors">거절</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {scheduledMatches && scheduledMatches.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 pt-1">진행중 경기</p>
              {scheduledMatches.map((m: any) => {
                const isHome = m.homeClubId === authClubId;
                const opponentName = clubNameMap?.[isHome ? m.awayClubId : m.homeClubId] || "상대팀";
                const alreadySubmitted = (isHome && m.homeSubmittedBy) || (!isHome && m.awaySubmittedBy);
                return (
                  <div key={m.matchId} className="border border-white/10 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-medium text-sm">vs {opponentName}</p>
                      <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                        {m.status === "disputed" ? "불일치" : alreadySubmitted ? "입력완료" : "대기중"}
                      </span>
                    </div>
                    {isLeaderUser && !alreadySubmitted && (
                      <button onClick={() => { setScoreModal(m); setScoreForm({ ourScore: "", theirScore: "" }); }}
                        className="w-full py-1.5 rounded-md text-xs font-semibold" style={{ background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)", color: "var(--text-primary)" }}>
                        결과 입력
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!authClubId && (
            <p className="text-xs text-gray-600 text-center py-2">Auth API 팀이 없어 경기 기록을 표시할 수 없습니다</p>
          )}
        </div>

        {/* 팀 스탯 */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} style={{ color: 'var(--text-primary)' }} />
              <h2 className="text-sm font-semibold text-gray-300">팀 스탯</h2>
            </div>
            <Link
              href="/team/compare"
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors hover:bg-white/10 flex items-center gap-1"
              style={{ color: "var(--accent)", border: "1px solid var(--accent)" }}>
              <Swords size={12} />
              팀 비교
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{finalRecord}</p>
              <p className="text-gray-500 text-xs mt-1">전적</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{finalWinRate}%</p>
              <p className="text-gray-500 text-xs mt-1">승률</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{club.members || members.length}</p>
              <p className="text-gray-500 text-xs mt-1">멤버</p>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">최근 5경기</p>
              <Link
                href="/team/matches"
                className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-white/10"
                style={{ color: "var(--text-secondary)" }}>
                전체보기 ({allConfirmed.length}경기) →
              </Link>
            </div>
            {allConfirmed.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-2">완료된 경기가 없습니다</p>
            ) : (
              <div className="space-y-2">
                {allConfirmed.slice(0, 5).map((m: any, i: number) => {
                  const isHome = m.homeClubId === authClubId;
                  const opponentName = m._fromManage ? (m.awayTeamName || m.awayTeamId || "상대팀") : (clubNameMap?.[isHome ? m.awayClubId : m.homeClubId] || "상대팀");
                  const ourScore = m._fromManage ? m.ourScore : (isHome ? m.homeScore : m.awayScore);
                  const theirScore = m._fromManage ? m.theirScore : (isHome ? m.awayScore : m.homeScore);
                  const result = m._fromManage ? (m.result === "win" ? "승" : m.result === "loss" ? "패" : "무") : (ourScore > theirScore ? "승" : ourScore < theirScore ? "패" : "무");
                  const resultColor = result === "승" ? "text-green-400" : result === "패" ? "text-red-400" : "text-gray-400";
                  const resultBg = result === "승" ? "bg-green-500/10" : result === "패" ? "bg-red-500/10" : "bg-white/5";
                  const myGoals = m._fromManage ? (m.scorers || []) : (m.goals || []).filter((g: any) => g.club === authClubId);
                  const matchDate = m._fromManage
                    ? (m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : m.confirmedAt?.slice(0, 10) || "")
                    : (m.confirmedAt?.slice(0, 10) || "");
                  const venue = m._fromManage ? (m.venue || "") : "";
                  return (
                    <div key={m.matchId ?? m.id ?? i} className={`rounded-lg p-3 ${result === "승" ? "bg-green-50" : result === "패" ? "bg-red-50" : "bg-white"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="text-black font-medium text-sm">vs {opponentName}</p>
                          <p className="text-gray-500 text-xs">{matchDate}{venue ? ` · ${venue}` : ""}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-black font-bold">{ourScore} - {theirScore}</p>
                          <p className={`text-xs font-semibold ${result === "승" ? "text-green-600" : result === "패" ? "text-red-600" : "text-gray-500"}`}>{result}</p>
                        </div>
                      </div>
                      {myGoals.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m._fromManage
                            ? myGoals.filter((s: any) => s.goals > 0 || s.assists > 0).map((s: any, j: number) => (
                                <span key={j} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                  {s.goals > 0 ? `⚽ ${s.name} ${s.goals}골` : ""}{s.goals > 0 && s.assists > 0 ? " " : ""}{s.assists > 0 ? `🅰️ ${s.assists}도움` : ""}
                                </span>
                              ))
                            : myGoals.map((g: any, j: number) => <span key={j} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">⚽ {g.scorerName || g.scorer?.split("@")[0]} ×{g.count}</span>)
                          }
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 탑플레이어 */}
          {(() => {
            const playerMap: Record<string, { name: string; goals: number; assists: number }> = {};
            completedManageMatches.forEach((m: any) => {
              (m.scorers || []).forEach((s: any) => {
                if (!s.userId) return;
                if (!playerMap[s.userId]) playerMap[s.userId] = { name: s.name || s.userId, goals: 0, assists: 0 };
                playerMap[s.userId].goals += Number(s.goals) || 0;
                playerMap[s.userId].assists += Number(s.assists) || 0;
              });
            });
            const topPlayers = Object.entries(playerMap)
              .map(([uid, p]) => ({ uid, ...p }))
              .filter(p => p.goals > 0 || p.assists > 0)
              .sort((a, b) => b.goals !== a.goals ? b.goals - a.goals : b.assists - a.assists)
              .slice(0, 5);
            if (topPlayers.length === 0) return null;
            const teamName = currentTeam?.name || "우리팀";
            return (
              <div>
                <p className="text-xs text-gray-500 mb-2">탑플레이어</p>
                <div className="rounded-lg overflow-hidden border border-white/10">
                  {/* 헤더 */}
                  <div className="grid grid-cols-[1fr_auto_auto] gap-0 px-3 py-1.5 border-b-2" style={{ borderBottomColor: "#c0392b", background: "rgba(255,255,255,0.04)" }}>
                    <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{teamName}</span>
                    <span className="text-xs font-semibold text-gray-400 w-12 text-center">득점</span>
                    <span className="text-xs font-semibold text-gray-400 w-12 text-center">도움</span>
                  </div>
                  {/* 선수 행 */}
                  {topPlayers.map((p, i) => (
                    <div key={p.uid} className={`grid grid-cols-[1fr_auto_auto] gap-0 px-3 py-2 items-center ${i % 2 === 0 ? "bg-white/0" : "bg-white/[0.02]"}`}>
                      <span className="text-sm" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                      <span className="text-sm font-bold text-center w-12" style={{ color: p.goals > 0 ? "var(--text-primary)" : "var(--text-secondary)" }}>{p.goals}</span>
                      <span className="text-sm text-center w-12" style={{ color: p.assists > 0 ? "var(--text-primary)" : "var(--text-secondary)" }}>{p.assists}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 팀 재정 관리 */}
      {!isDemo && (
        <FinanceSection 
          currentTeam={currentTeam} 
          members={members} 
          isLeaderUser={isLeaderUser}
          hasFullEditPermission={hasFullEditPermission}
          hasTreasurerPermission={hasTreasurerPermission}
        />
      )}


      {/* 활동 일정 (동아리형) */}
      {isCasual && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} style={{ color: 'var(--text-primary)' }} />
            <h2 className="text-sm font-semibold text-gray-300">활동 일정</h2>
          </div>
          <div className="border border-white/10 rounded-lg p-4 space-y-3">
            <p className="text-xs text-gray-400">새 활동 제안</p>
            <input type="datetime-local" value={activityForm?.date || ""} onChange={e => setActivityForm?.((p: any) => ({ ...p, date: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-white/30" style={{ colorScheme: "dark" }} />
            <input placeholder="장소" value={activityForm?.venue || ""} onChange={e => setActivityForm?.((p: any) => ({ ...p, venue: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-white/30 placeholder:text-gray-600" />
            <button onClick={() => createActivityAPI?.()} className="w-full py-1.5 rounded-md text-xs font-semibold" style={{ background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)", color: "var(--text-primary)" }}>
              활동 제안
            </button>
          </div>
          {(activities || []).filter((a: any) => a.status === "open").map((a: any) => (
            <div key={a.activityId} className="border border-white/10 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium text-sm">{a.venue || "장소 미정"}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{a.date?.replace("T", " ")}</p>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{(a.participants || []).length}명 참가</span>
              </div>
              <div className="flex gap-2">
                {!(a.participants || []).includes(currentUser?.email) && (
                  <button onClick={() => joinActivityAPI?.(a.activityId)} className="flex-1 py-1.5 rounded-md text-xs font-semibold" style={{ background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)", color: "var(--text-primary)" }}>참가</button>
                )}
                {a.createdBy === currentUser?.email && (
                  <button onClick={() => completeActivityAPI?.(a.activityId)} className="flex-1 py-1.5 rounded-md text-xs font-semibold bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors flex items-center justify-center gap-1">
                    <CheckCircle size={12} /> 완료
                  </button>
                )}
              </div>
            </div>
          ))}
          {(activities || []).filter((a: any) => a.status === "completed").length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">완료된 활동</p>
              {(activities || []).filter((a: any) => a.status === "completed").slice(0, 5).map((a: any) => (
                <div key={a.activityId} className="border border-white/10 rounded-lg p-3 opacity-60">
                  <p className="text-white text-sm">{a.venue || "장소 미정"} · {a.date?.slice(0, 10)}</p>
                  <p className="text-gray-500 text-xs">{(a.participants || []).length}명 참가 · +5점</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 스코어 입력 모달 */}
      {scoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "var(--modal-overlay)" }} onClick={() => setScoreModal(null)}>
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-xs space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold text-sm">결과 입력</span>
              <button onClick={() => setScoreModal(null)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">우리팀 스코어</label>
                <input type="number" min="0" value={scoreForm?.ourScore || ""} onChange={e => setScoreForm?.((p: any) => ({ ...p, ourScore: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">상대팀 스코어</label>
                <input type="number" min="0" value={scoreForm?.theirScore || ""} onChange={e => setScoreForm?.((p: any) => ({ ...p, theirScore: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30" />
              </div>
            </div>
            <button onClick={() => submitScoreAPI?.()} className="w-full py-2 rounded-lg font-semibold text-sm" style={{ background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)", color: "var(--text-primary)" }}>입력</button>
          </div>
        </div>
      )}

      {/* 골 기록 추가 모달 */}
      {goalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "var(--modal-overlay)" }} onClick={() => setGoalModal(null)}>
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-xs space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold text-sm">골 기록 추가</span>
              <button onClick={() => setGoalModal(null)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {members.map((m: any) => {
                const displayName = memberNames[m.userId] || m.name || (m.userId ? m.userId.slice(0, 8) + '…' : m.email || '-');
                return (
                  <div key={m.userId || m.email} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                    <span className="text-white text-sm">{displayName}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setGoalSelections?.((p: any) => ({ ...p, [m.userId || m.email]: Math.max(0, (p[m.userId || m.email] || 0) - 1) }))}
                        className="w-6 h-6 rounded bg-white/10 text-gray-400 flex items-center justify-center text-xs">-</button>
                      <span className="text-white text-sm w-4 text-center">{goalSelections?.[m.userId || m.email] || 0}</span>
                      <button onClick={() => setGoalSelections?.((p: any) => ({ ...p, [m.userId || m.email]: (p[m.userId || m.email] || 0) + 1 }))}
                        className="w-6 h-6 rounded bg-white/20 text-white flex items-center justify-center text-xs">+</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => addGoalsAPI?.()} className="w-full py-2 rounded-lg font-semibold text-sm" style={{ background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)", color: "var(--text-primary)" }}>저장</button>
          </div>
        </div>
      )}

      {/* 멤버 수정 모달 (역할만 수정 가능 - 포지션/등번호는 마이페이지에서 개인이 설정) */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "var(--modal-overlay)" }} onClick={() => setEditingMember(null)}>
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold text-sm">역할 수정</span>
              <button onClick={() => setEditingMember(null)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>
            <p className="text-xs text-gray-500">포지션과 등번호는 마이페이지에서 개인이 설정합니다</p>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">역할</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "member", label: "멤버" },
                  { value: "owner", label: "단장" },
                  { value: "coach", label: "감독" },
                  { value: "manager", label: "관리자" },
                  { value: "treasurer", label: "총무" },
                  { value: "leader", label: "주장" },
                ].map(role => {
                  const isSelected = editForm.roles.includes(role.value);
                  return (
                    <button 
                      key={role.value} 
                      type="button" 
                      onClick={() => setEditForm((p: any) => {
                        const specialRoles = ['leader', 'manager', 'treasurer', 'owner', 'coach'];
                        let newRoles: string[];
                        
                        if (role.value === 'member') {
                          // 멤버 클릭: 멤버만 선택 (다른 역할 모두 해제)
                          newRoles = isSelected ? [] : ['member'];
                        } else {
                          // 주장/관리자/총무 클릭: 멤버 해제하고 토글
                          const currentSpecial = p.roles.filter((r: string) => specialRoles.includes(r));
                          if (isSelected) {
                            newRoles = currentSpecial.filter((r: string) => r !== role.value);
                          } else {
                            newRoles = [...currentSpecial, role.value];
                          }
                        }
                        
                        return { ...p, roles: newRoles.length > 0 ? newRoles : ['member'] };
                      })}
                      className={`flex-1 text-xs px-2 py-1.5 rounded font-semibold transition-colors ${isSelected ? "bg-white/20 text-white border border-white/30" : "bg-white/5 text-gray-500"}`}>
                      {role.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <button onClick={saveEditMember}
              className="w-full py-2 rounded-lg font-semibold text-sm"
              style={{ background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)", color: "var(--text-primary)" }}>저장</button>
          </div>
        </div>
      )}

      {/* 초대 모달 */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "var(--modal-overlay)" }} onClick={() => setInviteOpen(false)}>
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold">선수 초대</span>
              <button onClick={() => setInviteOpen(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>
            <p className="text-xs text-gray-400">아래 링크를 공유하면 팀에 합류할 수 있어요</p>
            {inviteLoading ? (
              <div className="flex justify-center py-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : inviteUrl ? (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                <span className="text-gray-300 text-xs flex-1 truncate">{inviteUrl}</span>
                <button onClick={copy} className="shrink-0 text-gray-400 hover:text-white transition-colors">
                  {copied ? <Check size={14} className="text-white" /> : <Copy size={14} />}
                </button>
              </div>
            ) : (
              <p className="text-xs text-red-400 text-center">초대 링크 생성에 실패했습니다</p>
            )}
            {copied && <p className="text-xs text-white text-center">링크가 복사되었어요</p>}
          </div>
        </div>
      )}

      {/* 채팅 모달 */}
      {chatTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "var(--modal-overlay)" }} onClick={() => setChatTeam(null)}>
          <div className="bg-[#111] border border-white/10 rounded-xl w-full max-w-sm flex flex-col" style={{ height: 420 }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-white font-semibold text-sm">{chatTeam.team}</span>
              <button onClick={() => setChatTeam(null)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {(msgs[chatTeam.id] ?? []).map((m: ChatMsg, i: number) => (
                <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                  <span className={`text-xs px-3 py-2 rounded-2xl max-w-[75%] ${m.from === "me" ? "" : "bg-white/10 text-gray-200"}`}
                    style={m.from === "me" ? { background: "rgba(255,255,255,0.1)", color: "var(--text-primary)", border: "1px solid rgba(255,255,255,0.2)" } : {}}>
                    {m.text}
                  </span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="flex gap-2 px-4 py-3 border-t border-white/10">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()}
                placeholder="메시지 입력..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-white/30" />
              <button onClick={sendMsg} className="px-3 py-2 rounded-lg border" style={{ background: "rgba(255,255,255,0.1)", color: "var(--text-primary)", borderColor: "rgba(255,255,255,0.2)" }}>
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 커스텀 확인 모달 */}
      <ConfirmModal state={confirmModal} onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))} />
    </div>
    </div>
    </div>
  );
}


// ─── Finance Section ─────────────────────────────────────────────────────────

const FEE = 30000;

const categoryColors: Record<string, string> = {
  "구장 대여": "bg-blue-500/20 text-blue-400",
  "유니폼": "bg-white/20 text-white",
  "간식": "bg-yellow-500/20 text-yellow-400",
  "기타": "bg-white/10 text-gray-400",
};

interface FinanceMember { userId: string; role: string; joinedAt: string }
interface Due { id: string; memberId: string; amount: number; paid: boolean; paidAt?: string; createdAt: string }
interface Transaction { id: string; category: string; amount: number; description?: string; type?: string; date?: string; createdAt: string }

function FinanceSection({ currentTeam, members, isLeaderUser, hasFullEditPermission, hasTreasurerPermission }: { 
  currentTeam: any; 
  members: any[]; 
  isLeaderUser: boolean;
  hasFullEditPermission: boolean;
  hasTreasurerPermission: boolean;
}) {
  const [financeExpanded, setFinanceExpanded] = useState(false);
  const [duesList, setDuesList] = useState<Due[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selMonth, setSelMonth] = useState(new Date().toISOString().slice(0, 7));
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ category: "", amount: "", memo: "" });

  const loadDues = async (tid: string) => {
    const data = await manageFetch(`/finance/dues?teamId=${tid}`).catch(() => []);
    setDuesList(data ?? []);
  };

  useEffect(() => {
    if (!currentTeam) return;
    setLoading(true);
    Promise.all([
      manageFetch(`/finance/dues?teamId=${currentTeam.id}`).catch(() => []),
      manageFetch(`/finance/transactions?teamId=${currentTeam.id}`).catch(() => []),
    ]).then(([teamDues, teamTxns]) => {
      setDuesList(teamDues ?? []);
      setTransactions(teamTxns ?? []);
    }).finally(() => setLoading(false));
  }, [currentTeam?.id]);

  const expenses = transactions
    .filter((t) => !t.type || t.type === "expense")
    .map((t) => ({
      id: t.id,
      month: (t.date || t.createdAt).slice(0, 7),
      category: t.category || "기타",
      amount: t.amount,
      memo: t.description || "",
    }));

  const months = (() => {
    const txMonths = expenses.map((e) => e.month);
    const all = new Set([...txMonths, new Date().toISOString().slice(0, 7)]);
    return Array.from(all).sort().slice(-3);
  })();

  const paidList = members.map((m) => {
    const memberDues = duesList.filter((d) => d.memberId === m.userId);
    const unpaidDue = memberDues.find((d) => !d.paid);
    const paid = memberDues.some((d) => d.paid);
    return { userId: m.userId, paid, dueId: unpaidDue?.id ?? null };
  });

  const totalCollected = paidList.filter((m) => m.paid).length * FEE;
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = totalCollected - totalSpent;
  const monthExpenses = expenses.filter((e) => e.month === selMonth);
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const monthTotals = months.map((m) => ({
    month: m,
    total: expenses.filter((e) => e.month === m).reduce((s, e) => s + e.amount, 0),
  }));
  const avgMonthly = months.length
    ? Math.round(monthTotals.reduce((s, m) => s + m.total, 0) / months.length)
    : 0;
  const recommendedFee = members.length ? Math.ceil(avgMonthly / members.length / 1000) * 1000 : 0;
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => { categoryTotals[e.category] = (categoryTotals[e.category] ?? 0) + e.amount; });
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const unpaidMembers = paidList.filter((m) => !m.paid).map((m) => m.userId);
  const aiComment =
    remaining < 0
      ? `⚠️ 잔액이 부족해요! ${Math.abs(remaining).toLocaleString()}원 초과 지출 상태예요.`
      : remaining < 50000
      ? `💡 잔액이 ${remaining.toLocaleString()}원으로 적어요. 다음 달 회비 수금을 서두르세요.`
      : `✅ 현재 잔액 ${remaining.toLocaleString()}원으로 안정적이에요. 미납 ${unpaidMembers.length}명 독촉을 권장해요.`;

  const togglePaid = async (member: { userId: string; paid: boolean; dueId: string | null }) => {
    if (!currentTeam || member.paid) return;
    try {
      if (member.dueId) {
        await manageFetch(`/finance/dues/${member.dueId}/pay`, { method: "PATCH" });
      } else {
        const due: Due = await manageFetch("/finance/dues", {
          method: "POST",
          body: JSON.stringify({ teamId: currentTeam.id, memberId: member.userId, amount: FEE }),
        });
        await manageFetch(`/finance/dues/${due.id}/pay`, { method: "PATCH" });
      }
      await loadDues(currentTeam.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "처리 실패");
    }
  };

  const deleteExpense = async (id: string) => {
    if (!currentTeam || !confirm('이 지출 항목을 삭제하시겠습니까?')) return;
    try {
      await manageFetch(`/finance/transactions/${id}`, { method: 'DELETE' });
      setTransactions((p) => p.filter((t) => t.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  const deleteDue = async (dueId: string) => {
    if (!currentTeam || !confirm('이 회비 기록을 삭제하시겠습니까?')) return;
    try {
      await manageFetch(`/finance/dues/${dueId}`, { method: 'DELETE' });
      setDuesList((p) => p.filter((d) => d.id !== dueId));
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  const addExpense = async () => {
    if (!draft.category || !draft.amount || !currentTeam) return;
    try {
      const newTxn: Transaction = await manageFetch("/finance/transactions", {
        method: "POST",
        body: JSON.stringify({
          teamId: currentTeam.id,
          category: draft.category,
          amount: Number(draft.amount),
          description: draft.memo,
          type: "expense",
          date: `${selMonth}-01`,
        }),
      });
      setTransactions((p) => [...p, newTxn]);
      setDraft({ category: "", amount: "", memo: "" });
      setAdding(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "지출 추가 실패");
    }
  };

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex justify-center items-center py-10">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // 재정 관리 편집 권한: 주장, 관리자, 총무
  const canEditFinance = hasFullEditPermission || hasTreasurerPermission;

  return (
    <div className="space-y-4">
      <button 
        onClick={() => setFinanceExpanded(!financeExpanded)}
        className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wallet size={16} style={{ color: 'var(--text-primary)' }} />
          <h2 className="text-lg font-bold text-white">팀 재정 관리</h2>
          {canEditFinance && (
            <span className="text-xs text-gray-500 ml-2">편집 권한 있음</span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{financeExpanded ? "▲" : "▼"}</span>
      </button>

      {financeExpanded && (
        <div className="space-y-6">

      {/* AI 분석 */}
      <div className="bg-white/5 border border-white/20 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bot size={15} style={{ color: 'var(--text-primary)' }} />
          <span className="text-sm font-semibold text-gray-300">AI 분석</span>
          <span className="text-xs text-gray-500 ml-auto">{aiComment}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-xl p-4 space-y-1">
            <p className="text-xs text-gray-500">월 적정 회비 추정</p>
            <p className="text-white text-xl font-bold">{recommendedFee.toLocaleString()}원</p>
            <p className="text-gray-500 text-xs">월 평균 지출 {avgMonthly.toLocaleString()}원 ÷ {members.length}명</p>
            <div className="mt-2 space-y-1">
              {monthTotals.map(({ month, total }) => {
                const maxTotal = Math.max(...monthTotals.map((m) => m.total), 1);
                return (
                  <div key={month} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-8">{month.slice(5)}월</span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full">
                      <div className="h-1.5 rounded-full bg-white/60" style={{ width: `${Math.round((total / maxTotal) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-16 text-right">{total.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 space-y-1">
            <p className="text-xs text-gray-500">가장 많은 지출</p>
            <p className="text-white text-xl font-bold">{topCategory?.[0] ?? "없음"}</p>
            <p className="text-gray-500 text-xs">전체 {topCategory?.[1].toLocaleString() ?? 0}원 지출</p>
            <div className="mt-2 space-y-1">
              {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-14 truncate">{cat}</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full">
                    <div className="h-1.5 rounded-full bg-white/60" style={{ width: `${topCategory ? Math.round((amt / topCategory[1]) * 100) : 0}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-16 text-right">{amt.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 space-y-1">
            <p className="text-xs text-gray-500">미납 멤버</p>
            <p className="text-white text-xl font-bold">{unpaidMembers.length}명</p>
            <p className="text-gray-500 text-xs">미수금 {(unpaidMembers.length * FEE).toLocaleString()}원</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {unpaidMembers.length === 0
                ? <span className="text-xs text-green-400">전원 납부 완료 ✅</span>
                : unpaidMembers.map((uid) => (
                  <span key={uid} className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-mono">{uid.slice(0, 8)}…</span>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "총 수금액", value: totalCollected, color: "text-white" },
          { label: "총 지출액", value: totalSpent, color: "text-red-400" },
          { label: "현재 잔액", value: remaining, color: remaining >= 0 ? "text-green-400" : "text-red-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className={`text-xl font-bold ${color}`}>{value.toLocaleString()}원</p>
            <p className="text-gray-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 회비 납부 현황 */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Wallet size={15} style={{ color: 'var(--text-primary)' }} />
            <span className="text-sm font-semibold text-gray-300">회비 납부 현황</span>
            <span className="ml-auto text-xs text-gray-500">{FEE.toLocaleString()}원/인</span>
          </div>
          {paidList.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-4">팀 멤버가 없습니다</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {paidList.map((m) => (
                <button
                  key={m.userId}
                  onClick={() => togglePaid(m)}
                  disabled={m.paid}
                  className="flex items-center justify-between px-3 py-2 rounded-lg transition-all disabled:cursor-default"
                  style={{
                    background: m.paid ? "rgba(255,255,255,0.1)" : "transparent",
                    border: `2px solid ${m.paid ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)"}`,
                  }}
                >
                  <span className={`text-sm font-medium ${m.paid ? "text-white" : "text-gray-400"}`}>
                    {m.userId.slice(0, 10)}…
                  </span>
                  <span className={`text-xs font-semibold ${m.paid ? "text-white" : "text-gray-600"}`}>
                    {m.paid ? "납부" : "미납"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 월별 지출 */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingDown size={15} style={{ color: 'var(--text-primary)' }} />
            <span className="text-sm font-semibold text-gray-300">월별 지출</span>
            <button onClick={() => setAdding(true)} className="ml-auto text-gray-500 hover:text-white transition-colors">
              <Plus size={15} />
            </button>
          </div>

          <div className="flex gap-2">
            {months.map((m) => (
              <button
                key={m}
                onClick={() => setSelMonth(m)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                style={
                  selMonth === m
                    ? { background: "rgba(255,255,255,0.15)", color: "var(--text-primary)", border: "1px solid rgba(255,255,255,0.2)" }
                    : { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)" }
                }
              >
                {m.slice(5)}월
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {monthExpenses.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-4">이 달의 지출 내역이 없습니다</p>
            ) : (
              monthExpenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${categoryColors[e.category] ?? categoryColors["기타"]}`}>{e.category}</span>
                    <span className="text-gray-400 text-xs">{e.memo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-semibold">{e.amount.toLocaleString()}원</span>
                    {isLeaderUser && (
                      <button onClick={() => deleteExpense(e.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
            <div className="flex justify-between pt-1 border-t border-white/10">
              <span className="text-xs text-gray-500">합계</span>
              <span className="text-sm font-bold text-red-400">{monthTotal.toLocaleString()}원</span>
            </div>
          </div>

          {adding && (
            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">지출 추가</span>
                <button onClick={() => setAdding(false)} className="text-gray-500 hover:text-white"><X size={13} /></button>
              </div>
              {[
                { ph: "카테고리 (예: 구장 대여)", key: "category" },
                { ph: "금액", key: "amount", type: "number" },
                { ph: "메모", key: "memo" },
              ].map(({ ph, key, type }) => (
                <input
                  key={key}
                  type={type ?? "text"}
                  placeholder={ph}
                  value={draft[key as keyof typeof draft]}
                  onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-white/30 placeholder:text-gray-600"
                />
              ))}
              <button onClick={addExpense} className="w-full py-1.5 rounded-lg text-xs font-semibold border" style={{ background: "rgba(255,255,255,0.1)", color: "var(--text-primary)", borderColor: "rgba(255,255,255,0.2)" }}>추가</button>
            </div>
          )}
        </div>
      </div>
        </div>
      )}
    </div>
  );
}
