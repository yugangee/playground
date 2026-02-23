"use client";

import { useState, useRef } from "react";
import { Upload, Goal, Crosshair, Shield, AlertCircle, HelpCircle, Download, MessageSquare, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

const API_URL = process.env.NEXT_PUBLIC_VIDEO_API_URL || "https://bvologzwm8.execute-api.us-east-1.amazonaws.com";

const typeConfig = {
  goal:   { icon: Goal,        color: "text-lime-400",   bg: "bg-lime-400/10 border-lime-400/30",    label: "골" },
  shot:   { icon: Crosshair,   color: "text-sky-400",    bg: "bg-sky-400/10 border-sky-400/30",      label: "슛" },
  tackle: { icon: Shield,      color: "text-amber-400",  bg: "bg-amber-400/10 border-amber-400/30",  label: "태클" },
  pass:   { icon: AlertCircle, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30", label: "패스" },
};

type Event = { frame: number; type: string; description: string };
type PlayerStat = { id: number; team: number; max_speed: number; total_distance: number };
type AnalysisResult = {
  output_video_url: string; events: Event[];
  team_ball_control?: { team1: number; team2: number }; player_stats?: PlayerStat[];
  subtitles?: string[]; event_texts?: string[]; coaching?: string;
  team_colors?: { [key: string]: number[] }; status?: string; message?: string;
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-white/10 rounded ${className}`} />;
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => { window.URL.revokeObjectURL(video.src); resolve(video.duration); };
    video.onerror = () => resolve(15);
    video.src = URL.createObjectURL(file);
  });
}

export default function VideoPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [myTeam, setMyTeam] = useState<1 | 2 | null>(null);
  const [coaching, setCoaching] = useState<string | null>(null);
  const [coachingLoading, setCoachingLoading] = useState(false);

  const sampleResult = {
    output_video_url: "/test.mp4",
    events: [
      { frame: 120, type: "goal", description: "페널티 박스 우측 슈팅 → 골" },
      { frame: 340, type: "shot", description: "중거리 슈팅, 골키퍼 선방" },
      { frame: 580, type: "tackle", description: "수비수 슬라이딩 태클 성공" },
      { frame: 720, type: "pass", description: "크로스 패스로 찬스 메이킹" },
    ],
    team_ball_control: { team1: 65, team2: 35 },
    player_stats: [
      { id: 1, team: 1, max_speed: 28, total_distance: 8500 },
      { id: 2, team: 1, max_speed: 25, total_distance: 7200 },
      { id: 3, team: 2, max_speed: 30, total_distance: 9100 },
      { id: 4, team: 2, max_speed: 27, total_distance: 8800 },
    ],
  };

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size >= 5 * 1024 * 1024 * 1024) { setError("5GB 미만의 영상만 업로드 가능합니다"); return; }
    setFile(f); setLocalUrl(URL.createObjectURL(f)); setResult(null); setStatus("idle"); setError(null);
  }

  async function analyze() {
    if (!file) return;
    setError(null);
    try {
      setStatus("uploading");
      const presignRes = await fetch(`${API_URL}/api/presigned-upload-url?filename=${encodeURIComponent(file.name)}`);
      if (!presignRes.ok) throw new Error(`업로드 URL 생성 실패 (${presignRes.status})`);
      const { upload_url, s3_key } = await presignRes.json();
      const uploadRes = await fetch(upload_url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!uploadRes.ok) throw new Error(`S3 업로드 실패 (${uploadRes.status})`);
      setStatus("analyzing");
      setEstimatedTime(150);
      const analyzeStart = Date.now();
      const analyzeRes = await fetch(`${API_URL}/api/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ video_s3_key: s3_key }) });
      if (!analyzeRes.ok) throw new Error(`분석 요청 실패 (${analyzeRes.status})`);
      const { jobId } = await analyzeRes.json();
      const maxWait = 30 * 60 * 1000; const pollInterval = 5000; let elapsed = 0;
      while (elapsed < maxWait) {
        await new Promise(r => setTimeout(r, pollInterval)); elapsed += pollInterval;
        setEstimatedTime(Math.max(0, 150 - Math.floor((Date.now() - analyzeStart) / 1000)));
        const statusRes = await fetch(`${API_URL}/api/status/${jobId}`);
        if (!statusRes.ok) throw new Error("상태 확인 실패");
        const statusData = await statusRes.json();
        if (statusData.status === "done") {
          setResult({ output_video_url: statusData.result.output_video_url, events: statusData.result.events, team_ball_control: statusData.result.team_ball_control, subtitles: statusData.result.subtitles || [], event_texts: statusData.result.event_texts || [], coaching: statusData.result.coaching || null, team_colors: statusData.result.team_colors || null, status: "success", message: "분석 완료" });
          setCoaching(statusData.result.coaching || null); setStatus("done"); break;
        } else if (statusData.status === "error") { throw new Error(statusData.error || "분석 중 오류 발생"); }
      }
      if (elapsed >= maxWait) throw new Error("분석 시간이 초과되었습니다 (30분)");
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "오류가 발생했습니다"); setStatus("error"); setEstimatedTime(null); }
  }

  const isLoading = status === "uploading" || status === "analyzing";
  const showSkeleton = isLoading;
  const done = status === "done" && result;
  const uniqueSubtitles = result?.subtitles?.filter((s, i, arr) => s && s.trim() && (i === 0 || s !== arr[i - 1])) || [];
  const uniqueEvents = result?.event_texts?.filter((s, i, arr) => s && s.trim() && (i === 0 || s !== arr[i - 1])) || [];
  const getTeamColor = (teamId: number) => {
    const colors = result?.team_colors;
    if (colors && colors[String(teamId)]) { const [r, g, b] = colors[String(teamId)]; return `rgb(${r}, ${g}, ${b})`; }
    return teamId === 1 ? "#38bdf8" : "#d946ef";
  };
  async function requestCoaching(team: 1 | 2) {
    setMyTeam(team); setCoachingLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/coaching`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subtitles: result?.subtitles || [], event_texts: result?.event_texts || [], ball_control: result?.team_ball_control || {}, my_team: `팀${team}` }) });
      if (res.ok) { const data = await res.json(); setCoaching(data.coaching); }
    } catch (e) { console.error("[COACHING] error:", e); } finally { setCoachingLoading(false); }
  }
  const timelineItems = (() => {
    type TItem = { frame: number; kind: "event" | "subtitle" | "eventText"; type?: string; description?: string; text?: string };
    const items: TItem[] = [];
    const events = (done && result?.events) || (!user ? sampleResult.events : []);
    let prev: any = null;
    events.forEach((ev: any) => { if (prev && ev.type === prev.type && ev.frame - prev.frame < 24) return; items.push({ frame: ev.frame, kind: "event", type: ev.type, description: ev.description }); prev = ev; });
    if (done) { uniqueSubtitles.forEach((text, i) => items.push({ frame: i * 48, kind: "subtitle", text })); uniqueEvents.forEach((text, i) => items.push({ frame: i, kind: "eventText", text })); }
    items.sort((a, b) => a.frame - b.frame || ({ subtitle: 0, event: 1, eventText: 2 })[a.kind] - ({ subtitle: 0, event: 1, eventText: 2 })[b.kind]);
    return items;
  })();

  return (
    <div className="relative">
      <div className="max-w-6xl mx-auto space-y-5">
        {!user && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <p className="text-white font-semibold mb-2">로그인하여 AI 영상분석을 시작하세요</p>
            <p className="text-gray-400 text-sm mb-4">현재 샘플 데이터로 표시되고 있습니다</p>
            <Link href="/login" className="inline-block px-6 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>로그인</Link>
          </div>
        )}
        <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-white">AI 영상 분석</h1></div>
        <div className="flex items-center gap-2">
          {user ? (<>
            <a href="/test.mp4" download="test.mp4" className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"><Download size={15} className="text-sky-400" /><span className="text-sm text-gray-300">테스트 영상 다운</span></a>
            <label className="flex items-center gap-3 w-fit px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"><Upload size={15} className="text-fuchsia-400" /><span className="text-sm text-gray-300">영상 업로드</span><input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleFile} /></label>
          </>) : (<>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 opacity-50 cursor-not-allowed"><Download size={15} className="text-sky-400" /><span className="text-sm text-gray-300">테스트 영상 다운</span></div>
            <div className="flex items-center gap-3 w-fit px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 opacity-50 cursor-not-allowed"><Upload size={15} className="text-fuchsia-400" /><span className="text-sm text-gray-300">영상 업로드</span></div>
          </>)}
          <div className="relative group">
            <HelpCircle size={16} className="text-gray-500 cursor-help" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 rounded-lg bg-[#222] border border-white/10 text-xs text-gray-300 w-72 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
              <p className="font-semibold mb-1">테스트 영상 사용법</p><p className="mb-1">테스트 영상을 다운받아서 업로드해보세요.</p><p>분석시간 2분 30초정도 소요됩니다.</p>
            </div>
          </div>
        </div>
        {isLoading && (<div className="w-full py-3 rounded-xl text-center text-sm text-gray-300 border border-white/10 bg-white/5 flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4 text-fuchsia-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{status === "uploading" ? "영상 업로드중..." : estimatedTime !== null && estimatedTime > 0 ? `AI 영상 분석중... (예상 대기시간: ${Math.floor(estimatedTime / 60)}분 ${estimatedTime % 60}초)` : "AI 영상 분석중..."}</div>)}
        {error && <div className="w-full py-3 rounded-xl text-center text-sm text-red-400 border border-red-400/20 bg-red-400/5">{error}</div>}
        {localUrl && !isLoading && (<button onClick={analyze} className="w-full py-3 rounded-xl font-semibold text-sm text-white" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>{status === "done" ? "다시 분석" : "AI 분석 시작"}</button>)}

        {(localUrl || showSkeleton || done || !user) && (<>
          {/* 상단 2컬럼: 영상 | 점유율+이벤트카드 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="w-full aspect-video bg-black rounded-xl border border-white/10 overflow-hidden flex items-center justify-center">
              {done && result.output_video_url ? <video src={result.output_video_url} controls className="w-full h-full" /> : localUrl ? <video src={localUrl} controls className="w-full h-full" /> : <p className="text-gray-600 text-sm">영상을 업로드하면 여기서 재생돼요</p>}
            </div>
            <div className="space-y-4 flex flex-col justify-center">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
                <p className="text-xs font-semibold text-gray-400">팀 볼 점유율</p>
                {(done && result?.team_ball_control) || (!user && sampleResult.team_ball_control) ? (
                  <div className="flex items-center gap-3">{(() => { const d = done && result?.team_ball_control ? result.team_ball_control : sampleResult.team_ball_control; return (<><span className="text-sm w-20 shrink-0 flex items-center gap-1" style={{ color: getTeamColor(1) }}><span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getTeamColor(1) }} />팀1 {d.team1}%</span><div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden flex"><div className="h-full transition-all duration-700" style={{ width: `${d.team1}%`, backgroundColor: getTeamColor(1) }} /><div className="h-full transition-all duration-700" style={{ width: `${d.team2}%`, backgroundColor: getTeamColor(2) }} /></div><span className="text-sm w-20 shrink-0 text-right flex items-center gap-1 justify-end" style={{ color: getTeamColor(2) }}>팀2 {d.team2}%<span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getTeamColor(2) }} /></span></>); })()}</div>
                ) : done ? <p className="text-sm text-gray-500">점유율 데이터 없음</p> : <div className="flex items-center gap-3"><Skeleton className="w-16 h-4" /><Skeleton className="flex-1 h-3" /><Skeleton className="w-16 h-4" /></div>}
              </div>
              <div className="grid grid-cols-4 gap-3">
                {(["goal", "shot", "tackle", "pass"] as const).map(type => { const cfg = typeConfig[type]; const evts = (done && result?.events) || (!user && sampleResult.events) || []; const count = evts.filter((e: any) => e.type === type).length; return (<div key={type} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">{(done && result) || !user ? <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p> : <Skeleton className="h-8 w-8 mx-auto mb-1" />}<p className="text-gray-500 text-xs mt-1">{cfg.label}</p></div>); })}
              </div>
            </div>
          </div>

          {/* 하단 2컬럼: 타임라인 | 코칭 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 왼쪽: 이벤트 타임라인 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-400 mb-3">이벤트 타임라인</p>
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {showSkeleton ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />) : timelineItems.length > 0 ? timelineItems.map((item, i) => {
                  if (item.kind === "event") {
                    const cfg = typeConfig[item.type as keyof typeof typeConfig];
                    if (!cfg) return null;
                    const Icon = cfg.icon;
                    return (
                      <div key={`ev-${i}`} className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.bg}`}>
                        <Icon size={16} className={`mt-0.5 shrink-0 ${cfg.color}`} />
                        <div className="min-w-0">
                          <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                          <span className="text-xs text-gray-500 ml-2">프레임 {item.frame}</span>
                          <p className="text-sm text-gray-300 mt-0.5 break-words">{item.description}</p>
                        </div>
                      </div>
                    );
                  }
                  if (item.kind === "subtitle") {
                    return (
                      <div key={`sub-${i}`} className="flex items-start gap-3 p-3 rounded-lg border border-indigo-400/20 bg-indigo-400/5">
                        <MessageSquare size={16} className="mt-0.5 shrink-0 text-indigo-400" />
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-indigo-400">AI 중계</span>
                          <span className="text-xs text-gray-500 ml-2">프레임 {item.frame}</span>
                          <p className="text-sm text-gray-300 mt-0.5 break-words">{item.text}</p>
                        </div>
                      </div>
                    );
                  }
                  if (item.kind === "eventText") {
                    return (
                      <div key={`et-${i}`} className="flex items-start gap-3 p-3 rounded-lg border border-teal-400/20 bg-teal-400/5">
                        <Trophy size={16} className="mt-0.5 shrink-0 text-teal-400" />
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-teal-400">이벤트</span>
                          <p className="text-sm text-gray-300 mt-0.5 break-words">{item.text}</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }) : <p className="text-sm text-gray-600">분석 후 타임라인이 표시됩니다</p>}
              </div>
            </div>

            {/* 오른쪽: AI 코칭 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-400 mb-3">AI 코칭</p>
              {!done && !showSkeleton ? (
                <p className="text-sm text-gray-600">분석 완료 후 코칭을 받을 수 있습니다</p>
              ) : showSkeleton ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <button onClick={() => requestCoaching(1)} disabled={coachingLoading} className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${myTeam === 1 ? "text-white border-transparent" : "text-gray-400 border-white/10 bg-white/5 hover:bg-white/10"}`} style={myTeam === 1 ? { backgroundColor: getTeamColor(1) } : {}}>
                      <span className="inline-block w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: getTeamColor(1) }} />팀1 코칭
                    </button>
                    <button onClick={() => requestCoaching(2)} disabled={coachingLoading} className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${myTeam === 2 ? "text-white border-transparent" : "text-gray-400 border-white/10 bg-white/5 hover:bg-white/10"}`} style={myTeam === 2 ? { backgroundColor: getTeamColor(2) } : {}}>
                      <span className="inline-block w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: getTeamColor(2) }} />팀2 코칭
                    </button>
                  </div>
                  {coachingLoading && <p className="text-sm text-gray-400 animate-pulse">코칭 분석 중...</p>}
                  {coaching && (
                    <div className="max-h-[600px] overflow-y-auto pr-1 prose prose-invert prose-sm max-w-none [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-gray-200 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-gray-300 [&_ul]:space-y-1 [&_ol]:space-y-1 [&_li]:text-gray-300 [&_strong]:text-white [&_blockquote]:border-l-2 [&_blockquote]:border-fuchsia-400 [&_blockquote]:pl-3 [&_blockquote]:text-gray-400 [&_blockquote]:italic">
                      <ReactMarkdown>{coaching}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}
