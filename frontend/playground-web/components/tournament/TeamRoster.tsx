"use client";

import { PlayerRoster } from '@/types/tournament';

interface Props {
  roster: PlayerRoster[];
}

const roleColor: Record<string, React.CSSProperties> = {
  '주장': { background: '#EEF2FF', color: '#4338CA' },
  '감독': { background: '#F3F4F6', color: '#6B7280' },
  '총무': { background: '#DCFCE7', color: '#166534' },
  '단장': { background: '#FEF3C7', color: '#92400E' },
};

export default function TeamRoster({ roster }: Props) {
  const staff = roster.filter(p => p.role);
  const players = roster.filter(p => !p.role);

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>등록 {roster.length}명</span>
        <span>유니폼 검정/파랑</span>
      </div>

      {/* 스태프 */}
      {staff.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {staff.map(p => (
            <span key={p.no} className="text-[10px] px-2 py-1 rounded" style={roleColor[p.role!]}>
              {p.role} {p.name}
            </span>
          ))}
        </div>
      )}

      {/* 선수 명단 */}
      <div className="rounded-lg overflow-hidden" style={{ background: '#F9FAFB' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
              <th className="text-left px-3 py-2 text-[10px] font-medium w-10" style={{ color: '#9CA3AF' }}>#</th>
              <th className="text-left px-3 py-2 text-[10px] font-medium" style={{ color: '#9CA3AF' }}>이름</th>
              <th className="text-left px-3 py-2 text-[10px] font-medium" style={{ color: '#9CA3AF' }}>소속</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, idx) => (
              <tr key={p.no} style={{ borderBottom: idx < players.length - 1 ? '1px solid #F3F4F6' : undefined }}>
                <td className="px-3 py-1.5 text-[10px] tabular-nums" style={{ color: '#9CA3AF' }}>{p.jerseyNumber ?? '-'}</td>
                <td className="px-3 py-1.5 text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                <td className="px-3 py-1.5 text-[10px]" style={{ color: '#9CA3AF' }}>{p.department}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
