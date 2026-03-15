"use client";

import { useState, useRef } from "react";
import { Upload, Goal, Crosshair, Shield, AlertCircle, HelpCircle, Download, MessageSquare, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

const API_URL = process.env.NEXT_PUBLIC_VIDEO_API_URL || "https://bvologzwm8.execute-api.us-east-1.amazonaws.com";

const typeConfig = {
  goal:   { icon: Goal,        color: "text-lime-600 dark:text-lime-400",   bg: "bg-lime-100 dark:bg-lime-400/10 border-lime-300 dark:border-lime-400/30",    label: "골" },
  shot:   { icon: Crosshair,   color: "text-sky-600 dark:text-sky-400",     bg: "bg-sky-100 dark:bg-sky-400/10 border-sky-300 dark:border-sky-400/30",         label: "슛" },
  tackle: { icon: Shield,      color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-400/10 border-amber-300 dark:border-amber-400/30", label: "태클" },
  pass:   { icon: AlertCircle, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-400/10 border-purple-300 dark:border-purple-400/30", label: "패스" },
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
  return <div className={`animate-pulse bg-gray-200 dark:bg-white/10 rounded ${className}`} />;
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
  const [myTeam, setMyTeam] = useState<1 | 2>(1);
  const [coachingMap, setCoachingMap] = useState<{ 1: string | null; 2: string | null }>({ 1: null, 2: null });
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [totalFrames, setTotalFrames] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    if (f.type && !f.type.startsWith("video/")) { setError("영상 파일만 업로드 가능합니다 (mp4, mov, webm 등)"); return; }
    setFile(f); setLocalUrl(URL.createObjectURL(f)); setResult(null); setStatus("idle"); setError(null);
  }

  function stopAnalysis() {
    if (window.confirm("영상 분석을 중지하시겠습니까?")) {
      if (abortController) {
        abortController.abort();
      }
      setStatus("idle");
      setEstimatedTime(null);
      setAbortController(null);
      setProgressMessage("");
      setProgressPercent(0);
      setCurrentFrame(0);
      setTotalFrames(0);
      setError("분석이 중지되었습니다");
    }
  }

  function seekToTime(seconds: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  }

  async function analyze() {
    if (!file) return;
    setError(null);
    setProgressMessage("");
    setProgressPercent(0);
    setCurrentFrame(0);
    setTotalFrames(0);
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      // EC2 인스턴스 확인 및 시작
      setStatus("uploading");
      setProgressMessage("서버 준비중...");
      setProgressPercent(3);
      
      const { ensureEC2Running } = await import("@/lib/ensureEC2");
      const ec2Ready = await ensureEC2Running();
      if (!ec2Ready) {
        console.warn("[EC2] Instance may not be ready, but continuing...");
      }
      
      setProgressMessage("영상 업로드 준비중...");
      setProgressPercent(5);
      const presignRes = await fetch(`${API_URL}/api/presigned-upload-url?filename=${encodeURIComponent(file.name)}`);
      if (!presignRes.ok) throw new Error(`업로드 URL 생성 실패 (${presignRes.status})`);
      const { upload_url, s3_key } = await presignRes.json();
      setProgressMessage("영상 업로드중...");
      setProgressPercent(10);
      const uploadRes = await fetch(upload_url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!uploadRes.ok) throw new Error(`S3 업로드 실패 (${uploadRes.status})`);
      setProgressMessage("영상 업로드 완료");
      setProgressPercent(25);
      setStatus("analyzing");
      setProgressMessage("AI 분석 시작...");
      // 백엔드 진행률은 25%부터 시작하도록 오프셋 설정하지 않음 (백엔드에서 조정)
      setEstimatedTime(0);
      const analyzeStart = Date.now();
      const analyzeRes = await fetch(`${API_URL}/api/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ video_s3_key: s3_key }) });
      if (!analyzeRes.ok) throw new Error(`분석 요청 실패 (${analyzeRes.status})`);
      const { jobId } = await analyzeRes.json();
      setProgressMessage("선수 추적중...");
      setProgressPercent(30);
      const maxWait = 30 * 60 * 1000; const pollInterval = 5000; let elapsed = 0;
      while (elapsed < maxWait) {
        await new Promise(r => setTimeout(r, pollInterval)); elapsed += pollInterval;
        setEstimatedTime(Math.floor((Date.now() - analyzeStart) / 1000));
        
        const statusRes = await fetch(`${API_URL}/api/status/${jobId}`);
        if (!statusRes.ok) {
          // 504 등의 에러는 무시하고 계속 polling
          console.log(`[POLLING] Status check failed (${statusRes.status}), retrying...`);
          continue;
        }
        const statusData = await statusRes.json();
        
        // 백엔드에서 받은 실제 진행률 업데이트
        if (statusData.progress_percent !== undefined) {
          setProgressPercent(statusData.progress_percent);
        }
        if (statusData.progress_stage) {
          setProgressMessage(statusData.progress_stage);
        }
        if (statusData.current_frame !== undefined) {
          setCurrentFrame(statusData.current_frame);
        }
        if (statusData.total_frames !== undefined) {
          setTotalFrames(statusData.total_frames);
        }
        
        // 분석 중에도 중계 데이터 업데이트
        if (statusData.partial_subtitles && statusData.partial_subtitles.length > 0) {
          setResult(prev => prev ? {
            ...prev,
            subtitles: statusData.partial_subtitles,
          } : {
            output_video_url: "",
            events: [],
            team_ball_control: { team1: 0, team2: 0 },
            subtitles: statusData.partial_subtitles,
            event_texts: [],
            coaching: undefined,
            team_colors: undefined,
            status: "analyzing",
            message: "분석 중..."
          });
        }
        
        if (statusData.status === "done") {
          setProgressMessage("분석 완료!");
          setProgressPercent(100);
          const r = statusData.result;
          setResult({ output_video_url: r.output_video_url, events: r.events, team_ball_control: r.team_ball_control, subtitles: r.subtitles || [], event_texts: r.event_texts || [], coaching: r.coaching || null, team_colors: r.team_colors || null, status: "success", message: "분석 완료" });
          setStatus("done");
          setAbortController(null);
          fetchBothCoachings(r.subtitles || [], r.event_texts || [], r.team_ball_control || {});
          break;
        } else if (statusData.status === "error") { throw new Error(statusData.error || "분석 중 오류 발생"); }
      }
      if (elapsed >= maxWait) throw new Error("분석 시간이 초과되었습니다 (30분)");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
      setStatus("error");
      setEstimatedTime(null);
      setAbortController(null);
      setProgressMessage("");
      setProgressPercent(0);
    }
  }

  const isLoading = status === "uploading" || status === "analyzing";
  const showSkeleton = isLoading;
  const done = status === "done" && result;
  const uniqueSubtitles = result?.subtitles?.filter((s: any, i: number, arr: any[]) => {
    const text = typeof s === 'string' ? s : s?.text;
    const prevText = i > 0 ? (typeof arr[i - 1] === 'string' ? arr[i - 1] : arr[i - 1]?.text) : null;
    return text && typeof text === 'string' && text.trim() && (i === 0 || text !== prevText);
  }).map((s: any) => typeof s === 'string' ? s : s?.text) || [];
  const uniqueEvents = result?.event_texts?.filter((s, i, arr) => typeof s === 'string' && s.trim() && (i === 0 || s !== arr[i - 1])) || [];
  const getTeamColor = (teamId: number) => {
    const colors = result?.team_colors;
    if (colors && colors[String(teamId)]) { const [r, g, b] = colors[String(teamId)]; return `rgb(${r}, ${g}, ${b})`; }
    return teamId === 1 ? "#38bdf8" : "#d946ef";
  };
  async function fetchBothCoachings(subtitles: string[], event_texts: string[], ball_control: any) {
    setCoachingLoading(true);
    try {
      const [res1, res2] = await Promise.all([
        fetch(`${API_URL}/api/coaching`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subtitles, event_texts, ball_control, my_team: "팀1" }) }),
        fetch(`${API_URL}/api/coaching`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subtitles, event_texts, ball_control, my_team: "팀2" }) }),
      ]);
      const [d1, d2] = await Promise.all([res1.ok ? res1.json() : null, res2.ok ? res2.json() : null]);
      setCoachingMap({ 1: d1?.coaching || null, 2: d2?.coaching || null });
    } catch (e) { console.error("[COACHING] error:", e); } finally { setCoachingLoading(false); }
  }
  const timelineItems = (() => {
    type TItem = { frame: number; kind: "subtitle"; text?: string; time?: string };
    const items: TItem[] = [];
    // 분석 중이거나 완료된 경우 모두 표시
    if (done || (status === "analyzing" && result)) { 
      uniqueSubtitles.forEach((subtitle: any, i: number) => {
        // subtitle이 객체인 경우 (새 형식)
        if (typeof subtitle === 'object' && subtitle.time !== undefined) {
          const seconds = subtitle.time;
          const minutes = Math.floor(seconds / 60);
          const secs = Math.floor(seconds % 60);
          const timeStr = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          items.push({ 
            frame: subtitle.frame || i * 48, 
            kind: "subtitle", 
            text: subtitle.text, 
            time: timeStr 
          });
        } 
        // subtitle이 문자열인 경우 (기존 형식 - 하위 호환성)
        else {
          const text = typeof subtitle === 'string' ? subtitle : subtitle?.text;
          const seconds = i * 4; // 96프레임 = 4초 (24fps 기준)
          const minutes = Math.floor(seconds / 60);
          const secs = seconds % 60;
          const timeStr = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          items.push({ frame: i * 96, kind: "subtitle", text, time: timeStr });
        }
      });
    }
    return items;
  })();

  return (
    <div className="relative">
      <div className="max-w-6xl mx-auto space-y-5">
        {!user && (
          <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 text-center">
            <p style={{ color: "var(--text-primary)" }} className="font-semibold mb-2">로그인하여 AI 영상분석을 시작하세요</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">현재 샘플 데이터로 표시되고 있습니다</p>
            <Link href="/login" className="inline-block px-6 py-2 rounded-lg text-sm font-semibold text-white btn-press" style={{ background: "var(--brand-primary)" }}>로그인</Link>
          </div>
        )}
        <div className="flex items-center gap-3"><h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>AI 영상 분석</h1></div>
        <div className="flex items-center gap-2">
          {user ? (<>
            <a href="/test.mp4" download="test.mp4" className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"><Download size={15} className="text-sky-500 dark:text-sky-400" /><span className="text-sm" style={{ color: "var(--text-secondary)" }}>테스트 영상 다운</span></a>
            <label className="flex items-center gap-3 w-fit px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer transition-colors"><Upload size={15} className="text-[var(--brand-primary)]" /><span className="text-sm" style={{ color: "var(--text-secondary)" }}>영상 업로드</span><input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleFile} /></label>
          </>) : (<>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 opacity-50 cursor-not-allowed"><Download size={15} className="text-sky-500 dark:text-sky-400" /><span className="text-sm" style={{ color: "var(--text-secondary)" }}>테스트 영상 다운</span></div>
            <div className="flex items-center gap-3 w-fit px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 opacity-50 cursor-not-allowed"><Upload size={15} className="text-[var(--brand-primary)]" /><span className="text-sm" style={{ color: "var(--text-secondary)" }}>영상 업로드</span></div>
          </>)}
          <div className="relative group">
            <HelpCircle size={16} className="text-gray-400 dark:text-gray-500 cursor-help" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-4 py-3 rounded-lg bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-gray-300 w-80 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
              <p className="font-semibold text-gray-900 dark:text-white mb-1.5">AI 영상 분석 안내</p>
              <p className="mb-2">촬영한 축구 경기 영상을 업로드하여 경기를 분석해보세요.</p>
              <p className="font-semibold text-yellow-600 dark:text-yellow-400 mb-1">주의사항</p>
              <ul className="list-disc list-inside space-y-0.5 text-gray-500 dark:text-gray-400 mb-2">
                <li>1분 30초 이내 영상 권장</li>
                <li>선수의 전신이 카메라에 잡혀야 추적 가능</li>
              </ul>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">테스트 영상 사용법</p>
              <p className="text-gray-500 dark:text-gray-400">테스트 영상을 다운받아 업로드해보세요. 분석시간 약 2분 30초 소요됩니다.</p>
            </div>
          </div>
        </div>
        {isLoading && (
          <div className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-[var(--brand-primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {progressMessage || (status === "uploading" ? "영상 업로드중..." : "AI 영상 분석중...")}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[var(--brand-primary)]">{progressPercent}%</span>
                <button onClick={stopAnalysis} className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors">
                  중지
                </button>
              </div>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--brand-primary)] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="flex items-center justify-between mt-2">
              {estimatedTime !== null && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  진행시간: {Math.floor(estimatedTime / 60)}분 {estimatedTime % 60}초
                </p>
              )}
              {status === "analyzing" && totalFrames > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  프레임: {currentFrame.toLocaleString()} / {totalFrames.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}
        {error && <div className="w-full py-3 rounded-xl text-center text-sm text-red-500 dark:text-red-400 border border-red-200 dark:border-red-400/20 bg-red-50 dark:bg-red-400/5">{error}</div>}
        {localUrl && !isLoading && (<button onClick={analyze} className="w-full py-3 rounded-xl font-semibold text-sm text-white" style={{ background: "var(--brand-primary)" }}>{status === "done" ? "다시 분석" : "AI 분석 시작"}</button>)}

        {(localUrl || showSkeleton || done || user) && (<>
          {/* 상단 2컬럼: 영상 | 점유율+이벤트카드 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="w-full aspect-video bg-black rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden flex items-center justify-center">
              {done && result.output_video_url ? <video ref={videoRef} src={result.output_video_url} controls className="w-full h-full" /> : localUrl ? <video ref={videoRef} src={localUrl} controls className="w-full h-full" /> : <p className="text-gray-400 text-sm">영상을 업로드하면 여기서 재생돼요</p>}
            </div>
            <div className="space-y-4 flex flex-col justify-center">
              <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-5 space-y-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">팀 볼 점유율</p>
                {isLoading ? (
                  <div className="flex items-center gap-3"><Skeleton className="w-16 h-4" /><Skeleton className="flex-1 h-3" /><Skeleton className="w-16 h-4" /></div>
                ) : (done && result?.team_ball_control) || (!done && sampleResult.team_ball_control) ? (
                  <div className="flex items-center gap-3">{(() => { const d = done && result?.team_ball_control ? result.team_ball_control : sampleResult.team_ball_control; return (<><span className="text-sm font-medium w-20 shrink-0 flex items-center gap-1" style={{ color: getTeamColor(1) }}><span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getTeamColor(1) }} />팀1 {d.team1}%</span><div className="flex-1 h-3 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden flex"><div className="h-full transition-all duration-700" style={{ width: `${d.team1}%`, backgroundColor: getTeamColor(1) }} /><div className="h-full transition-all duration-700" style={{ width: `${d.team2}%`, backgroundColor: getTeamColor(2) }} /></div><span className="text-sm font-medium w-20 shrink-0 text-right flex items-center gap-1 justify-end" style={{ color: getTeamColor(2) }}>팀2 {d.team2}%<span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getTeamColor(2) }} /></span></>); })()}</div>
                ) : <p className="text-sm text-gray-500">점유율 데이터 없음</p>}
              </div>
              <div className="grid grid-cols-4 gap-3">
                {(["goal", "shot", "tackle", "pass"] as const).map(type => { const cfg = typeConfig[type]; const evts = (done && result?.events) || (!done && !isLoading && sampleResult.events) || []; const count = evts.filter((e: any) => e.type === type).length; return (<div key={type} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-center">{isLoading ? <Skeleton className="h-8 w-8 mx-auto mb-1" /> : (done && result) || (!done && !isLoading) ? <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p> : <Skeleton className="h-8 w-8 mx-auto mb-1" />}<p className="text-gray-500 text-xs mt-1">{cfg.label}</p></div>); })}
              </div>
            </div>
          </div>

          {/* 하단 2컬럼: 타임라인 | 코칭 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 왼쪽: 중계 타임라인 */}
            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">중계 타임라인</p>
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {showSkeleton ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />) : timelineItems.length > 0 ? timelineItems.map((item, i) => {
                  // item.time을 초로 변환 (MM:SS 형식)
                  const [minutes, seconds] = (item.time || "0:0").split(':').map(Number);
                  const totalSeconds = minutes * 60 + seconds;
                  
                  return (
                    <button
                      key={`sub-${i}`}
                      onClick={() => seekToTime(totalSeconds)}
                      className="w-full flex items-start gap-3 p-3 rounded-lg border border-indigo-200 dark:border-indigo-400/20 bg-indigo-50 dark:bg-indigo-400/5 hover:bg-indigo-100 dark:hover:bg-indigo-400/10 transition-colors cursor-pointer text-left"
                    >
                      <MessageSquare size={16} className="mt-0.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-indigo-500 dark:text-indigo-400">AI 중계</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{item.time}</span>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 break-words">{item.text}</p>
                      </div>
                    </button>
                  );
                }) : <p className="text-sm text-gray-400 dark:text-gray-600">분석 후 타임라인이 표시됩니다</p>}
              </div>
            </div>

            {/* 오른쪽: AI 코칭 */}
            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">AI 코칭</p>
              {!done && !showSkeleton ? (
                <p className="text-sm text-gray-400 dark:text-gray-600">분석 완료 후 코칭을 받을 수 있습니다</p>
              ) : showSkeleton ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <button onClick={() => setMyTeam(1)} className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${myTeam === 1 ? "text-white border-transparent" : "text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10"}`} style={myTeam === 1 ? { backgroundColor: getTeamColor(1) } : {}}>
                      <span className="inline-block w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: getTeamColor(1) }} />팀1 코칭
                    </button>
                    <button onClick={() => setMyTeam(2)} className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${myTeam === 2 ? "text-white border-transparent" : "text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10"}`} style={myTeam === 2 ? { backgroundColor: getTeamColor(2) } : {}}>
                      <span className="inline-block w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: getTeamColor(2) }} />팀2 코칭
                    </button>
                  </div>
                  {coachingLoading && <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">코칭 분석 중...</p>}
                  {coachingMap[myTeam] && (
                    <div className="max-h-[600px] overflow-y-auto pr-1 prose dark:prose-invert prose-sm max-w-none [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-gray-900 dark:[&_h1]:text-white [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-gray-900 dark:[&_h2]:text-white [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-gray-800 dark:[&_h3]:text-gray-200 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-gray-700 dark:[&_h4]:text-gray-300 [&_ul]:space-y-1 [&_ol]:space-y-1 [&_li]:text-gray-700 dark:[&_li]:text-gray-300 [&_strong]:text-gray-900 dark:[&_strong]:text-white [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--brand-primary)] [&_blockquote]:pl-3 [&_blockquote]:text-gray-600 dark:[&_blockquote]:text-gray-400 [&_blockquote]:italic">
                      <ReactMarkdown>{coachingMap[myTeam]}</ReactMarkdown>
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
