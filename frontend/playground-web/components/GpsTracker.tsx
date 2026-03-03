'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { manageFetch } from '@/lib/manageFetch'

// ── Geo utilities ──────────────────────────────────────────────────────────────

function haversine([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]): number {
  const R = 6371000
  const r = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function calcSpeedKmh(p1: GpsPoint, p2: GpsPoint): number {
  const dist = haversine([p1.lat, p1.lng], [p2.lat, p2.lng])
  const dt = (p2.ts - p1.ts) / 1000
  if (dt <= 0 || dt > 15) return 0
  return (dist / dt) * 3.6
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// ── Types & constants ──────────────────────────────────────────────────────────

type GpsPoint = { lat: number; lng: number; ts: number }
type Zone = 'walk' | 'jog' | 'run' | 'sprint'

const ZONES: { key: Zone; label: string; color: string; minKmh: number }[] = [
  { key: 'walk',   label: '걷기',    color: '#94a3b8', minKmh: 0  },
  { key: 'jog',    label: '조깅',    color: '#60a5fa', minKmh: 4  },
  { key: 'run',    label: '달리기',  color: '#34d399', minKmh: 8  },
  { key: 'sprint', label: '스프린트', color: '#f59e0b', minKmh: 15 },
]

function classifyZone(kmh: number): Zone {
  if (kmh >= 15) return 'sprint'
  if (kmh >= 8) return 'run'
  if (kmh >= 4) return 'jog'
  return 'walk'
}

// ── Field heatmap (SVG) ────────────────────────────────────────────────────────

function FieldHeatmap({ points }: { points: GpsPoint[] }) {
  if (points.length < 3) return null

  const lats = points.map(p => p.lat)
  const lngs = points.map(p => p.lng)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const latRange = maxLat - minLat || 0.0001
  const lngRange = maxLng - minLng || 0.0001

  const W = 300, H = 180, PAD = 16

  const norm = points.map(p => ({
    x: PAD + ((p.lng - minLng) / lngRange) * (W - PAD * 2),
    y: PAD + (1 - (p.lat - minLat) / latRange) * (H - PAD * 2),
  }))

  // Build density grid
  const GRID = 18
  const grid: number[][] = Array.from({ length: GRID }, () => new Array(GRID).fill(0))
  norm.forEach(({ x, y }) => {
    const gx = Math.min(GRID - 1, Math.floor((x / W) * GRID))
    const gy = Math.min(GRID - 1, Math.floor((y / H) * GRID))
    grid[gy][gx]++
  })
  const maxCount = Math.max(...grid.flat(), 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl overflow-hidden">
      {/* Field */}
      <rect width={W} height={H} fill="#166534" rx="8" />
      <rect x={PAD} y={PAD} width={W - PAD * 2} height={H - PAD * 2} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <circle cx={W / 2} cy={H / 2} r="22" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

      {/* Heat cells */}
      {grid.flatMap((row, gy) =>
        row.map((count, gx) => {
          if (count === 0) return null
          const opacity = Math.min(0.85, 0.15 + (count / maxCount) * 0.7)
          const cw = W / GRID, ch = H / GRID
          return (
            <rect
              key={`${gx}-${gy}`}
              x={gx * cw} y={gy * ch}
              width={cw} height={ch}
              fill={`rgba(251,191,36,${opacity})`}
              rx="2"
            />
          )
        })
      )}

      {/* Path */}
      {norm.length > 1 && (
        <polyline
          points={norm.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"
          strokeLinejoin="round" strokeLinecap="round"
        />
      )}

      {/* Start / End markers */}
      {norm.length > 0 && (
        <circle cx={norm[0].x} cy={norm[0].y} r="4" fill="#22c55e" stroke="white" strokeWidth="1.5" />
      )}
      {norm.length > 1 && (
        <circle cx={norm[norm.length - 1].x} cy={norm[norm.length - 1].y} r="4" fill="#ef4444" stroke="white" strokeWidth="1.5" />
      )}
    </svg>
  )
}

// ── Field replayer (SVG + requestAnimationFrame) ───────────────────────────────

function FieldReplayer({ points }: { points: GpsPoint[] }) {
  const SPEED = 20 // 20x real-time
  const W = 300, H = 180, PAD = 16

  const norm = useMemo(() => {
    if (points.length < 2) return []
    const lats = points.map(p => p.lat)
    const lngs = points.map(p => p.lng)
    const minLat = Math.min(...lats), maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
    const latRange = maxLat - minLat || 0.0001
    const lngRange = maxLng - minLng || 0.0001
    return points.map(p => ({
      x: PAD + ((p.lng - minLng) / lngRange) * (W - PAD * 2),
      y: PAD + (1 - (p.lat - minLat) / latRange) * (H - PAD * 2),
    }))
  }, [points])

  const segZones = useMemo(
    () => points.slice(1).map((p, i) => classifyZone(calcSpeedKmh(points[i], p))),
    [points]
  )

  // Cumulative SVG path lengths for stroke-dashoffset animation
  const { cumLens, totalSvgLen, pathD } = useMemo(() => {
    if (norm.length < 2) return { cumLens: [0], totalSvgLen: 0, pathD: '' }
    const lens = [0]
    for (let i = 1; i < norm.length; i++) {
      const dx = norm[i].x - norm[i - 1].x
      const dy = norm[i].y - norm[i - 1].y
      lens.push(lens[i - 1] + Math.sqrt(dx * dx + dy * dy))
    }
    const d = `M ${norm.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`
    return { cumLens: lens, totalSvgLen: lens[lens.length - 1], pathD: d }
  }, [norm])

  const [frameIdx, setFrameIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const rafRef = useRef<number | null>(null)
  const loopRef = useRef({ playing: false, replayMs: 0, lastNow: 0 })

  const totalMs = points.length > 1 ? points[points.length - 1].ts - points[0].ts : 1

  const findIdx = (ms: number) => {
    const target = points[0].ts + ms
    let lo = 0, hi = points.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (points[mid].ts <= target) lo = mid
      else hi = mid - 1
    }
    return lo
  }

  useEffect(() => {
    if (!playing) return
    const L = loopRef.current
    L.lastNow = 0
    const loop = (now: number) => {
      if (!L.playing) return
      const delta = L.lastNow ? now - L.lastNow : 0
      L.lastNow = now
      L.replayMs = Math.min(L.replayMs + delta * SPEED, totalMs)
      const idx = findIdx(L.replayMs)
      setFrameIdx(idx)
      if (idx < points.length - 1) {
        rafRef.current = requestAnimationFrame(loop)
      } else {
        L.playing = false
        setPlaying(false)
      }
    }
    L.playing = true
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      L.playing = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playing]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  const toggle = () => {
    if (playing) {
      loopRef.current.playing = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      setPlaying(false)
    } else {
      if (frameIdx >= points.length - 1) {
        loopRef.current.replayMs = 0
        setFrameIdx(0)
      }
      setPlaying(true)
    }
  }

  if (norm.length < 2) return null

  const cur = norm[Math.min(frameIdx, norm.length - 1)]
  const zone = frameIdx > 0 ? segZones[Math.min(frameIdx - 1, segZones.length - 1)] : 'walk'
  const zColor = ZONES.find(z => z.key === zone)?.color ?? '#94a3b8'
  const drawnLen = cumLens[Math.min(frameIdx, cumLens.length - 1)]
  const dashOffset = totalSvgLen - drawnLen
  const pct = Math.min((loopRef.current.replayMs / totalMs) * 100, 100)

  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        경기 리플레이 <span className="normal-case font-normal text-slate-400">({SPEED}× 배속)</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl overflow-hidden">
        {/* Field */}
        <rect width={W} height={H} fill="#166534" rx="8" />
        <rect x={PAD} y={PAD} width={W - PAD * 2} height={H - PAD * 2} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <circle cx={W / 2} cy={H / 2} r="22" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

        {/* Full path (faint guide) */}
        <path d={pathD} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Drawn trail via stroke-dashoffset */}
        {totalSvgLen > 0 && (
          <path
            d={pathD}
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={totalSvgLen}
            strokeDashoffset={dashOffset}
          />
        )}

        {/* Player dot */}
        <circle cx={cur.x} cy={cur.y} r="9" fill={zColor} opacity="0.25" />
        <circle cx={cur.x} cy={cur.y} r="5" fill={zColor} stroke="white" strokeWidth="1.5" />
      </svg>

      {/* Controls */}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={toggle}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-700">
          {playing ? (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5 translate-x-px" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>
        <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="w-8 text-right text-xs tabular-nums text-slate-500">{Math.round(pct)}%</span>
      </div>

      {/* Zone indicator */}
      <div className="mt-2 flex gap-3 flex-wrap">
        {ZONES.map(z => (
          <span key={z.key} className={`flex items-center gap-1 text-xs transition-colors ${zone === z.key && frameIdx > 0 ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>
            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: z.color }} />
            {z.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface GpsTrackerProps {
  onClose: () => void
}

export function GpsTracker({ onClose }: GpsTrackerProps) {
  const [phase, setPhase] = useState<'idle' | 'tracking' | 'done'>('idle')
  const [points, setPoints] = useState<GpsPoint[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [currentSpeed, setCurrentSpeed] = useState(0)
  const [error, setError] = useState('')

  const watchIdRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedRef = useRef(0)

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('이 기기는 GPS를 지원하지 않습니다')
      return
    }
    setPhase('tracking')
    setPoints([])
    setCurrentSpeed(0)
    setElapsed(0)
    startedRef.current = Date.now()

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedRef.current) / 1000))
    }, 1000)

    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        const pt: GpsPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude, ts: pos.timestamp }
        setPoints(prev => {
          if (prev.length > 0) {
            const speed = calcSpeedKmh(prev[prev.length - 1], pt)
            if (speed >= 0) setCurrentSpeed(speed)
          }
          return [...prev, pt]
        })
      },
      err => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    )
  }

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setPhase('done')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Stats computation
  const stats = useMemo(() => {
    if (points.length < 2) return null
    let totalDist = 0, maxSpeed = 0
    const zoneCounts: Record<Zone, number> = { walk: 0, jog: 0, run: 0, sprint: 0 }
    const validSpeeds: number[] = []

    for (let i = 1; i < points.length; i++) {
      const kmh = calcSpeedKmh(points[i - 1], points[i])
      if (kmh > 0) {
        const dist = haversine([points[i - 1].lat, points[i - 1].lng], [points[i].lat, points[i].lng])
        totalDist += dist
        maxSpeed = Math.max(maxSpeed, kmh)
        zoneCounts[classifyZone(kmh)]++
        validSpeeds.push(kmh)
      }
    }

    const total = validSpeeds.length
    const avgSpeed = total > 0 ? validSpeeds.reduce((a, b) => a + b) / total : 0

    const zonePie = ZONES
      .map(z => ({ name: z.label, value: total > 0 ? Math.round((zoneCounts[z.key] / total) * 100) : 0, color: z.color }))
      .filter(z => z.value > 0)

    return { distanceM: totalDist, maxSpeedKmh: maxSpeed, avgSpeedKmh: avgSpeed, zonePie }
  }, [points])

  const liveDistText = () => {
    if (!stats || stats.distanceM === 0) return '–'
    return stats.distanceM < 1000
      ? `${Math.round(stats.distanceM)}m`
      : `${(stats.distanceM / 1000).toFixed(2)}km`
  }

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const saveSession = async () => {
    if (!stats) return
    setSaving(true)
    try {
      const sessionId = `gps_${Date.now()}`
      const zonePct: Record<string, number> = {}
      stats.zonePie.forEach(z => { zonePct[z.name] = z.value })
      const step = Math.max(1, Math.floor(points.length / 60))
      const sampled = points.filter((_, i) => i % step === 0)
      await manageFetch('/schedule/performance', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          distanceM: Math.round(stats.distanceM),
          maxSpeedKmh: parseFloat(stats.maxSpeedKmh.toFixed(1)),
          avgSpeedKmh: parseFloat(stats.avgSpeedKmh.toFixed(1)),
          elapsedSec: elapsed,
          zonePct,
          points: sampled,
        }),
      })
      setSaved(true)
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  const reset = () => { setPhase('idle'); setPoints([]); setElapsed(0); setCurrentSpeed(0); setError(''); setSaved(false) }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" style={{ maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
              <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">GPS 퍼포먼스 트래커</div>
              <div className="text-xs text-slate-400">이동 거리 · 속도 · 히트맵 분석</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {/* ── IDLE ── */}
          {phase === 'idle' && (
            <>
              <div className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-500">
                <p className="mb-1 font-semibold text-slate-700">사용 방법</p>
                <p>경기 시작 전 "추적 시작"을 누르세요. GPS가 이동 경로를 기록하며 경기 후 히트맵·속도 분석을 제공합니다.</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs text-slate-500">
                {[['📍', '이동 거리'], ['⚡', '최고 속도'], ['🎯', '히트맵']].map(([icon, label]) => (
                  <div key={label} className="rounded-xl bg-slate-50 py-4">
                    <div className="mb-1 text-2xl">{icon}</div>
                    <div className="font-medium">{label}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={startTracking}
                className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
                추적 시작
              </button>
            </>
          )}

          {/* ── TRACKING ── */}
          {phase === 'tracking' && (
            <>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                <span className="text-sm font-semibold text-red-600">추적 중</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xl font-bold tabular-nums text-slate-900">{fmtTime(elapsed)}</div>
                  <div className="mt-1 text-xs text-slate-400">경과 시간</div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4">
                  <div className="text-xl font-bold tabular-nums text-emerald-700">{liveDistText()}</div>
                  <div className="mt-1 text-xs text-emerald-600">이동 거리</div>
                </div>
                <div className="rounded-xl bg-blue-50 p-4">
                  <div className="text-xl font-bold tabular-nums text-blue-700">{currentSpeed.toFixed(1)}</div>
                  <div className="mt-1 text-xs text-blue-600">km/h</div>
                </div>
              </div>

              {/* Live speed zone indicator */}
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">현재 속도 구간</div>
                <div className="flex gap-2">
                  {ZONES.map(z => {
                    const active = points.length > 1 && classifyZone(currentSpeed) === z.key
                    return (
                      <div key={z.key} className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold transition-all ${active ? 'text-white' : 'text-slate-400'}`}
                        style={{ background: active ? z.color : '#f1f5f9' }}>
                        {z.label}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                <span>수집된 포인트</span>
                <span className="font-semibold tabular-nums text-slate-900">{points.length}개</span>
              </div>

              <button
                onClick={stopTracking}
                className="w-full rounded-xl bg-red-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-red-700">
                추적 종료
              </button>
            </>
          )}

          {/* ── DONE ── */}
          {phase === 'done' && (
            <>
              {stats ? (
                <>
                  {/* Summary stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-emerald-50 p-4">
                      <div className="text-xs font-medium text-emerald-700">이동 거리</div>
                      <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-900">
                        {stats.distanceM < 1000
                          ? `${Math.round(stats.distanceM)}m`
                          : `${(stats.distanceM / 1000).toFixed(2)}km`}
                      </div>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-4">
                      <div className="text-xs font-medium text-blue-700">최고 속도</div>
                      <div className="mt-1 text-2xl font-bold tabular-nums text-blue-900">
                        {stats.maxSpeedKmh.toFixed(1)}<span className="text-sm font-normal"> km/h</span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-xs font-medium text-slate-600">평균 속도</div>
                      <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                        {stats.avgSpeedKmh.toFixed(1)}<span className="text-sm font-normal"> km/h</span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-xs font-medium text-slate-600">추적 시간</div>
                      <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{fmtTime(elapsed)}</div>
                    </div>
                  </div>

                  {/* Heatmap */}
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">이동 경로 히트맵</div>
                    <FieldHeatmap points={points} />
                    <div className="mt-2 flex items-center justify-end gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />시작
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />종료
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />밀집 구간
                      </span>
                    </div>
                  </div>

                  {/* Replayer */}
                  <FieldReplayer points={points} />

                  {/* Speed zones pie */}
                  {stats.zonePie.length > 0 && (
                    <div>
                      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">속도 구간 분포</div>
                      <div className="flex items-center gap-4">
                        <div style={{ width: 120, height: 120, flexShrink: 0 }}>
                          <ResponsiveContainer width="99%" height="100%">
                            <PieChart>
                              <Pie data={stats.zonePie} cx="50%" cy="50%" innerRadius={28} outerRadius={52} dataKey="value" paddingAngle={2}>
                                {stats.zonePie.map((entry, i) => (
                                  <Cell key={i} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(v: number) => [`${v}%`, '']} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-2">
                          {stats.zonePie.map(({ name, value, color }) => (
                            <div key={name} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: color }} />
                                <span className="text-slate-600">{name}</span>
                              </div>
                              <span className="font-semibold tabular-nums text-slate-900">{value}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-center text-sm text-amber-700">
                  GPS 데이터가 부족합니다. 신호가 수신될 때 다시 시도해 주세요.
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={reset}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                  다시 시작
                </button>
                {stats && !saved ? (
                  <button
                    onClick={saveSession}
                    disabled={saving}
                    className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60">
                    {saving ? '저장 중...' : '서버에 저장'}
                  </button>
                ) : saved ? (
                  <div className="flex-1 rounded-xl bg-emerald-50 py-3 text-center text-sm font-semibold text-emerald-600">✓ 저장됨</div>
                ) : null}
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
                  완료
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
