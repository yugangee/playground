"use client";

import { PlayerRoster } from '@/types/tournament';

interface Props {
  roster: PlayerRoster[];
}

const roleColor: Record<string, React.CSSProperties> = {
  '주장': { background: 'rgba(192,38,211,0.15)', color: '#e879f9' },
  '감독': { background: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  '총무': { background: 'rgba(34,197,94,0.15)',   color: '#4ade80' },
  '단장': { background: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
};

const deptColors = [
  '#e879f9', '#60a5fa', '#4ade80', '#fbbf24', '#f87171',
  '#34d399', '#a78bfa', '#fb923c', '#38bdf8',
];

function getDeptColor(dept: string, allDepts: string[]): string {
  const idx = allDepts.indexOf(dept);
  return deptColors[idx % deptColors.length] ?? '#9ca3af';
}

export default function TeamRoster({ roster }: Props) {
  const allDepts = [...new Set(roster.map(p => p.department))];

  // 부서별 분포
  const deptCount = allDepts.map(dept => ({
    dept,
    count: roster.filter(p => p.department === dept).length,
    color: getDeptColor(dept, allDepts),
  }));

  return (
    <div className="space-y-6">
      {/* 팀 정보 요약 */}
      <div className="rounded-xl border p-4 grid grid-cols-2 sm:grid-cols-4 gap-3"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
        <div className="text-center">
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>팀명</p>
          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>어벤져스</p>
        </div>
        <div className="text-center">
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>유니폼</p>
          <p className="font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>검정·파랑 / 검정</p>
        </div>
        <div className="text-center">
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>등록 선수</p>
          <p className="font-bold" style={{ color: '#e879f9' }}>{roster.length}명</p>
        </div>
        <div className="text-center">
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>시드</p>
          <p className="font-bold text-amber-400">4시드 (직전 4위)</p>
        </div>
      </div>

      {/* 부서별 분포 */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>부서별 선수 분포</h3>
        <div className="flex flex-wrap gap-2">
          {deptCount.map(({ dept, count, color }) => (
            <div key={dept} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
              style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}>
              {dept} ({count}명)
            </div>
          ))}
        </div>
      </div>

      {/* 스태프 */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>스태프</h3>
        <div className="flex flex-wrap gap-2">
          {roster.filter(p => p.role).map(p => (
            <div key={p.no} className="flex items-center gap-2 rounded-lg border px-3 py-2"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
              <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                style={roleColor[p.role!]}>
                {p.role}
              </span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {p.jerseyNumber != null ? `#${p.jerseyNumber}` : ''} {p.name}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.department}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 전체 선수 명단 테이블 */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>등록 선수 명단</h3>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--card-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--card-border)' }}>
                <th className="text-left px-4 py-2.5 text-xs font-semibold w-12" style={{ color: 'var(--text-muted)' }}>번호</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold w-16" style={{ color: 'var(--text-muted)' }}>등번호</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>이름</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>소속</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold w-20" style={{ color: 'var(--text-muted)' }}>역할</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((p, idx) => (
                <tr
                  key={p.no}
                  style={{
                    borderBottom: idx < roster.length - 1 ? '1px solid var(--card-border)' : undefined,
                    background: p.role ? 'rgba(192,38,211,0.04)' : undefined,
                  }}
                >
                  <td className="px-4 py-2.5 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{p.no}</td>
                  <td className="px-4 py-2.5 font-bold tabular-nums"
                    style={{ color: p.jerseyNumber != null ? '#e879f9' : 'var(--text-muted)' }}>
                    {p.jerseyNumber != null ? `#${p.jerseyNumber}` : '-'}
                  </td>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{p.department}</td>
                  <td className="px-4 py-2.5">
                    {p.role ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={roleColor[p.role]}>
                        {p.role}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
