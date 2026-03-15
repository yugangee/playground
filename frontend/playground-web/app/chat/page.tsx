"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, Send, Calendar, MapPin, X, Users } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/lib/useWebSocket";
import Image from "next/image";

export default function ChatPage() {
  const { rooms, sendMsg, sendTimeSlot, selectTime, addLiveMsg, setHistory } = useChat();
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [showCal, setShowCal] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [calDate, setCalDate] = useState("");
  const [calTimes, setCalTimes] = useState<string[]>([]);
  const [mapVenue, setMapVenue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = rooms.find(r => r.id === activeId) ?? rooms[0] ?? null;
  useEffect(() => { if (active && !activeId) setActiveId(active.id); }, [rooms]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.msgs]);

  // WebSocket for team chat
  const isLiveRoom = active?.type === "team" && !!active?.roomId;
  const wsRoomId = isLiveRoom ? active.roomId! : "";

  const onWsMessage = useCallback((data: any) => {
    if (!active) return;
    if (data.action === "message") {
      const isMe = data.email === user?.email;
      if (!isMe) {
        addLiveMsg(active.id, { from: "them", text: data.text, userName: data.userName, email: data.email, timestamp: data.timestamp });
      }
    }
    if (data.action === "history" && data.messages) {
      const msgs = data.messages.map((m: any) => ({
        from: m.email === user?.email ? "me" as const : "them" as const,
        text: m.text,
        userName: m.userName,
        email: m.email,
        timestamp: m.timestamp,
      }));
      setHistory(active.id, msgs);
    }
  }, [active?.id, user?.email]);

  const { send: wsSend, connected } = useWebSocket({
    roomId: wsRoomId,
    userName: user?.name || "익명",
    email: user?.email || "",
    onMessage: onWsMessage,
  });

  function send() {
    if (!input.trim() || !active) return;
    const message = input.trim();
    setInput(""); // 먼저 입력창 초기화
    
    if (isLiveRoom) {
      wsSend(message);
      addLiveMsg(active.id, { from: "me", text: message, userName: user?.name, email: user?.email, timestamp: new Date().toISOString() });
    } else {
      sendMsg(active.id, message);
    }
  }

  function sendDate() {
    if (!calDate || !calTimes.length || !active) return;
    sendTimeSlot(active.id, calDate, calTimes);
    setCalDate(""); setCalTimes([]); setShowCal(false);
  }

  function sendVenue() {
    if (!mapVenue.trim() || !active) return;
    sendMsg(active.id, `${mapVenue}`);
    setMapVenue(""); setShowMap(false);
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
      <div className="w-56 shrink-0 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden flex flex-col">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-3 border-b border-gray-200 dark:border-white/10">채팅 목록</p>
        <div className="overflow-y-auto flex-1">
          {rooms.filter(r => r.type === "team").length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 pt-3 pb-1">팀 채팅</p>
              {rooms.filter(r => r.type === "team").map(r => (
                <button key={r.id} onClick={() => setActiveId(r.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-left border-b border-gray-100 dark:border-white/5 transition-colors ${active?.id === r.id ? "bg-[var(--brand-primary-light)]" : "hover:bg-gray-100 dark:hover:bg-white/5"}`}>
                  <div className="w-9 h-9 rounded-full shrink-0 border border-[var(--card-border)] bg-[var(--brand-primary-light)] flex items-center justify-center">
                    <Users size={16} className="text-[var(--brand-primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-900 dark:text-white text-xs font-semibold block">{r.team}</span>
                    <span className="text-gray-500 text-xs truncate block mt-0.5">{r.msgs.at(-1)?.text}</span>
                  </div>
                </button>
              ))}
            </>
          )}
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 pt-4 pb-1">개인 채팅</p>
          {rooms.filter(r => r.type === "personal").map(r => (
            <button key={r.id} onClick={() => setActiveId(r.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 text-left border-b border-white/5 transition-colors ${active?.id === r.id ? "bg-[var(--brand-primary-light)]" : "hover:bg-white/5"}`}>
              <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 border border-white/10">
                <Image src={r.avatar} alt={r.userName} fill className="object-cover" />
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
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {active.msgs.map((m, i) => (
              <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                {m.times ? (
                  <div className={`space-y-2 max-w-[75%] ${m.from === "me" ? "items-end" : "items-start"} flex flex-col`}>
                    <span className="text-xs px-3 py-2 rounded-2xl text-white" style={{ background: "var(--brand-primary)" }}>{m.text}</span>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {m.times.map(t => (
                        <button key={t} onClick={() => selectTime(active.id, i, t)}
                          className="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
                          style={m.selectedTime?.includes(t)
                            ? { background: "var(--brand-primary)", color: "white" }
                            : { background: "var(--chip-inactive-bg)", color: "var(--text-primary)" }
                          }>{t}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={`flex flex-col ${m.from === "me" ? "items-end" : "items-start"} max-w-[70%]`}>
                    {m.from === "them" && active.type === "team" && m.userName && (
                      <span className="text-[10px] text-gray-500 mb-0.5 px-1">{m.userName}</span>
                    )}
                    <span className={`text-xs px-3 py-2 rounded-2xl text-white`}
                      style={m.from === "me"
                        ? { background: "var(--brand-primary)" }
                        : { background: "#000000" }}>
                      {m.text}
                    </span>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* 달력 패널 */}
          {showCal && (
            <div className="px-4 py-3 border-t border-white/10 bg-white/3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">날짜 · 시간 선택</span>
                <button onClick={() => setShowCal(false)} className="text-gray-500 hover:text-white"><X size={13} /></button>
              </div>
              <div className="flex gap-2">
                <input type="date" value={calDate} onChange={e => setCalDate(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[var(--brand-primary)]/50" style={{ colorScheme: "dark" }} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"].map(t => (
                  <button key={t} type="button" onClick={() => setCalTimes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}
                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                    style={calTimes.includes(t) ? { background: "var(--brand-primary)", color: "white" } : { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)" }}>
                    {t}
                  </button>
                ))}
              </div>
              <button onClick={sendDate} disabled={!calDate}
                className="w-full py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
                style={{ background: "var(--brand-primary)" }}>전송</button>
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
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[var(--brand-primary)]/50 placeholder:text-gray-600" />
              <button onClick={sendVenue} disabled={!mapVenue.trim()}
                className="w-full py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
                style={{ background: "var(--brand-primary)" }}>전송</button>
            </div>
          )}

          <div className="px-4 pt-2 pb-1 flex gap-2 border-t border-white/10">
            <button onClick={() => { setShowCal(p => !p); setShowMap(false); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors ${showCal ? "text-[var(--brand-primary)] bg-[var(--brand-primary-light)]" : "text-gray-500 hover:text-white bg-white/5"}`}>
              <Calendar size={13} /> 날짜
            </button>
            <button onClick={() => { setShowMap(p => !p); setShowCal(false); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors ${showMap ? "text-[var(--brand-primary)] bg-[var(--brand-primary-light)]" : "text-gray-500 hover:text-white bg-white/5"}`}>
              <MapPin size={13} /> 장소
            </button>
          </div>
          <div className="flex gap-2 px-4 pb-3">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
              placeholder="메시지 입력..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[var(--brand-primary)]/50" />
            <button onClick={send} className="px-3 py-2 rounded-lg text-white" style={{ background: "var(--brand-primary)" }}>
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
