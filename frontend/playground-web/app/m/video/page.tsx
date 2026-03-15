"use client";

import { useState, useRef } from "react";
import { Upload, Play, Pause, RotateCcw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function MobileVideoPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setLocalUrl(URL.createObjectURL(f));
    setStatus("idle");
  }

  function startAnalysis() {
    if (!file) return;
    setStatus("analyzing");
    // 임시 진행률 시뮬레이션
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 10;
      if (currentProgress >= 100) {
        currentProgress = 100;
        setStatus("done");
        clearInterval(interval);
      }
      setProgress(currentProgress);
    }, 500);
  }

  const isAnalyzing = status === "analyzing";
  const isDone = status === "done";

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          AI 영상 분석
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          경기 영상을 업로드하여 분석해보세요
        </p>
      </div>

      {/* 영상 업로드/재생 */}
      <div className="space-y-4">
        {!localUrl ? (
          <div
            className="aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 p-8"
            style={{ borderColor: "var(--card-border)" }}
          >
            <Upload size={48} className="text-[var(--brand-primary)]" />
            <div className="text-center">
              <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                영상을 업로드하세요
              </p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                MP4, MOV 파일 지원
              </p>
            </div>
            <label className="px-6 py-3 rounded-full text-sm font-semibold text-white cursor-pointer"
              style={{ background: "var(--brand-primary)" }}>
              파일 선택
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFile}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="aspect-video rounded-2xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={localUrl}
                controls
                className="w-full h-full"
              />
            </div>
            
            {!isAnalyzing && !isDone && (
              <button
                onClick={startAnalysis}
                className="w-full py-4 rounded-2xl text-lg font-semibold text-white"
                style={{ background: "var(--brand-primary)" }}
              >
                AI 분석 시작
              </button>
            )}
          </div>
        )}
      </div>

      {/* 분석 진행률 */}
      {isAnalyzing && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              분석 중...
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              선수 추적 및 이벤트 감지 중
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--text-muted)" }}>진행률</span>
              <span className="font-semibold text-[var(--brand-primary)]">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--brand-primary)] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 분석 결과 */}
      {isDone && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-lg font-semibold mb-2 text-green-500">
              분석 완료!
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border text-center" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
              <p className="text-2xl font-bold text-[var(--brand-primary)]">3</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>골</p>
            </div>
            <div className="p-4 rounded-xl border text-center" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
              <p className="text-2xl font-bold text-blue-500">7</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>슛</p>
            </div>
            <div className="p-4 rounded-xl border text-center" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
              <p className="text-2xl font-bold text-amber-500">12</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>태클</p>
            </div>
            <div className="p-4 rounded-xl border text-center" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
              <p className="text-2xl font-bold text-purple-500">45</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>패스</p>
            </div>
          </div>

          <button
            onClick={() => {
              setFile(null);
              setLocalUrl(null);
              setStatus("idle");
              setProgress(0);
            }}
            className="w-full py-3 rounded-xl border font-medium"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
          >
            <RotateCcw size={16} className="inline mr-2" />
            다시 분석
          </button>
        </div>
      )}

      {/* 로그인 안내 */}
      {!user && (
        <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--brand-primary-light)]">
          <p className="text-sm text-center" style={{ color: "var(--text-primary)" }}>
            로그인하여 실제 AI 분석을 이용해보세요
          </p>
        </div>
      )}
    </div>
  );
}