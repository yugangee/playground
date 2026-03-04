"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, Send, Calendar, MapPin, X, Users, Smile, CheckCheck } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/lib/useWebSocket";
import Image from "next/image";

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "🔥", "⚽", "👏"];

export default function ChatPage() {
  const { rooms, sendMsg, sendTimeSlot, selectTime, addLiveMsg, setHistory } = useChat();
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [showCal, setShowCal] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [calDate, setCalDate] = useState("");
  const [calTimes, setCalTimes] = useState<string[]>([]);
  const [mapVenue, setMapVenue] = useState("");
  const [reactions, setReactions] = useState<Record<string, Record<string, string[]>>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = rooms.find(r => r.id === activeId) ?? rooms[0] ?? null;

  useEffect(() => { if (active && !activeId) setActiveId(active.id); }, [rooms]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.msgs]);

  // 채팅방 전환 시 unread 초기화
  useEffect(() => {
    if (active) {
      setUnreadCounts(prev => ({ ...prev, [active.id]: 0 }));
    }
  }, [active?.id]);

  // WebSocket for team chat
  const isLiveRoom = active?.type === "team" && !!active?.roomId;
  const wsRoomId = isLiveRoom ? active.roomId! : "";

  // ✅ [버그 수정] ref로 최신 값 참조 → 콜백 재생성 없음 → 리스너 중복 등록 방지
  const activeRef = useRef(active);
  const userRef = useRef(user);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { userRef.current = user; }, [user]);

  const onWsMessage = useCallback((data: any) => {
    const currentActive = activeRef.current;
    const currentUser = userRef.current;
    if (!currentActive) return;

    if (data.action === "message") {
      const isMe = data.email === currentUser?.email;
      if (!isMe) {
        addLiveMsg(currentActive.id, {
          from: "them",
          text: data.text,
          userName: data.userName,
          email: data.email,
          timestamp: data.timestamp,
        });
        // 현재 보고 있지 않은 방이면 unread 카운트 증가
        if (currentActive.id !== activeRef.current?.id) {
          setUnreadCounts(prev => ({
            ...prev,
            [currentActive.id]: (prev[currentActive.id] ?? 0) + 1,
          }));
        }
      }
    }

    // 타이핑 인디케이터
    if (data.action === "typing" && data.email !== currentUser?.email) {
      setTypingUser(data.userName);
      setIsTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setIsTyping(false), 3000);
    }

    // 이모지 리액션 동기화
    if (data.action === "reaction") {
      const { msgIndex, emoji, email } = data;
      setReactions(prev => {
        const key = `${currentActive.id}-${msgIndex}`;
        const cur = prev[key] ?? {};
        const users = cur[emoji] ?? [];
        const updated = users.includes(email)
          ? users.filter((e: string) => e !== email)
          : [...users, email];
        return { ...prev, [key]: { ...cur, [emoji]: updated } };
      });
    }

    if (data.action === "history" && data.messages) {
      const msgs = data.messages.map((m: any) => ({
        from: m.email === currentUser?.email ? "me" as const : "them" as const,
        text: m.text,
        userName: m.userName,
        email: m.email,
        timestamp: m.timestamp,
      }));
      setHistory(currentActive.id, msgs);
    }
  }, []); // 의존성 없이 고정 → 리스너 중복 등록 없음

  const { send: wsSend, connected } = useWebSocket({
    roomId: wsRoomId,
    userName: user?.name || "익명",
    email: user?.email || "",
    onMessage: onWsMessage,
  });

  // 타이핑 감지 → 서버에 typing 이벤트 전송
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
    if (isLiveRoom) {
      wsSend(JSON.stringify({ action: "typing", userName: user?.name, email: user?.email }));
    }
  }

  function send() {
    if (!input.trim() || !active) return;
    if (isLiveRoom) {
      wsSend(input);
      addLiveMsg(active.id, {
        from: "me",
        text: input,
        userName: user?.name,
        email: user?.email,
        timestamp: new Date().toISOString(),
      });
    } else {
      sendMsg(active.id, input);
    }
    setInput("");
    setShowEmoji(false);
  }

  function sendDate() {
    if (!calDate || !calTimes.length || !active) return;
    sendTimeSlot(active.id, calDate, calTimes);
    setCalDate(""); setCalTimes([]); setShowCal(false);
  }

  function sendVenue() {
    if (!mapVenue.trim() || !active) return;
    sendMsg(active.id, `📍 ${mapVenue}`);
    setMapVenue(""); setShowMap(false);
  }

  function insertEmoji(emoji: string) {
    setInput(prev => prev + emoji);
    inputRef.current?.focus();
  }

  function addReaction(msgIndex: number, emoji: string) {
    if (!active) return;
    const key = `${active.id}-${msgIndex}`;
    const email = user?.email ?? "me";
    setReactions(prev => {
      const cur = prev[key] ?? {};
      const users = cur[emoji] ?? [];
      const updated = users.includes(email) ? users.filter(e => e !== email) : [...users, email];
      return { ...prev, [key]: { ...cur, [emoji]: updated } };
    });
    if (isLiveRoom) {
      wsSend(JSON.stringify({ action: "reaction", msgIndex, emoji, email }));
    }
  }

  function formatTime(iso?: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }

  if (rooms.length === 0) return (
    <div className="flex flex-col items-center justify-center h-96 text-gray-500 space-y-2">
      <MessageCircle size={32} />
      <p className="text-sm">아직 채팅방이 없어요</p>
      <p className="text-xs">팀 관리에서 경기 제안을 수락하면 채팅이 시작돼요</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex gap-4">
      {/* 채팅 목록 */}
      <div className="w-56 shrink-0 bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col">
        <p className="text-xs font-semibold text-gray-400 px-4 py-3 border-b border-white/10">채팅 목록</p>
        <div className="overflow-y-auto flex-1">
          {rooms.filter(r => r.type === "team").length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 pt-3 pb-1">팀 채팅</p>
              {rooms.filter(r => r.type === "team").map(r => (
                <button key={r.id} onClick={() => setActiveId(r.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-left border-b border-white/5 transition-colors ${active?.id === r.id ? "bg-fuchsia-500/10" : "hover:bg-white/5"}`}>
                  <div className="relative w-9 h-9 rounded-full shrink-0 border border-fuchsia-500/30 bg-fuchsia-500/10 flex items-center justify-center">
                    <Users size={16} className="text-fuchsia-400" />
                    {/* 안읽은 메시지 뱃지 */}
                    {(unreadCounts[r.id] ?? 0) > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-fuchsia-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {unreadCounts[r.id]}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-xs font-semibold block">{r.team}</span>
                    <span className="text-gray-500 text-xs truncate block mt-0.5">{r.msgs.at(-1)?.text}</span>
                  </div>
                </button>
              ))}
            </>
          )}
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 pt-4 pb-1">개인 채팅</p>
          {rooms.filter(r => r.type === "personal").map(r => (
            <button key={r.id} onClick={() => setActiveId(r.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 text-left border-b border-white/5 transition-colors ${active?.id === r.id ? "bg-fuchsia-500/10" : "hover:bg-white/5"}`}>
              <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 border border-white/10">
                <Image src={r.avatar} alt={r.userName} fill className="object-cover" />
                {(unreadCounts[r.id] ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-fuchsia-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCounts[r.id]}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-white text-xs font-semibold">{r.userName}</span>
                  {r.team && <span className="text-gray-500 text-xs">{r.team}</span>}
                </div>
                <span className="text-gray-500 text-xs truncate block mt-0.5">{r.msgs.at(-1)?.text}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 채팅창 */}
      {active && (
        <div className="flex-1 bg-white/5 border border-white/10 rounded-xl flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <p className="text-white font-semibold text-sm">{active.type === "team" ? active.team : active.userName}</p>
              {isLiveRoom && (
                <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-gray-500"}`} title={connected ? "연결됨" : "연결 중..."} />
              )}
            </div>
            {active.type === "team" && !isLiveRoom && <p className="text-gray-500 text-xs">{active.date} · {active.venue}</p>}
            {active.type === "personal" && active.date && <p className="text-gray-500 text-xs">{active.date} · {active.venue}</p>}
          </div>

          {/* 메시지 목록 */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {active.msgs.map((m, i) => {
              const reactionKey = `${active.id}-${i}`;
              const msgReactions = reactions[reactionKey] ?? {};
              const hasReactions = Object.values(msgReactions).some(arr => arr.length > 0);

              return (
                <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                  {m.times ? (
                    <div className={`space-y-2 max-w-[75%] ${m.from === "me" ? "items-end" : "items-start"} flex flex-col`}>
                      <span className="text-xs px-3 py-2 rounded-2xl text-white" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>{m.text}</span>
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {m.times.map(t => (
                          <button key={t} onClick={() => selectTime(active.id, i, t)}
                            className="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
                            style={m.selectedTime?.includes(t)
                              ? { background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" }
                              : { background: "var(--chip-inactive-bg)", color: "var(--text-primary)" }
                            }>{t}</button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className={`group flex flex-col ${m.from === "me" ? "items-end" : "items-start"} max-w-[70%]`}>
                      {m.from === "them" && active.type === "team" && m.userName && (
                        <span className="text-[10px] text-gray-500 mb-0.5 px-1">{m.userName}</span>
                      )}

                      {/* 말풍선 + 시간 */}
                      <div className={`flex items-end gap-1.5 ${m.from === "me" ? "flex-row-reverse" : "flex-row"}`}>
                        <span
                          className={`text-xs px-3 py-2 rounded-2xl ${m.from === "me"
                            ? "text-white"
                            : "text-gray-900 dark:text-white bg-gray-100 dark:bg-white/10"
                            }`}
                          style={m.from === "me" ? { background: "linear-gradient(to right, #c026d3, #7c3aed)" } : undefined}>
                          {m.text}
                        </span>
                        {/* 시간 + 읽음 (hover 시 표시) */}
                        <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${m.from === "me" ? "flex-row-reverse" : ""}`}>
                          {m.timestamp && (
                            <span className="text-[10px] text-gray-600 whitespace-nowrap">{formatTime(m.timestamp)}</span>
                          )}
                          {m.from === "me" && <CheckCheck size={11} className="text-fuchsia-400" />}
                        </div>
                      </div>

                      {/* 이모지 리액션 추가 버튼 (hover 시 표시) */}
                      <div className={`flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${m.from === "me" ? "flex-row-reverse" : ""}`}>
                        {EMOJI_LIST.slice(0, 5).map(emoji => (
                          <button key={emoji} onClick={() => addReaction(i, emoji)}
                            className="text-sm hover:scale-125 transition-transform leading-none">
                            {emoji}
                          </button>
                        ))}
                      </div>

                      {/* 리액션 뱃지 */}
                      {hasReactions && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(msgReactions).filter(([, users]) => users.length > 0).map(([emoji, users]) => (
                            <button key={emoji} onClick={() => addReaction(i, emoji)}
                              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${users.includes(user?.email ?? "")
                                  ? "bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300"
                                  : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                }`}>
                              {emoji} <span className="text-[10px]">{users.length}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 타이핑 인디케이터 */}
            {isTyping && typingUser && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/10 text-gray-400 text-xs">
                  <span>{typingUser}이 입력 중</span>
                  <span className="flex gap-0.5">
                    {[0, 1, 2].map(n => (
                      <span key={n} className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${n * 0.15}s` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* 달력 패널 */}
          {showCal && (
            <div className="px-4 py-3 border-t border-white/10 bg-white/3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">날짜 · 시간 선택</span>
                <button onClick={() => setShowCal(false)} className="text-gray-500 hover:text-white"><X size={13} /></button>
              </div>
              <input type="date" value={calDate} onChange={e => setCalDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-fuchsia-500/50" style={{ colorScheme: "dark" }} />
              <div className="flex flex-wrap gap-1.5">
                {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"].map(t => (
                  <button key={t} type="button" onClick={() => setCalTimes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}
                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                    style={calTimes.includes(t)
                      ? { background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" }
                      : { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)" }}>
                    {t}
                  </button>
                ))}
              </div>
              <button onClick={sendDate} disabled={!calDate || !calTimes.length}
                className="w-full py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
                style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>전송</button>
            </div>
          )}

          {/* 지도 패널 */}
          {showMap && (
            <div className="px-4 py-3 border-t border-white/10 bg-white/3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">장소 입력</span>
                <button onClick={() => setShowMap(false)} className="text-gray-500 hover:text-white"><X size={13} /></button>
              </div>
              <input value={mapVenue} onChange={e => setMapVenue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendVenue()}
                placeholder="예) 탄천종합운동장"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-fuchsia-500/50 placeholder:text-gray-600" />
              <button onClick={sendVenue} disabled={!mapVenue.trim()}
                className="w-full py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
                style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>전송</button>
            </div>
          )}

          {/* 이모지 패널 */}
          {showEmoji && (
            <div className="px-4 py-2 border-t border-white/10 bg-white/3 flex flex-wrap gap-2">
              {EMOJI_LIST.map(emoji => (
                <button key={emoji} onClick={() => insertEmoji(emoji)}
                  className="text-lg hover:scale-125 transition-transform leading-none">
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* 툴바 */}
          <div className="px-4 pt-2 pb-1 flex gap-2 border-t border-white/10">
            <button onClick={() => { setShowCal(p => !p); setShowMap(false); setShowEmoji(false); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors ${showCal ? "text-fuchsia-400 bg-fuchsia-500/10" : "text-gray-500 hover:text-white bg-white/5"}`}>
              <Calendar size={13} /> 날짜
            </button>
            <button onClick={() => { setShowMap(p => !p); setShowCal(false); setShowEmoji(false); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors ${showMap ? "text-fuchsia-400 bg-fuchsia-500/10" : "text-gray-500 hover:text-white bg-white/5"}`}>
              <MapPin size={13} /> 장소
            </button>
            <button onClick={() => { setShowEmoji(p => !p); setShowCal(false); setShowMap(false); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors ${showEmoji ? "text-fuchsia-400 bg-fuchsia-500/10" : "text-gray-500 hover:text-white bg-white/5"}`}>
              <Smile size={13} /> 이모지
            </button>
          </div>

          {/* 입력창 */}
          <div className="flex gap-2 px-4 pb-3">
            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="메시지 입력..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-fuchsia-500/50" />
            <button onClick={send} className="px-3 py-2 rounded-lg text-white" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
