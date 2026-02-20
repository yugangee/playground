"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarDays, TrendingUp, Users, Shield, UserPlus, X, Copy, Check, Send, MessageCircle, Crown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL;

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

const schedule = [
  { date: "2026.03.07 (토) 15:00", opponent: "vs 마포 불사조", venue: "마포구민체육센터" },
  { date: "2026.03.15 (일) 14:00", opponent: "vs 강남 번개FC", venue: "탄천종합운동장" },
  { date: "2026.03.22 (일) 16:00", opponent: "vs 송파 드래곤즈", venue: "잠실종합운동장" },
];

const recent = [
  { result: "W", cls: "text-white", style: { background: "linear-gradient(to right, #c026d3, #7c3aed)" } },
  { result: "L", cls: "bg-red-500 text-white", style: {} },
  { result: "W", cls: "text-white", style: { background: "linear-gradient(to right, #c026d3, #7c3aed)" } },
  { result: "W", cls: "text-white", style: { background: "linear-gradient(to right, #c026d3, #7c3aed)" } },
  { result: "D", cls: "bg-white/20 text-white", style: {} },
];

const initialProposals = [
  { id: 1, team: "동작 피니크스", date: "2026.03.10 (화) 18:00", venue: "동작체육관" },
  { id: 2, team: "성동 스파크", date: "2026.03.18 (수) 19:00", venue: "성동종합운동장" },
];

type ChatMsg = { from: "me" | "them"; text: string };
type Proposal = typeof initialProposals[0];

