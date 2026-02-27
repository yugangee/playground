"use client";
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ensureEC2Running } from "@/lib/ensureEC2";

const API_URL = process.env.NEXT_PUBLIC_VIDEO_API_URL || "https://d2e8khynpnbcpl.cloudfront.net";

type Msg = { role: "user" | "assistant"; content: string };

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "안녕하세요! 축구 관련 궁금한 점이 있으면 물어보세요 ⚽" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);
    setInput("");
    setLoading(true);
    try {
      // EC2 서버 확인 및 시작
      const ec2Ready = await ensureEC2Running();
      if (!ec2Ready) {
        setMsgs(prev => [...prev, { role: "assistant", content: "서버가 시작 중이에요. 잠시 후 다시 시도해주세요 ⚽" }]);
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMsgs.slice(-10) }),
      });
      if (!res.ok) throw new Error("응답 실패");
      const data = await res.json();
      setMsgs(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMsgs(prev => [...prev, { role: "assistant", content: "죄송합니다, 오류가 발생했어요. 다시 시도해주세요." }]);
    } finally { setLoading(false); }
  }

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-black text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform border border-white/20">
          <MessageCircle size={24} />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] rounded-2xl shadow-2xl border border-gray-300 dark:border-white/20 bg-white dark:bg-[#111] flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 bg-black text-white">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} />
              <span className="text-sm font-semibold">AI 축구 어시스턴트</span>
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
            {loading && (
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
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="메시지를 입력하세요..."
                className="flex-1 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-black dark:focus:border-white/40 transition-colors"
                style={{ color: "var(--text-primary)" }} />
              <button onClick={send} disabled={loading || !input.trim()}
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
