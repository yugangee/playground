"use client";

import { useState, useRef } from "react";
import { Upload, Goal, Crosshair, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

const demoEvents = [
  { time: "08:12", type: "goal",  label: "골",   desc: "페널티 박스 좌측 침투 후 오른발 슈팅 → 골" },
  { time: "23:45", type: "shot",  label: "슈팅", desc: "중거리 슈팅, 골키퍼 정면 선방" },
  { time: "41:30", type: "foul",  label: "파울", desc: "상대 미드필더 태클 파울" },
  { time: "67:18", type: "goal",  label: "골",   desc: "코너킥 헤더 연결 → 골" },
  { time: "82:05", type: "shot",  label: "슈팅", desc: "왼발 감아차기, 크로스바 맞음" },
];

const typeConfig = {
  goal: { icon: Goal,        color: "text-lime-400",  bg: "bg-lime-400/10 border-lime-400/30" },
  shot: { icon: Crosshair,   color: "text-sky-400",   bg: "bg-sky-400/10 border-sky-400/30" },
  foul: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30" },
};

export default function VideoPage() {
  const { user } = useAuth();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setVideoUrl(URL.createObjectURL(f));
    setAnalyzed(false);
  }

  function analyze() {
    setAnalyzing(true);
    setTimeout(() => { setAnalyzing(false); setAnalyzed(true); }, 2000);
  }

  return (
    <div className="relative">
      {!user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto bg-[#111] border border-white/10 rounded-2xl p-8 max-w-xs text-center space-y-4 shadow-2xl">
            <p className="text-white font-semibold">로그인이 필요합니다</p>
            <p className="text-gray-400 text-xs">로그인하고 AI 영상분석을 시작하세요</p>
            <Link href="/login" className="inline-block px-8 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
              로그인
            </Link>
          </div>
        </div>
      )}
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-white">AI 영상 분석</h1>

      {/* 업로드 버튼 */}
      <label className="flex items-center gap-3 w-fit px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
        <Upload size={15} className="text-fuchsia-400" />
        <span className="text-sm text-gray-300">영상 업로드</span>
        <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
      </label>

      {/* 영상 플레이어 */}
      <div className="w-full aspect-video bg-black rounded-xl border border-white/10 overflow-hidden flex items-center justify-center">
        {videoUrl
          ? <video src={videoUrl} controls className="w-full h-full" />
          : <p className="text-gray-600 text-sm">영상을 업로드하면 여기서 재생돼요</p>
        }
      </div>

      {/* 분석 버튼 */}
      {videoUrl && (
        <button onClick={analyze} disabled={analyzing}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-60"
          style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
          {analyzing ? "AI 분석 중..." : analyzed ? "다시 분석" : "AI 분석 시작"}
        </button>
      )}

      {/* 분석 결과 */}
      {(analyzed || !videoUrl) && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "감지된 골", value: 2, color: "text-lime-400" },
              { label: "슈팅 횟수", value: 3, color: "text-sky-400" },
              { label: "파울",      value: 1, color: "text-amber-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-gray-500 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-xs font-semibold text-gray-300 mb-4">AI 감지 이벤트</p>
            <div className="relative space-y-4 before:absolute before:left-[52px] before:top-0 before:bottom-0 before:w-px before:bg-white/10">
              {demoEvents.map(({ time, type, label, desc }) => {
                const { icon: Icon, color, bg } = typeConfig[type as keyof typeof typeConfig];
                return (
                  <div key={time} className="flex items-start gap-4">
                    <span className="text-xs text-gray-500 w-10 pt-2.5 shrink-0 text-right">{time}</span>
                    <div className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center z-10 ${bg}`}>
                      <Icon size={14} className={color} />
                    </div>
                    <div className="pt-1.5">
                      <span className={`text-xs font-semibold ${color}`}>{label}</span>
                      <p className="text-sm text-gray-300 mt-0.5">{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
