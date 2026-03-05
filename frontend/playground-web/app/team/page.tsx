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

// Auth API fetch — /matches, /activities, /clubs (레이팅 시스템용, G-1b 유지)
const AUTH_API = process.env.NEXT_PUBLIC_API_URL;
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

  // 초대 링크 (Manage API)
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // currentTeam이 바뀌면 Manage API에서 멤버 로드
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!currentTeam) { setMembers([]); return; }
    setLoadingMembers(true);
    manageFetch(`/team/${currentTeam.id}/members`)
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [currentTeam?.id]);

  // Auth API — 매치·활동 (G-1b: 레이팅 시스템 의존성으로 Auth API 유지)
  const [matches, setMatches] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [allClubs, setAllClubs] = useState<any[]>([]);
  const [goalModal, setGoalModal] = useState<any>(null);
  const [goalSelections, setGoalSelections] = useState<Record<string, number>>({});
  const [activityForm, setActivityForm] = useState({ date: "", venue: "" });
  const [scoreModal, setScoreModal] = useState<any>(null);
  const [scoreForm, setScoreForm] = useState({ ourScore: "", theirScore: "" });
  const router = useRouter();

  useEffect(() => {
    if (!authClubId) return;
    authFetch(`/matches?clubId=${authClubId}`).then(d => setMatches(d.matches || [])).catch(() => {});
    authFetch(`/activities?clubId=${authClubId}`).then(d => setActivities(d.activities || [])).catch(() => {});
    authFetch('/clubs').then(d => setAllClubs(d.clubs || [])).catch(() => {});
  }, [authClubId]);

  const clubNameMap: Record<string, string> = {};
  allClubs.forEach((c: any) => { clubNameMap[c.clubId] = c.name; });

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
      await manageFetch(`/team/${currentTeam.id}/members/${editingMember.userId}`, {
        method: "PATCH",
        body: JSON.stringify({ position: editForm.position, roles: editForm.roles }),
      });
      setMembers(prev => prev.map(m => m.userId === editingMember.userId ? { ...m, position: editForm.position, roles: editForm.roles } : m));
      setEditingMember(null);
    } catch { alert("멤버 수정에 실패했습니다"); }
  }

  // 멤버 삭제 (Manage API)
  async function deleteMemberAPI(userId: string) {
    if (!currentTeam) return;
    if (!confirm('이 멤버를 팀에서 제거하시겠습니까?')) return;
    try {
      await manageFetch(`/team/${currentTeam.id}/members/${userId}`, { method: 'DELETE' });
      setMembers(prev => prev.filter(m => m.userId !== userId));
    } catch (e) {
      alert(e instanceof Error ? e.message : '멤버 삭제에 실패했습니다');
    }
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
  const currentUserRoles = currentMember?.roles || (currentMember?.role ? [currentMember.role] : ['member']);
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
    return <TeamPageContent club={null} members={[]} isDemo={false} />;
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

  return (<>
    {teams.length > 1 && (
      <div className="max-w-4xl mx-auto mb-4 flex items-center gap-2">
        <span className="text-xs text-gray-500">팀 선택</span>
        <select
          value={currentTeam.id}
          onChange={e => { const t = teams.find(t => t.id === e.target.value); if (t) setCurrentTeam(t); }}
          className="px-3 py-1.5 rounded-lg text-sm outline-none"
          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
        >
          {teams.map(t => (
            <option key={t.id} value={t.id} style={{ background: "var(--dropdown-bg)", color: "var(--text-primary)" }}>{t.name}</option>
          ))}
        </select>
      </div>
    )}
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
        if (m) setEditingMember({ userId: m.userId, position: m.position || '', roles: m.roles || (m.role ? [m.role] : ['member']) });
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
    />
  </>);
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
  proposedMatches = [], confirmedMatches = [], scheduledMatches = [],
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
}: any) {
  if (!club) {
    return (
      <div className="max-w-4xl mx-auto pt-20 text-center space-y-4">
        <Shield size={40} className="text-gray-600 mx-auto" />
        <p className="text-gray-400 text-sm">소속된 팀이 없습니다</p>
        <Link href="/manage/team" className="inline-block px-6 py-2 rounded-xl text-sm font-semibold border" style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-primary)", borderColor: "rgba(255,255,255,0.15)" }}>
          팀 만들기
        </Link>
      </div>
    );
  }

  const finalRecord = record || club.record || "0승 0무 0패";
  const finalAreas = areas || (club.areas || []).map((a: any) => [a.sido, a.sigungu].filter(Boolean).join(" ")).join(", ");
  const finalStyles = styles || (club.styles || []).join(", ");

  return (
    <div>
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
      <div className="max-w-4xl mx-auto space-y-6">
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
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Shield size={18} style={{ color: 'var(--text-primary)' }} />
                <h2 className="text-lg font-bold text-white">{club.name}</h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {finalAreas}{finalStyles ? ` · ${finalStyles}` : ""}
                {club.description ? ` · ${club.description}` : ""}
              </p>
            </div>
          </div>
          {!isDemo && (
            <button
              onClick={() => onInviteClick()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border"
              style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-primary)", borderColor: "rgba(255,255,255,0.15)" }}
            >
              <UserPlus size={13} />선수 초대
            </button>
          )}
        </div>

        {/* 팀 기본 정보 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "종목", value: club.sport || "-" },
            { label: "전적", value: finalRecord },
            { label: "멤버", value: `${club.members || members.length}명` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/5 rounded-lg p-3 text-center">
              <p style={{ color: 'var(--text-primary)' }} className="font-bold text-sm">{value}</p>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {members.map((m: any, i: number) => {
            const memberRoles = m.roles || (m.role ? [m.role] : []);
            const isLeaderMember = memberRoles.includes('leader');
            const displayName = m.name || (m.userId ? m.userId.slice(0, 8) + '…' : m.email || '-');
            const roleLabels = memberRoles
              .filter((r: string) => r !== 'member')
              .map((r: string) => r === 'leader' ? '주장' : r === 'manager' ? '관리자' : r === 'treasurer' ? '총무' : '')
              .filter(Boolean);
            return (
              <div key={m.userId || m.email || i}
                className={`flex flex-col gap-1 rounded-lg px-3 py-2 ${isLeaderMember ? "bg-white/10 border border-white/20" : "bg-white/5"}`}
              >
                <div className="flex items-center gap-2">
                  {isLeaderMember && <Crown size={12} className="text-yellow-400 shrink-0" />}
                  <span className="text-white text-sm font-medium flex-1 truncate">{displayName}</span>
                  {m.position && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${positionColor[m.position] || "bg-white/10 text-gray-400"}`}>{m.position}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {roleLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {roleLabels.map((label: string, idx: number) => (
                        <span key={idx} className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(255,255,255,0.1)", color: "var(--text-primary)" }}>
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1 ml-auto">
                    {!isDemo && !memberEditing && currentUser?.username !== m.userId && m.userId && (
                      <button
                        onClick={(e) => { e.stopPropagation(); router?.push(`/chat?to=${m.userId}&name=${encodeURIComponent(displayName)}`); }}
                        className="text-gray-500 hover:text-white transition-colors shrink-0"
                      >
                        <MessageCircle size={12} />
                      </button>
                    )}
                    {memberEditing && !isDemo && hasFullEditPermission && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingMember(m); setEditForm({ position: m.position || "", roles: m.roles || (m.role ? [m.role] : ['member']) }); }}
                        className="text-gray-500 hover:text-white transition-colors shrink-0"
                      >
                        <Pencil size={11} />
                      </button>
                    )}
                    {memberEditing && !isDemo && hasFullEditPermission && !isLeaderMember && currentUser?.username !== m.userId && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMemberAPI(m.userId); }}
                        className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {members.length === 0 && !loadingMembers && (
            <p className="text-xs text-gray-600 col-span-full text-center py-2">아직 등록된 멤버가 없습니다</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 경기 일정 */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} style={{ color: 'var(--text-primary)' }} />
            <h2 className="text-sm font-semibold text-gray-300">다음 경기 일정</h2>
          </div>
          
          {/* 예정된 경기 (Mock 데이터 또는 실제 데이터) */}
          {(scheduledMatches ?? []).filter((m: any) => m.status === "scheduled").length === 0 && !isDemo ? (
            <div className="space-y-3">
              {[
                { 
                  date: "2024-03-22", 
                  time: "14:00", 
                  opponent: "강남 FC", 
                  venue: "강남구민체육센터",
                  attending: ["김민수", "이준호", "박지성", "최태욱"],
                  notAttending: ["정우성"]
                },
                { 
                  date: "2024-03-29", 
                  time: "16:00", 
                  opponent: "서초 유나이티드", 
                  venue: "서초구민운동장",
                  attending: ["김민수", "이준호", "박지성"],
                  notAttending: ["최태욱", "정우성"]
                },
              ].map((match, i) => (
                <div key={i} className="border border-white/10 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-white font-medium text-sm">vs {match.opponent}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{match.date} {match.time} · {match.venue}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setAttendance((prev: Record<string, boolean | null>) => ({ ...prev, [`mock-${i}`]: true }))}
                      className="flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors"
                      style={attendance[`mock-${i}`] === true ? { background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)", color: "var(--text-primary)" } : { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)" }}>
                      참석
                    </button>
                    <button onClick={() => setAttendance((prev: Record<string, boolean | null>) => ({ ...prev, [`mock-${i}`]: false }))}
                      className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${attendance[`mock-${i}`] === false ? "bg-red-500 text-white" : "bg-white/5 text-gray-400 hover:text-white"}`}>
                      불참
                    </button>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-400 font-semibold">참석 ({match.attending.length})</span>
                      <div className="flex flex-wrap gap-1">
                        {match.attending.map((name, j) => (
                          <span key={j} className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-400">{name}</span>
                        ))}
                      </div>
                    </div>
                    {match.notAttending.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-400 font-semibold">불참 ({match.notAttending.length})</span>
                        <div className="flex flex-wrap gap-1">
                          {match.notAttending.map((name, j) => (
                            <span key={j} className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400">{name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            (scheduledMatches ?? []).filter((m: any) => m.status === "scheduled").map((m: any) => {
              const isHome = m.homeClubId === authClubId;
              const opponentName = clubNameMap?.[isHome ? m.awayClubId : m.homeClubId] || "상대팀";
              return (
                <div key={m.matchId} className="border border-white/10 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-white font-medium text-sm">vs {opponentName}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{m.date || m.createdAt?.slice(0, 10)} · {m.venue || "장소 미정"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setAttendance((prev: Record<string, boolean | null>) => ({ ...prev, [m.matchId]: true }))}
                      className="flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors"
                      style={attendance[m.matchId] === true ? { background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)", color: "var(--text-primary)" } : { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)" }}>
                      참석
                    </button>
                    <button onClick={() => setAttendance((prev: Record<string, boolean | null>) => ({ ...prev, [m.matchId]: false }))}
                      className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${attendance[m.matchId] === false ? "bg-red-500 text-white" : "bg-white/5 text-gray-400 hover:text-white"}`}>
                      불참
                    </button>
                  </div>
                </div>
              );
            })
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
          <div className="flex items-center gap-2">
            <TrendingUp size={16} style={{ color: 'var(--text-primary)' }} />
            <h2 className="text-sm font-semibold text-gray-300">팀 스탯</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{finalRecord}</p>
              <p className="text-gray-500 text-xs mt-1">전적</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{club.winRate ?? winRate ?? 0}%</p>
              <p className="text-gray-500 text-xs mt-1">승률</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{club.members || members.length}</p>
              <p className="text-gray-500 text-xs mt-1">멤버</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">최근 5경기</p>
            {(confirmedMatches ?? []).length === 0 ? (
              <div className="space-y-2">
                {/* Mock 데이터 */}
                {[
                  { date: "2024-03-15", opponent: "강남 FC", ourScore: 3, theirScore: 2, scorers: ["김민수 2골", "이준호 1골"] },
                  { date: "2024-03-08", opponent: "서초 유나이티드", ourScore: 1, theirScore: 1, scorers: ["박지성 1골"] },
                  { date: "2024-03-01", opponent: "송파 FC", ourScore: 2, theirScore: 3, scorers: ["최태욱 1골", "정우성 1골"] },
                  { date: "2024-02-23", opponent: "마포 FC", ourScore: 4, theirScore: 1, scorers: ["김민수 2골", "이준호 1골", "박지성 1골"] },
                  { date: "2024-02-16", opponent: "용산 유나이티드", ourScore: 2, theirScore: 2, scorers: ["최태욱 1골", "정우성 1골"] },
                ].map((match, i) => {
                  const result = match.ourScore > match.theirScore ? "승" : match.ourScore < match.theirScore ? "패" : "무";
                  const resultColor = result === "승" ? "text-green-400" : result === "패" ? "text-red-400" : "text-gray-400";
                  const resultBg = result === "승" ? "bg-green-500/10" : result === "패" ? "bg-red-500/10" : "bg-white/5";
                  return (
                    <div key={i} className={`border border-white/10 rounded-lg p-3 ${resultBg}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-white font-medium text-sm">vs {match.opponent}</p>
                          <p className="text-gray-500 text-xs">{match.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">{match.ourScore} - {match.theirScore}</p>
                          <p className={`text-xs font-semibold ${resultColor}`}>{result}</p>
                        </div>
                      </div>
                      {match.scorers.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {match.scorers.map((scorer, j) => (
                            <span key={j} className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-300">⚽ {scorer}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex gap-2">
                {confirmedMatches.slice(0, 5).map((m: any, i: number) => {
                  const isHome = m.homeClubId === authClubId;
                  const myScore = isHome ? m.homeScore : m.awayScore;
                  const theirScore = isHome ? m.awayScore : m.homeScore;
                  const result = myScore > theirScore ? "W" : myScore < theirScore ? "L" : "D";
                  const cls = result === "W" ? "" : result === "L" ? "bg-red-500 text-white" : "bg-white/20 text-white";
                  const style = result === "W" ? { background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" } : {};
                  return (
                    <span key={m.matchId ?? i} className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${cls}`} style={style}>{result}</span>
                  );
                })}
              </div>
            )}
          </div>
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

      {/* 최근 경기 기록 (경쟁형) */}
      {isCompetitive && confirmedMatches && confirmedMatches.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Swords size={16} style={{ color: 'var(--text-primary)' }} />
            <h2 className="text-sm font-semibold text-gray-300">최근 경기 기록</h2>
          </div>
          {confirmedMatches.slice(0, 10).map((m: any) => {
            const isHome = m.homeClubId === authClubId;
            const opponentName = clubNameMap?.[isHome ? m.awayClubId : m.homeClubId] || "상대팀";
            const ourScore = isHome ? m.homeScore : m.awayScore;
            const theirScore = isHome ? m.awayScore : m.homeScore;
            const result = ourScore > theirScore ? "승" : ourScore < theirScore ? "패" : "무";
            const resultColor = result === "승" ? "text-green-400" : result === "패" ? "text-red-400" : "text-gray-400";
            const myGoals = (m.goals || []).filter((g: any) => g.club === authClubId);
            return (
              <div key={m.matchId} className="border border-white/10 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">vs {opponentName}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{m.confirmedAt?.slice(0, 10)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{ourScore} - {theirScore}</p>
                    <p className={`text-xs font-semibold ${resultColor}`}>{result}</p>
                  </div>
                </div>
                {myGoals.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {myGoals.map((g: any, i: number) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-white/10 text-white">⚽{g.scorer?.split("@")[0]} ×{g.count}</span>
                    ))}
                  </div>
                )}
                {isLeaderUser && (
                  <button onClick={() => { setGoalModal(m); setGoalSelections({}); }}
                    className="text-xs hover:opacity-70 transition-colors flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                    <Plus size={12} /> 골 기록 추가
                  </button>
                )}
              </div>
            );
          })}
        </div>
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
                const displayName = m.name || (m.userId ? m.userId.slice(0, 8) + '…' : m.email || '-');
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

      {/* 멤버 수정 모달 */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "var(--modal-overlay)" }} onClick={() => setEditingMember(null)}>
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-xs space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold text-sm">멤버 수정</span>
              <button onClick={() => setEditingMember(null)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">포지션</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(positionColor).map(pos => (
                    <button key={pos} type="button" onClick={() => setEditForm((p: any) => ({ ...p, position: pos }))}
                      className={`text-xs px-2 py-1 rounded font-semibold transition-colors ${editForm.position === pos ? positionColor[pos] : "bg-white/5 text-gray-500"}`}>
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">역할 (다중 선택 가능)</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "member", label: "멤버" },
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
                          const newRoles = isSelected 
                            ? p.roles.filter((r: string) => r !== role.value)
                            : [...p.roles, role.value];
                          return { ...p, roles: newRoles.length > 0 ? newRoles : ['member'] };
                        })}
                        className={`flex-1 text-xs px-2 py-1.5 rounded font-semibold transition-colors ${isSelected ? "bg-white/20 text-white border border-white/30" : "bg-white/5 text-gray-500"}`}>
                        {role.label}
                      </button>
                    );
                  })}
                </div>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">팀 재정 관리</h2>
        {canEditFinance && (
          <span className="text-xs text-gray-500">편집 권한 있음</span>
        )}
      </div>

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
  );
}
