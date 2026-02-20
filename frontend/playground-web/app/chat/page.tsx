"use client";
import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Calendar, MapPin, X } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import Image from "next/image";

export default function ChatPage() {
  const { rooms, sendMsg, sendTimeSlot, selectTime } = useChat();
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

  function send() {
    if (!input.trim() || !active) return;
    sendMsg(active.id, input);
    setInput("");
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
        {rooms.map(r => (
          <button key={r.id} onClick={() => setActiveId(r.id)}
            className={`flex items-center gap-3 px-3 py-3 text-left border-b border-white/5 transition-colors ${active?.id === r.id ? "bg-fuchsia-500/10" : "hover:bg-white/5"}`}>
            <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 border border-white/10">
              <Image src={r.avatar} alt={r.userName} fill className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-white text-xs font-semibold">{r.userName}</span>
                <span className="text-gray-500 text-xs">{r.team}</span>
              </div>
              <span className="text-gray-500 text-xs truncate block mt-0.5">{r.msgs.at(-1)?.text}</span>
            </div>
          </button>
        ))}
      </div>

      {/* 채팅창 */}
      {active && (
        <div className="flex-1 bg-white/5 border border-white/10 rounded-xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-white font-semibold text-sm">{active.team}</p>
            <p className="text-gray-500 text-xs">{active.date} · {active.venue}</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {active.msgs.map((m, i) => (
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
                            : { background: "rgba(255,255,255,0.1)", color: "white" }
                          }>{t}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <span className={`text-xs px-3 py-2 rounded-2xl max-w-[70%] ${m.from === "me" ? "text-white" : "bg-white/10 text-gray-200"}`}
                    style={m.from === "me" ? { background: "linear-gradient(to right, #c026d3, #7c3aed)" } : {}}>
                    {m.text}
                  </span>
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
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-fuchsia-500/50" style={{ colorScheme: "dark" }} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"].map(t => (
                  <button key={t} type="button" onClick={() => setCalTimes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}
                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                    style={calTimes.includes(t) ? { background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" } : { background: "rgba(255,255,255,0.05)", color: "#9ca3af" }}>
                    {t}
                  </button>
                ))}
              </div>
              <button onClick={sendDate} disabled={!calDate}
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

          <div className="px-4 pt-2 pb-1 flex gap-2 border-t border-white/10">
            <button onClick={() => { setShowCal(p => !p); setShowMap(false); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors ${showCal ? "text-fuchsia-400 bg-fuchsia-500/10" : "text-gray-500 hover:text-white bg-white/5"}`}>
              <Calendar size={13} /> 날짜
            </button>
            <button onClick={() => { setShowMap(p => !p); setShowCal(false); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors ${showMap ? "text-fuchsia-400 bg-fuchsia-500/10" : "text-gray-500 hover:text-white bg-white/5"}`}>
              <MapPin size={13} /> 장소
            </button>
          </div>
          <div className="flex gap-2 px-4 pb-3">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
              placeholder="메시지 입력..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-fuchsia-500/50" />
            <button onClick={send} className="px-3 py-2 rounded-lg text-white" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
