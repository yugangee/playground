"use client";

import { useState, useRef } from "react";
import { Upload, Goal, Crosshair, Shield, AlertCircle, HelpCircle, Download } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_VIDEO_API_URL || "http://34.236.216.122:8000";

const typeConfig = {
  goal:   { icon: Goal,        color: "text-lime-400",   bg: "bg-lime-400/10 border-lime-400/30",    label: "골" },
  shot:   { icon: Crosshair,   color: "text-sky-400",    bg: "bg-sky-400/10 border-sky-400/30",      label: "슛" },
  tackle: { icon: Shield,      color: "text-amber-400",  bg: "bg-amber-400/10 border-amber-400/30",  label: "태클" },
  pass:   { icon: AlertCircle, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30", label: "패스" },
};

type Event = { frame: number; type: string; description: string };
type PlayerStat = { id: number; team: number; max_speed: number; total_distance: number };
type AnalysisResult = {
  output_video_url: string;
  events: Event[];
  team_ball_control?: { team1: number; team2: number };
  player_stats?: PlayerStat[];
  status?: string;
  message?: string;
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-white/10 rounded ${className}`} />;
}

// 영상 길이 가져오기 함수
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => resolve(15); // 기본값 15초
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

  // 샘플 데이터
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
    if (f.size >= 5 * 1024 * 1024 * 1024) {
      setError("5GB 미만의 영상만 업로드 가능합니다");
      return;
    }
    setFile(f);
    setLocalUrl(URL.createObjectURL(f));
    setResult(null);
    setStatus("idle");
    setError(null);
  }

  async function analyze() {
    if (!file) return;
    setError(null);
    try {
      console.log("[VIDEO] 1/4 presigned URL 요청 시작...", { filename: file.name, api: API_URL });
      setStatus("uploading");
      const presignRes = await fetch(`${API_URL}/api/presigned-upload-url?filename=${encodeURIComponent(file.name)}`);
      console.log("[VIDEO] 2/4 presigned URL 응답:", presignRes.status, presignRes.statusText);
      if (!presignRes.ok) throw new Error(`업로드 URL 생성 실패 (${presignRes.status})`);
      const { upload_url, s3_key } = await presignRes.json();
      console.log("[VIDEO] presigned URL 받음, s3_key:", s3_key);

      console.log("[VIDEO] 3/4 S3 업로드 시작...", { size: file.size, type: file.type });
      const uploadStart = Date.now();
      const uploadRes = await fetch(upload_url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      console.log("[VIDEO] S3 업로드 완료:", uploadRes.status, `(${((Date.now() - uploadStart) / 1000).toFixed(1)}초)`);
      if (!uploadRes.ok) throw new Error(`S3 업로드 실패 (${uploadRes.status})`);

      console.log("[VIDEO] 4/4 분석 요청 시작...", { s3_key, api_url: `${API_URL}/api/analyze` });
      setStatus("analyzing");
      
      // 영상 길이에 따른 예상 대기시간 계산 (15초 = 2분30초)
      if (file) {
        const videoDuration = await getVideoDuration(file);
        const estimatedSeconds = Math.ceil(videoDuration * 10); // 1초당 10초 분석
        setEstimatedTime(estimatedSeconds);
      }
      
      const analyzeStart = Date.now();
      
      console.log("[VIDEO] fetch 시작...");
      
      // 타임아웃 설정 (30분 — 영상 분석은 오래 걸릴 수 있음)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("[VIDEO] 30분 타임아웃 발생, 요청 중단");
        controller.abort();
      }, 30 * 60 * 1000);

      // 30초마다 예상 대기시간 업데이트
      const progressId = setInterval(() => {
        const elapsed = Math.floor((Date.now() - analyzeStart) / 1000);
        if (estimatedTime) {
          const remaining = Math.max(0, estimatedTime - elapsed);
          setEstimatedTime(remaining);
        }
        console.log(`[VIDEO] ⏳ 분석 진행 중... ${elapsed}초 경과`);
      }, 30000);
      
      const analyzeRes = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_s3_key: s3_key }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      clearInterval(progressId);
      console.log("[VIDEO] fetch 완료, 응답 상태:", analyzeRes.status, analyzeRes.statusText, `(${((Date.now() - analyzeStart) / 1000).toFixed(1)}초)`);
      
      if (!analyzeRes.ok) {
        console.log("[VIDEO] 에러 응답 처리 중...");
        const errBody = await analyzeRes.text();
        console.error("[VIDEO] 분석 에러 응답 body:", errBody);
        
        // 서버 에러 메시지 파싱
        let errorMessage = `분석 요청 실패 (${analyzeRes.status}: ${analyzeRes.statusText})`;
        try {
          const errorData = JSON.parse(errBody);
          if (errorData.detail && errorData.detail.includes('BertSdpaSelfAttention')) {
            errorMessage = '백엔드 AI 모델 라이브러리 오류입니다. 서버 관리자에게 문의해주세요.';
          } else if (errorData.detail) {
            errorMessage = `분석 실패: ${errorData.detail}`;
          }
        } catch (e) {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        
        throw new Error(errorMessage);
      }

      console.log("[VIDEO] JSON 파싱 시작...");
      const data = await analyzeRes.json();
      console.log("[VIDEO] JSON 파싱 완료, 분석 결과:", JSON.stringify(data).slice(0, 500));
      setResult(data);
      setStatus("done");
    } catch (err: unknown) {
      console.error("[VIDEO] 에러 발생:", err);
      console.error("[VIDEO] 에러 스택:", err instanceof Error ? err.stack : 'No stack');
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
      setStatus("error");
      setEstimatedTime(null);
    }
  }

  const isLoading = status === "uploading" || status === "analyzing";
  const showSkeleton = isLoading;
  const done = status === "done" && result;

  return (
    <div className="relative">
      <div className="max-w-3xl mx-auto space-y-5">
        {!user && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <p className="text-white font-semibold mb-2">로그인하여 AI 영상분석을 시작하세요</p>
            <p className="text-gray-400 text-sm mb-4">현재 샘플 데이터로 표시되고 있습니다</p>
            <Link href="/login" className="inline-block px-6 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
              로그인
            </Link>
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">AI 영상 분석</h1>
        </div>

        {/* 업로드 */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <a href="/test.mp4" download="test.mp4" className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                <Download size={15} className="text-sky-400" />
                <span className="text-sm text-gray-300">테스트 영상 다운</span>
              </a>
              <label className="flex items-center gap-3 w-fit px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                <Upload size={15} className="text-fuchsia-400" />
                <span className="text-sm text-gray-300">영상 업로드</span>
                <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
              </label>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 opacity-50 cursor-not-allowed">
                <Download size={15} className="text-sky-400" />
                <span className="text-sm text-gray-300">테스트 영상 다운</span>
              </div>
              <div className="flex items-center gap-3 w-fit px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 opacity-50 cursor-not-allowed">
                <Upload size={15} className="text-fuchsia-400" />
                <span className="text-sm text-gray-300">영상 업로드</span>
              </div>
            </>
          )}
          <div className="relative group">
            <HelpCircle size={16} className="text-gray-500 cursor-help" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 rounded-lg bg-[#222] border border-white/10 text-xs text-gray-300 w-72 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
              <p className="font-semibold mb-1">테스트 영상 사용법</p>
              <p className="mb-1">테스트 영상을 다운받아서 업로드해보세요.</p>
              <p>분석시간 2분 30초정도 소요됩니다.</p>
            </div>
          </div>
        </div>

        {/* 영상 플레이어: 분석 완료 후 결과 영상으로 교체 */}
        <div className="w-full aspect-video bg-black rounded-xl border border-white/10 overflow-hidden flex items-center justify-center">
          {done && result.output_video_url
            ? <video src={result.output_video_url} controls className="w-full h-full" />
            : localUrl
            ? <video src={localUrl} controls className="w-full h-full" />
            : <p className="text-gray-600 text-sm">영상을 업로드하면 여기서 재생돼요</p>
          }
        </div>

        {/* 상태 메시지 */}
        {isLoading && (
          <div className="w-full py-3 rounded-xl text-center text-sm text-gray-300 border border-white/10 bg-white/5">
            {status === "uploading" 
              ? "영상 업로드중..." 
              : estimatedTime 
                ? `AI 영상 분석중... (예상 대기시간: ${Math.floor(estimatedTime / 60)}분 ${estimatedTime % 60}초)`
                : "AI 영상 분석중..."
            }
          </div>
        )}
        {error && (
          <div className="w-full py-3 rounded-xl text-center text-sm text-red-400 border border-red-400/20 bg-red-400/5">{error}</div>
        )}

        {/* 분석 버튼 */}
        {localUrl && !isLoading && (
          <button onClick={analyze} className="w-full py-3 rounded-xl font-semibold text-sm text-white" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
            {status === "done" ? "다시 분석" : "AI 분석 시작"}
          </button>
        )}

        {/* ── AI 분석 결과 틀 (영상 업로드 후 항상 표시) ── */}
        {(localUrl || showSkeleton || done || !user) && (
          <div className="space-y-5 pt-2">
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold text-white">AI 분석 결과</p>
              <div className="relative group">
                <HelpCircle size={14} className="text-gray-500 cursor-help" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 rounded-lg bg-[#222] border border-white/10 text-xs text-gray-300 w-64 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
                  <p className="font-semibold mb-1">AI 영상 분석 기능</p>
                  <p className="mb-2">• 팀 볼 점유율: 각 팀의 볼 소유 비율 분석</p>
                  <p className="mb-2">• 이벤트 감지: 골, 슈팅, 태클, 패스 등 주요 이벤트 자동 인식</p>
                  <p className="mb-2">• 선수 추적: 개별 선수의 이동 거리와 최고 속도 측정</p>
                  <p>• 타임라인: 경기 중 주요 이벤트의 시간대별 분석</p>
                </div>
              </div>
            </div>

            {/* 팀 볼 점유율 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-400">팀 볼 점유율</p>
              {(done && result?.team_ball_control) || (!user && sampleResult.team_ball_control) ? (
                <div className="flex items-center gap-3">
                  {(() => {
                    const data = done && result?.team_ball_control ? result.team_ball_control : sampleResult.team_ball_control;
                    return (
                      <>
                        <span className="text-sm text-sky-400 w-16 shrink-0">팀 1 {data.team1}%</span>
                        <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden flex">
                          <div className="h-full bg-sky-400 transition-all duration-700" style={{ width: `${data.team1}%` }} />
                          <div className="h-full bg-fuchsia-500 transition-all duration-700" style={{ width: `${data.team2}%` }} />
                        </div>
                        <span className="text-sm text-fuchsia-400 w-16 shrink-0 text-right">팀 2 {data.team2}%</span>
                      </>
                    );
                  })()}
                </div>
              ) : done ? (
                <p className="text-sm text-gray-500">점유율 데이터 없음</p>
              ) : (
                <div className="flex items-center gap-3">
                  <Skeleton className="w-16 h-4" />
                  <Skeleton className="flex-1 h-3" />
                  <Skeleton className="w-16 h-4" />
                </div>
              )}
            </div>

            {/* 이벤트 요약 카드 */}
            <div className="grid grid-cols-4 gap-3">
              {(["goal", "shot", "tackle", "pass"] as const).map(type => {
                const cfg = typeConfig[type];
                const events = (done && result?.events) || (!user && sampleResult.events) || [];
                const count = events.filter((e: any) => e.type === type).length;
                return (
                  <div key={type} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                    {(done && result) || !user
                      ? <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p>
                      : <Skeleton className="h-8 w-8 mx-auto mb-1" />
                    }
                    <p className="text-gray-500 text-xs mt-1">{cfg.label}</p>
                  </div>
                );
              })}
            </div>

            {/* 선수별 데이터 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-400 mb-4">선수별 데이터</p>
              {(done && result?.player_stats && result.player_stats.length > 0) || (!user && sampleResult.player_stats) ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs border-b border-white/10">
                        <th className="text-left pb-2">선수 ID</th>
                        <th className="text-left pb-2">팀</th>
                        <th className="text-right pb-2">최고 속도</th>
                        <th className="text-right pb-2">이동 거리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(() => {
                        const stats = (done && result?.player_stats) || sampleResult.player_stats;
                        return stats.map((p: any) => (
                          <tr key={p.id} className="text-gray-300">
                            <td className="py-2">#{p.id}</td>
                            <td className="py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${p.team === 1 ? "bg-sky-400/20 text-sky-400" : "bg-fuchsia-400/20 text-fuchsia-400"}`}>
                                팀 {p.team}
                              </span>
                            </td>
                            <td className="py-2 text-right text-sky-300">{p.max_speed} km/h</td>
                            <td className="py-2 text-right text-lime-300">{p.total_distance} m</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              )}
            </div>

            {/* 이벤트 타임라인 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-400 mb-4">이벤트 타임라인</p>
              {(done && result?.events && result.events.length > 0) || (!user && sampleResult.events) ? (
                <div className="relative space-y-4 before:absolute before:left-[52px] before:top-0 before:bottom-0 before:w-px before:bg-white/10">
                  {(() => {
                    const events = (done && result?.events) || sampleResult.events;
                    return events.filter((event: any, i: number, arr: any[]) => {
                      if (i === 0) return true;
                      const prev = arr[i - 1];
                      if (event.type !== prev.type) return true;
                      return event.frame - prev.frame >= 24;
                    }).map((event: any, i: number) => {
                      const cfg = typeConfig[event.type as keyof typeof typeConfig] ?? typeConfig.pass;
                      const Icon = cfg.icon;
                      return (
                        <div key={i} className="flex items-start gap-4">
                          <span className="text-xs text-gray-500 w-10 pt-2.5 shrink-0 text-right">#{event.frame}</span>
                          <div className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center z-10 ${cfg.bg}`}>
                            <Icon size={14} className={cfg.color} />
                          </div>
                          <div className="pt-1.5">
                            <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                            <p className="text-sm text-gray-300 mt-0.5">{event.description}</p>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-start gap-4">
                      <Skeleton className="w-10 h-4 mt-2" />
                      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1 pt-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}