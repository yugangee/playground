"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarDays, TrendingUp, Users, Shield, UserPlus, X, Copy, Check, Send, MessageCircle, Crown, Pencil, Swords, Plus, CheckCircle } from "lucide-react";
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
  const [editingMember, setEditingMember] = useState<{ userId: string; position: string } | null>(null);
  const [editForm, setEditForm] = useState({ position: "" });

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
        body: JSON.stringify({ position: editForm.position }),
      });
      setMembers(prev => prev.map(m => m.userId === editingMember.userId ? { ...m, position: editForm.position } : m));
      setEditingMember(null);
    } catch { alert("멤버 수정에 실패했습니다"); }
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
      { userId: "demo1", name: "김민수", position: "GK", role: "member" },
      { userId: "demo2", name: "이서준", position: "DF", role: "member" },
      { userId: "demo3", name: "박지훈", position: "DF", role: "member" },
      { userId: "demo4", name: "최도윤", position: "MF", role: "member" },
      { userId: "demo5", name: "강시우", position: "MF", role: "member" },
      { userId: "demo6", name: "윤하준", position: "FW", role: "leader" },
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
        if (m) setEditingMember({ userId: m.userId, position: m.position || '' });
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
  isLeaderUser = false, currentUser = null, authClubId = null,
  scoreModal = null, setScoreModal = () => {},
  scoreForm = { ourScore: "", theirScore: "" }, setScoreForm = () => {},
  goalModal = null, setGoalModal = () => {},
  goalSelections = {}, setGoalSelections = () => {},
  activities = [], activityForm = { date: "", venue: "" }, setActivityForm = () => {},
  createActivityAPI, joinActivityAPI, completeActivityAPI,
  router = null, loadingMembers = false,
}: any) {
  if (!club) {
    return (
      <div className="max-w-4xl mx-auto pt-20 text-center space-y-4">
        <Shield size={40} className="text-gray-600 mx-auto" />
        <p className="text-gray-400 text-sm">소속된 팀이 없습니다</p>
        <Link href="/manage/team" className="inline-block px-6 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
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
          <Users size={24} className="text-fuchsia-400 mx-auto mb-3" />
          <p className="text-white font-semibold mb-2">로그인하고 내 팀을 관리하세요</p>
          <p className="text-gray-400 text-sm mb-4">현재 샘플 데이터로 표시하고 있습니다</p>
          <Link href="/login" className="inline-block px-6 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
            로그인
          </Link>
        </div>
      )}
      <div>
      <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">팀 관리</h1>

      {/* 우리 팀 정보 */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-fuchsia-400" />
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
              style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}
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
              <p className="text-fuchsia-400 font-bold text-sm">{value}</p>
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
          {!isDemo && isLeaderUser && (
            <button
              onClick={() => { setMemberEditing(!memberEditing); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-fuchsia-400 transition-colors"
            >
              <Pencil size={12} />
              {memberEditing ? "완료" : "수정"}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {members.map((m: any, i: number) => {
            const isLeaderMember = m.role === 'leader';
            const displayName = m.name || (m.userId ? m.userId.slice(0, 8) + '…' : m.email || '-');
            return (
              <div key={m.userId || m.email || i}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 ${isLeaderMember ? "bg-fuchsia-500/10 border border-fuchsia-500/30" : "bg-white/5"}`}
              >
                {isLeaderMember && <Crown size={12} className="text-yellow-400 shrink-0" />}
                <span className="text-white text-sm font-medium flex-1 truncate">{displayName}</span>
                {m.position && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${positionColor[m.position] || "bg-white/10 text-gray-400"}`}>{m.position}</span>
                )}
                {!isDemo && !memberEditing && currentUser?.username !== m.userId && m.userId && (
                  <button
                    onClick={(e) => { e.stopPropagation(); router?.push(`/chat?to=${m.userId}&name=${encodeURIComponent(displayName)}`); }}
                    className="text-gray-500 hover:text-fuchsia-400 transition-colors shrink-0"
                  >
                    <MessageCircle size={12} />
                  </button>
                )}
                {memberEditing && !isDemo && isLeaderUser && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingMember(m); setEditForm({ position: m.position || "" }); }}
                    className="text-gray-500 hover:text-fuchsia-400 transition-colors shrink-0"
                  >
                    <Pencil size={11} />
                  </button>
                )}
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
            <CalendarDays size={16} className="text-fuchsia-400" />
            <h2 className="text-sm font-semibold text-gray-300">다음 경기 일정</h2>
          </div>
          {(scheduledMatches ?? []).filter((m: any) => m.status === "scheduled").map((m: any) => {
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
                    style={attendance[m.matchId] === true ? { background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" } : { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)" }}>
                    참석
                  </button>
                  <button onClick={() => setAttendance((prev: Record<string, boolean | null>) => ({ ...prev, [m.matchId]: false }))}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${attendance[m.matchId] === false ? "bg-red-500 text-white" : "bg-white/5 text-gray-400 hover:text-white"}`}>
                    불참
                  </button>
                </div>
              </div>
            );
          })}
          {proposedMatches && proposedMatches.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 pt-1">경기 제안 받음</p>
              {proposedMatches.map((m: any) => (
                <div key={m.matchId} className="border border-fuchsia-500/20 bg-fuchsia-500/5 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-white font-medium text-sm">{clubNameMap?.[m.homeClubId] || m.homeClubId}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{m.sport} · {m.createdAt?.slice(0, 10)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => acceptMatchAPI?.(m.matchId)} className="flex-1 py-1.5 rounded-md text-xs font-semibold text-white flex items-center justify-center gap-1" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>수락</button>
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
                        className="w-full py-1.5 rounded-md text-xs font-semibold text-white" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
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
            <TrendingUp size={16} className="text-fuchsia-400" />
            <h2 className="text-sm font-semibold text-gray-300">팀 스탯</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="font-bold text-fuchsia-400 text-sm">{finalRecord}</p>
              <p className="text-gray-500 text-xs mt-1">전적</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="font-bold text-fuchsia-400 text-lg">{club.winRate ?? winRate ?? 0}%</p>
              <p className="text-gray-500 text-xs mt-1">승률</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="font-bold text-fuchsia-400 text-lg">{club.members || members.length}</p>
              <p className="text-gray-500 text-xs mt-1">멤버</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">최근 5경기</p>
            <div className="flex gap-2">
              {(confirmedMatches ?? []).slice(0, 5).map((m: any, i: number) => {
                const isHome = m.homeClubId === authClubId;
                const myScore = isHome ? m.homeScore : m.awayScore;
                const theirScore = isHome ? m.awayScore : m.homeScore;
                const result = myScore > theirScore ? "W" : myScore < theirScore ? "L" : "D";
                const cls = result === "W" ? "text-white" : result === "L" ? "bg-red-500 text-white" : "bg-white/20 text-white";
                const style = result === "W" ? { background: "linear-gradient(to right, #c026d3, #7c3aed)" } : {};
                return (
                  <span key={m.matchId ?? i} className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${cls}`} style={style}>{result}</span>
                );
              })}
              {(confirmedMatches ?? []).length === 0 && <p className="text-gray-600 text-xs">경기 기록 없음</p>}
            </div>
          </div>
        </div>
      </div>

      {/* 최근 경기 기록 (경쟁형) */}
      {isCompetitive && confirmedMatches && confirmedMatches.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Swords size={16} className="text-fuchsia-400" />
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
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-400">⚽{g.scorer?.split("@")[0]} ×{g.count}</span>
                    ))}
                  </div>
                )}
                {isLeaderUser && (
                  <button onClick={() => { setGoalModal(m); setGoalSelections({}); }}
                    className="text-xs text-fuchsia-400 hover:text-fuchsia-300 transition-colors flex items-center gap-1">
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
            <CalendarDays size={16} className="text-fuchsia-400" />
            <h2 className="text-sm font-semibold text-gray-300">활동 일정</h2>
          </div>
          <div className="border border-white/10 rounded-lg p-4 space-y-3">
            <p className="text-xs text-gray-400">새 활동 제안</p>
            <input type="datetime-local" value={activityForm?.date || ""} onChange={e => setActivityForm?.((p: any) => ({ ...p, date: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-fuchsia-500/50" style={{ colorScheme: "dark" }} />
            <input placeholder="장소" value={activityForm?.venue || ""} onChange={e => setActivityForm?.((p: any) => ({ ...p, venue: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-fuchsia-500/50 placeholder:text-gray-600" />
            <button onClick={() => createActivityAPI?.()} className="w-full py-1.5 rounded-md text-xs font-semibold text-white" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
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
                <span className="text-xs text-fuchsia-400">{(a.participants || []).length}명 참가</span>
              </div>
              <div className="flex gap-2">
                {!(a.participants || []).includes(currentUser?.email) && (
                  <button onClick={() => joinActivityAPI?.(a.activityId)} className="flex-1 py-1.5 rounded-md text-xs font-semibold text-white" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>참가</button>
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
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-fuchsia-500/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">상대팀 스코어</label>
                <input type="number" min="0" value={scoreForm?.theirScore || ""} onChange={e => setScoreForm?.((p: any) => ({ ...p, theirScore: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-fuchsia-500/50" />
              </div>
            </div>
            <button onClick={() => submitScoreAPI?.()} className="w-full py-2 rounded-lg font-semibold text-sm text-white" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>입력</button>
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
                        className="w-6 h-6 rounded bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center text-xs">+</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => addGoalsAPI?.()} className="w-full py-2 rounded-lg font-semibold text-sm text-white" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>저장</button>
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
            </div>
            <button onClick={saveEditMember}
              className="w-full py-2 rounded-lg font-semibold text-sm text-white"
              style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>저장</button>
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
                <div className="w-5 h-5 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : inviteUrl ? (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                <span className="text-gray-300 text-xs flex-1 truncate">{inviteUrl}</span>
                <button onClick={copy} className="shrink-0 text-gray-400 hover:text-white transition-colors">
                  {copied ? <Check size={14} className="text-fuchsia-400" /> : <Copy size={14} />}
                </button>
              </div>
            ) : (
              <p className="text-xs text-red-400 text-center">초대 링크 생성에 실패했습니다</p>
            )}
            {copied && <p className="text-xs text-fuchsia-400 text-center">링크가 복사되었어요</p>}
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
                  <span className={`text-xs px-3 py-2 rounded-2xl max-w-[75%] ${m.from === "me" ? "text-white" : "bg-white/10 text-gray-200"}`}
                    style={m.from === "me" ? { background: "linear-gradient(to right, #c026d3, #7c3aed)" } : {}}>
                    {m.text}
                  </span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="flex gap-2 px-4 py-3 border-t border-white/10">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()}
                placeholder="메시지 입력..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-fuchsia-500/50" />
              <button onClick={sendMsg} className="px-3 py-2 rounded-lg text-white" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
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
