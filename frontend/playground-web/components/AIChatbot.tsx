"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/context/AuthContext";
import { useTeam } from "@/context/TeamContext";
import { manageFetch } from "@/lib/manageFetch";

const API_URL = process.env.NEXT_PUBLIC_CHATBOT_API_URL || "https://2kvgg7mga7mugvobybs2x33bvu0kdebj.lambda-url.us-east-1.on.aws";
const AUTH_API = process.env.NEXT_PUBLIC_API_URL;

type Msg = { role: "user" | "assistant"; content: string };

/** 유저의 플랫폼 데이터(팀, 경기, 일정)를 수집해서 문자열로 반환 */
async function fetchUserContext(teamId: string, teamName: string): Promise<string> {
  const parts: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  parts.push(`[현재 날짜] ${today}`);
  parts.push(`[현재 팀] ${teamName} (ID: ${teamId})`);

  try {
    // 1. 팀 멤버
    const memberRes = await manageFetch(`/team/${teamId}/members`);
    if (memberRes.ok) {
      const memberData = await memberRes.json();
      const members = memberData.members || memberData || [];
      if (members.length > 0) {
        const memberList = members.map((m: any) =>
          `${m.name || m.userId}(${m.position || '미정'}, ${m.role || 'member'})`
        ).join(", ");
        parts.push(`[팀 멤버] ${memberList}`);
      }
    }
  } catch { /* skip */ }

  try {
    // 2. 경기 일정 (Manage API)
    const schedRes = await manageFetch(`/schedule/matches?teamId=${teamId}`);
    if (schedRes.ok) {
      const matches = await schedRes.json();
      if (Array.isArray(matches) && matches.length > 0) {
        const upcoming = matches
          .filter((m: any) => m.status !== 'completed' && m.status !== 'cancelled')
          .sort((a: any, b: any) => (a.scheduledAt || '').localeCompare(b.scheduledAt || ''))
          .slice(0, 10);
        const completed = matches
          .filter((m: any) => m.status === 'completed')
          .sort((a: any, b: any) => (b.scheduledAt || '').localeCompare(a.scheduledAt || ''))
          .slice(0, 10);

        if (upcoming.length > 0) {
          const upList = upcoming.map((m: any) =>
            `${m.scheduledAt?.slice(0, 16) || '미정'} | ${m.homeTeamName || m.homeTeamId} vs ${m.awayTeamName || m.awayTeamId} | ${m.venue || '장소 미정'} | 상태: ${m.status}`
          ).join("\n");
          parts.push(`[예정된 경기]\n${upList}`);
        }

        if (completed.length > 0) {
          const compList = completed.map((m: any) =>
            `${m.scheduledAt?.slice(0, 10) || '?'} | ${m.homeTeamName || m.homeTeamId} ${m.homeScore ?? '?'} - ${m.awayScore ?? '?'} ${m.awayTeamName || m.awayTeamId}`
          ).join("\n");
          parts.push(`[최근 경기 결과]\n${compList}`);
        }
      }
    }
  } catch { /* skip */ }

  try {
    // 3. Auth API 경기 기록 (확정된 경기)
    const token = localStorage.getItem("accessToken");
    if (token && AUTH_API) {
      const matchRes = await fetch(`${AUTH_API}/matches?clubId=${teamId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (matchRes.ok) {
        const matchData = await matchRes.json();
        const confirmed = (matchData.matches || matchData || [])
          .filter((m: any) => m.status === 'confirmed')
          .sort((a: any, b: any) => (b.confirmedAt || b.date || '').localeCompare(a.confirmedAt || a.date || ''))
          .slice(0, 10);

        if (confirmed.length > 0) {
          const confList = confirmed.map((m: any) =>
            `${m.date || m.confirmedAt?.slice(0, 10) || '?'} | ${m.homeClubName || m.homeClubId} ${m.homeScore ?? '?'} - ${m.awayScore ?? '?'} ${m.awayClubName || m.awayClubId} | 골: ${(m.goals || []).map((g: any) => g.scorerName || g.scorer).join(', ') || '없음'}`
          ).join("\n");
          parts.push(`[확정된 경기 기록]\n${confList}`);
        }
      }
    }
  } catch { /* skip */ }

  return parts.join("\n\n");
}

export default function AIChatbot() {
  const { user, loading: authLoading } = useAuth();
  const { currentTeam } = useTeam();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "안녕하세요! 축구 관련 질문이나, 팀 경기 일정·결과도 물어보세요" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [userContext, setUserContext] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  // 챗봇 열 때 유저 컨텍스트 로드
  useEffect(() => {
    if (!open || !currentTeam) return;
    fetchUserContext(currentTeam.id, currentTeam.name).then(setUserContext);
  }, [open, currentTeam]);

  const send = useCallback(async () => {
    if (!input.trim() || sending) return;
    const message = input.trim();
    setInput("");
    const userMsg: Msg = { role: "user", content: message };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);
    setSending(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMsgs.slice(-10),
          userContext: userContext || undefined,
        }),
      });
      if (!res.ok) throw new Error("응답 실패");
      const data = await res.json();
      setMsgs(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMsgs(prev => [...prev, { role: "assistant", content: "죄송합니다, 오류가 발생했어요. 다시 시도해주세요." }]);
    } finally { setSending(false); }
  }, [input, sending, msgs, userContext]);

  // 로그인하지 않은 경우 렌더링하지 않음
  if (authLoading || !user) return null;

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform border border-[var(--card-border)]">
          <MessageCircle size={20} className="md:w-6 md:h-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-[calc(100vw-32px)] md:w-[380px] max-w-[380px] h-[60vh] md:h-[520px] rounded-2xl shadow-2xl border border-gray-300 dark:border-white/20 bg-white dark:bg-[#111] flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 bg-black text-white">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} />
              <span className="text-sm font-semibold">AI 어시스턴트</span>
            </div>
            <button onClick={() => setOpen(false)} className="hover:bg-white/20 rounded-full p-1 transition-colors"><X size={16} /></button>
          </div>

          {/* 메시지 */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"}`}
                  style={{ backgroundColor: "var(--chat-bubble-bg)", color: "var(--chat-bubble-color)" }}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none [&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0" style={{ color: "var(--chat-bubble-color)" }}>
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="px-4 py-2 rounded-2xl rounded-bl-sm" style={{ backgroundColor: "var(--chat-bubble-bg)" }}>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 입력 */}
          <div className="px-3 pb-3 pt-1 border-t border-gray-200 dark:border-white/10">
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !isComposing && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="메시지를 입력하세요..."
                className="flex-1 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-black dark:focus:border-white/40 transition-colors"
                style={{ color: "var(--text-primary)" }} />
              <button onClick={send} disabled={sending || !input.trim()}
                className="px-3 py-2 rounded-xl bg-black text-white disabled:opacity-40 transition-opacity hover:bg-gray-800">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