export default function TeamPage() {
  const { user, loading } = useAuth();
  const [club, setClub] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [captainEditing, setCaptainEditing] = useState(false);
  const [captainSaving, setCaptainSaving] = useState(false);

  const [attendance, setAttendance] = useState<Record<number, boolean | null>>({});
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const inviteLink = typeof window !== "undefined" ? `${window.location.origin}/clubs/${user?.teamId}` : "";
  function copy() { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  const [pending, setPending] = useState(initialProposals.map(p => p.id));
  const [chatTeam, setChatTeam] = useState<Proposal | null>(null);
  const [msgs, setMsgs] = useState<Record<number, ChatMsg[]>>({});
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, chatTeam]);

  // 내 팀 정보 + 멤버 불러오기
  useEffect(() => {
    if (!user?.teamId) { setClub(null); setMembers([]); setLoadingTeam(false); return; }
    setLoadingTeam(true);
    Promise.all([
      fetch(`${API}/clubs`).then(r => r.json()),
      fetch(`${API}/club-members/${user.teamId}`).then(r => r.json()),
    ]).then(([clubsData, membersData]) => {
      console.log('Club members data:', membersData);
      const found = (clubsData.clubs || []).find((c: any) => c.clubId === user.teamId);
      setClub(found || null);
      setMembers(membersData.members || []);
    }).catch(() => {}).finally(() => setLoadingTeam(false));
  }, [user?.teamId]);

  async function saveCaptain(email: string) {
    setCaptainSaving(true);
    try {
      const r = await fetch(`${API}/clubs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: user?.teamId, captainEmail: email }),
      });
      if (!r.ok) throw new Error();
      setClub((prev: any) => prev ? { ...prev, captainEmail: email } : prev);
      setCaptainEditing(false);
    } catch {
      alert("주장 저장에 실패했습니다");
    } finally {
      setCaptainSaving(false);
    }
  }

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
    setTimeout(() => setMsgs(prev => ({ ...prev, [id]: [...(prev[id] ?? []), { from: "them", text: "네 확인했습니다! 일정 맞추죠." }] })), 800);
  }

  if (loading || loadingTeam) {
    return <div className="max-w-4xl mx-auto pt-20 text-center"><p className="text-gray-500 text-sm">로딩 중...</p></div>;
  }

  if (!user) {
    // 로그인 안 했을 때 예시 화면
    const demoClub = {
      name: "서울 FC 썸더",
      sport: "축구",
      record: "12승 3무 2패",
      members: 15,
      winRate: 71,
      areas: [{ sido: "서울", sigungu: "강남" }],
      styles: ["공격적", "빠른 패스"],
      image: null,
    };
    const demoMembers = [
      { name: "김민준", position: "GK", email: "demo1@example.com" },
      { name: "이서준", position: "DF", email: "demo2@example.com" },
      { name: "박지호", position: "DF", email: "demo3@example.com" },
      { name: "정도윤", position: "MF", email: "demo4@example.com" },
      { name: "강시우", position: "MF", email: "demo5@example.com" },
      { name: "임지훈", position: "FW", email: "demo6@example.com" },
    ];
    return <TeamPageContent club={demoClub} members={demoMembers} isDemo={true} />;
  }

  if (!user.teamId || !club) {
    return <TeamPageContent club={null} members={[]} isDemo={false} />;
  }

  const record = club.record || "0승 0무 0패";
  const areas = (club.areas || []).map((a: any) => [a.sido, a.sigungu].filter(Boolean).join(" ")).join(", ");
  const styles = (club.styles || []).join(", ");

  return <TeamPageContent club={club} members={members} isDemo={false} record={record} areas={areas} styles={styles} captainEditing={captainEditing} setCaptainEditing={setCaptainEditing} captainSaving={captainSaving} saveCaptain={saveCaptain} setInviteOpen={setInviteOpen} attendance={attendance} setAttendance={setAttendance} pending={pending} accept={accept} decline={decline} chatTeam={chatTeam} setChatTeam={setChatTeam} msgs={msgs} input={input} setInput={setInput} sendMsg={sendMsg} bottomRef={bottomRef} inviteOpen={inviteOpen} inviteLink={inviteLink} copy={copy} copied={copied} />;
}

function TeamPageContent({ club, members, isDemo, record, areas, styles, captainEditing, setCaptainEditing, captainSaving, saveCaptain, setInviteOpen, attendance = {}, setAttendance = () => {}, pending = [], accept = () => {}, decline = () => {}, chatTeam, setChatTeam = () => {}, msgs = {}, input = "", setInput = () => {}, sendMsg = () => {}, bottomRef, inviteOpen, inviteLink = "", copy = () => {}, copied = false }: any) {
  if (!club) {
    return (
      <div className="max-w-4xl mx-auto pt-20 text-center space-y-4">
        <Shield size={40} className="text-gray-600 mx-auto" />
        <p className="text-gray-400 text-sm">소속된 팀이 없습니다</p>
        <Link href="/mypage" className="inline-block px-6 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>마이페이지에서 팀 등록</Link>
      </div>
    );
  }

  const finalRecord = record || club.record || "0승 0무 0패";
  const finalAreas = areas || (club.areas || []).map((a: any) => [a.sido, a.sigungu].filter(Boolean).join(" ")).join(", ");
  const finalStyles = styles || (club.styles || []).join(", ");

  return (
    <div>
      {isDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto bg-[#111] border border-white/10 rounded-2xl p-8 max-w-xs text-center space-y-4 shadow-2xl">
            <p className="text-white font-semibold">로그인이 필요합니다</p>
            <p className="text-gray-400 text-xs">로그인하고 내 팀을 관리하세요</p>
            <Link href="/login" className="inline-block px-8 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
              로그인
            </Link>
          </div>
        </div>
      )}
      <div>
      <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">팀 관리</h1>

      {/* 우리 팀 정보 */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {club.image && (
              <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                <Image src={club.image} alt="emblem" fill className="object-cover" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-fuchsia-400" />
                <h2 className="text-lg font-bold text-white">{club.name}</h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{finalAreas}{finalStyles ? ` · ${finalStyles}` : ""}</p>
            </div>
          </div>
          {!isDemo && (
            <button onClick={() => setInviteOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
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
            <span className="text-sm text-gray-400">선수 명단 ({members.length}명)</span>
          </div>
          {!isDemo && (
            <button onClick={() => setCaptainEditing(!captainEditing)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-fuchsia-400 transition-colors">
              <Crown size={12} />
              {captainEditing ? "완료" : "주장 설정"}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {members.map((m: any, i: number) => {
            const isCaptain = club?.captainEmail === m.email;
            return (
              <div key={i}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${captainEditing ? "cursor-pointer hover:bg-fuchsia-500/10" : ""} ${isCaptain ? "bg-fuchsia-500/10 border border-fuchsia-500/30" : "bg-white/5"}`}
                onClick={() => captainEditing && !captainSaving && saveCaptain(m.email)}>
                {isCaptain && <Crown size={12} className="text-yellow-400 shrink-0" />}
                <span className="text-white text-sm font-medium flex-1 truncate">{m.name || m.email}</span>
                {m.position && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${positionColor[m.position] || "bg-white/10 text-gray-400"}`}>{m.position}</span>
                )}
              </div>
            );
          })}
          {members.length === 0 && <p className="text-xs text-gray-600 col-span-full text-center py-2">아직 등록된 멤버가 없습니다</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 경기 일정 */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-fuchsia-400" />
            <h2 className="text-sm font-semibold text-gray-300">다음 경기 일정</h2>
          </div>
          {schedule.map((game, i) => (
            <div key={i} className="border border-white/10 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-white font-medium text-sm">{game.opponent}</p>
                <p className="text-gray-500 text-xs mt-0.5">{game.date} · {game.venue}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setAttendance((prev: Record<number, boolean | null>) => ({ ...prev, [i]: true }))}
                  className="flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors"
                  style={attendance[i] === true ? { background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" } : { background: "rgba(255,255,255,0.05)", color: "#9ca3af" }}>
                  참석
                </button>
                <button onClick={() => setAttendance((prev: Record<number, boolean | null>) => ({ ...prev, [i]: false }))}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${attendance[i] === false ? "bg-red-500 text-white" : "bg-white/5 text-gray-400 hover:text-white"}`}>
                  불참
                </button>
              </div>
            </div>
          ))}
          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 pt-1">경기 제안 받음</p>
              {initialProposals.filter(p => pending.includes(p.id)).map(p => (
                <div key={p.id} className="border border-fuchsia-500/20 bg-fuchsia-500/5 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-white font-medium text-sm">{p.team}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{p.date} · {p.venue}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => accept(p)} className="flex-1 py-1.5 rounded-md text-xs font-semibold text-white flex items-center justify-center gap-1" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
                      <MessageCircle size={11} /> 수락 · 채팅
                    </button>
                    <button onClick={() => decline(p.id)} className="flex-1 py-1.5 rounded-md text-xs font-semibold bg-white/5 text-gray-400 hover:text-white transition-colors">거절</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {initialProposals.filter(p => !pending.includes(p.id) && msgs[p.id]).map(p => (
            <button key={p.id} onClick={() => setChatTeam(p)} className="w-full flex items-center gap-2 border border-white/10 rounded-lg px-4 py-2.5 hover:bg-white/5 transition-colors">
              <MessageCircle size={13} className="text-fuchsia-400" />
              <span className="text-sm text-gray-300 flex-1 text-left">{p.team}</span>
              <span className="text-xs text-gray-500">채팅 열기</span>
            </button>
          ))}
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
              <p className="font-bold text-fuchsia-400 text-lg">{club.winRate || 0}%</p>
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
              {recent.map(({ result, cls, style }, i) => (
                <span key={i} className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${cls}`} style={style}>{result}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 초대 모달 */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setInviteOpen(false)}>
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold">선수 초대</span>
              <button onClick={() => setInviteOpen(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>
            <p className="text-xs text-gray-400">아래 링크를 공유하면 팀에 합류할 수 있어요.</p>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              <span className="text-gray-300 text-xs flex-1 truncate">{inviteLink}</span>
              <button onClick={copy} className="shrink-0 text-gray-400 hover:text-white transition-colors">
                {copied ? <Check size={14} className="text-fuchsia-400" /> : <Copy size={14} />}
              </button>
            </div>
            {copied && <p className="text-xs text-fuchsia-400 text-center">링크가 복사됐어요!</p>}
          </div>
        </div>
      )}

      {/* 채팅 모달 */}
      {chatTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setChatTeam(null)}>
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
