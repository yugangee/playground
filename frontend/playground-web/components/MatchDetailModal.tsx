"use client";

import { useState } from "react";
import { X, Plus, Trash2, ArrowRightLeft, Pencil } from "lucide-react";
import { manageFetch } from "@/lib/manageFetch";

export function MatchDetailModal({ m, authClubId, clubNameMap, isDemo, isLeaderUser, isManagerUser, members, memberNames, onClose, onGoalEdit, onUpdate }: {
  m: any; authClubId: string | null; clubNameMap: Record<string, string>; isDemo?: boolean;
  isLeaderUser: boolean; isManagerUser: boolean; members: any[]; memberNames: Record<string, string>;
  onClose: () => void; onGoalEdit?: () => void; onUpdate: (updated: any) => void;
}) {
  const [tab, setTab] = useState<'info' | 'cards' | 'subs' | 'log'>('info');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [cards, setCards] = useState<{ playerName: string; type: 'yellow' | 'red'; minute: string }[]>(
    (m.cards || []).map((c: any) => ({ playerName: c.playerName || '', type: c.type || 'yellow', minute: c.minute?.toString() || '' }))
  );
  const [subs, setSubs] = useState<{ outPlayer: string; inPlayer: string; minute: string }[]>(
    (m.substitutions || []).map((s: any) => ({ outPlayer: s.outPlayer || '', inPlayer: s.inPlayer || '', minute: s.minute?.toString() || '' }))
  );
  const [matchLog, setMatchLog] = useState(m.matchLog || '');

  const isHome = m.homeClubId === authClubId;
  const opponentName = m._fromManage ? (m.awayTeamName || m.awayTeamId || "상대팀") : (clubNameMap?.[isHome ? m.awayClubId : m.homeClubId] || "상대팀");
  const ourScore = m._fromManage ? m.ourScore : (isHome ? m.homeScore : m.awayScore);
  const theirScore = m._fromManage ? m.theirScore : (isHome ? m.awayScore : m.homeScore);
  const result = m._fromManage ? (m.result === "win" ? "승" : m.result === "loss" ? "패" : "무") : (ourScore > theirScore ? "승" : ourScore < theirScore ? "패" : "무");
  const matchDate = m._fromManage
    ? (m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : m.confirmedAt?.slice(0, 10) || "")
    : (m.confirmedAt?.slice(0, 10) || "");
  const venue = m._fromManage ? (m.venue || "") : "";
  const myGoals = m._fromManage ? (m.scorers || []) : (m.goals || []).filter((g: any) => g.club === authClubId);
  const canEdit = !isDemo && (isLeaderUser || isManagerUser);

  const memberOptions = members.map((mb: any) => ({ id: mb.userId || mb.email, name: memberNames[mb.userId] || mb.name || mb.userId }));

  const saveExtra = async () => {
    const matchId = m.id || m.matchId;
    if (!matchId) return;
    setSaving(true);
    try {
      const payload: any = {};
      payload.cards = cards.filter(c => c.playerName).map(c => ({ playerName: c.playerName, type: c.type, minute: c.minute ? parseInt(c.minute) : undefined }));
      payload.substitutions = subs.filter(s => s.outPlayer || s.inPlayer).map(s => ({ outPlayer: s.outPlayer, inPlayer: s.inPlayer, minute: s.minute ? parseInt(s.minute) : undefined }));
      payload.matchLog = matchLog;
      await manageFetch(`/schedule/matches/${matchId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      onUpdate({ ...m, ...payload });
      setEditing(false);
      alert('저장되었습니다');
    } catch (err) {
      console.error('매치 저장 실패:', err);
      alert('저장에 실패했습니다: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
    }
    finally { setSaving(false); }
  };

  const TABS = [
    { key: 'info' as const, label: '기록' },
    { key: 'cards' as const, label: '카드' },
    { key: 'subs' as const, label: '교체' },
    { key: 'log' as const, label: '로그' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "var(--modal-overlay)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className={`px-5 py-4 flex-shrink-0 ${result === "승" ? "bg-green-500" : result === "패" ? "bg-red-500" : "bg-gray-400"}`}>
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-xs font-medium">{matchDate}{venue ? ` · ${venue}` : ""}</span>
            <div className="flex items-center gap-2">
              {canEdit && !editing && (
                <button onClick={() => setEditing(true)} className="text-white/60 hover:text-white flex items-center gap-1 text-xs bg-white/20 rounded-lg px-2 py-1">
                  <Pencil size={12} /> 수정
                </button>
              )}
              <button onClick={onClose} className="text-white/60 hover:text-white"><X size={16} /></button>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="text-center">
              <p className="text-white text-xs mb-1">우리팀</p>
              <p className="text-white text-3xl font-bold">{ourScore ?? "-"}</p>
            </div>
            <span className="text-white/60 text-lg font-light">:</span>
            <div className="text-center">
              <p className="text-white text-xs mb-1">{opponentName}</p>
              <p className="text-white text-3xl font-bold">{theirScore ?? "-"}</p>
            </div>
          </div>
          <p className="text-center text-white font-semibold text-sm mt-2">{result}</p>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tab === t.key ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
              {t.label}
              {t.key === 'cards' && cards.length > 0 && <span className="ml-1 text-[10px] bg-yellow-100 text-yellow-700 rounded-full px-1.5">{cards.length}</span>}
              {t.key === 'subs' && subs.length > 0 && <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 rounded-full px-1.5">{subs.length}</span>}
            </button>
          ))}
        </div>

        {/* 탭 내용 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* 기록 탭 */}
          {tab === 'info' && (
            <>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">득점 기록</p>
                {myGoals.length === 0 ? (
                  <p className="text-xs text-gray-400">기록된 골이 없습니다</p>
                ) : (
                  <div className="space-y-1.5">
                    {m._fromManage
                      ? myGoals.filter((s: any) => s.goals > 0 || s.assists > 0).map((s: any, j: number) => (
                          <div key={j} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                            <span className="text-sm text-gray-900">{s.name || s.userId}</span>
                            <div className="flex gap-3 text-xs">
                              {s.goals > 0 && <span className="text-green-600 font-semibold">{s.goals}골</span>}
                              {s.assists > 0 && <span className="text-blue-600 font-semibold">{s.assists}도움</span>}
                            </div>
                          </div>
                        ))
                      : myGoals.map((g: any, j: number) => (
                          <div key={j} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                            <span className="text-sm text-gray-900">{g.scorerName || g.scorer?.split("@")[0]}</span>
                            <span className="text-xs text-green-600 font-semibold">{g.count}골</span>
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>
              {editing && onGoalEdit && (
                <div className="pt-2 border-t border-gray-100">
                  <button onClick={onGoalEdit} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">골 기록 수정</button>
                </div>
              )}
            </>
          )}

          {/* 카드 탭 */}
          {tab === 'cards' && (
            <>
              <p className="text-xs font-semibold text-gray-500">경고/퇴장 카드</p>
              {!editing ? (
                cards.length === 0 ? (
                  <p className="text-xs text-gray-400">기록된 카드가 없습니다</p>
                ) : (
                  <div className="space-y-1.5">
                    {cards.map((c, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-7 rounded-sm ${c.type === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                          <span className="text-sm text-gray-900">{c.playerName || '-'}</span>
                        </div>
                        {c.minute && <span className="text-xs text-gray-500">{c.minute}&apos;</span>}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <>
                  {cards.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select value={c.playerName} onChange={e => setCards(prev => prev.map((x, j) => j === i ? { ...x, playerName: e.target.value } : x))}
                        className="flex-1 rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-gray-400">
                        <option value="">선수 선택</option>
                        {memberOptions.map((mo: any) => <option key={mo.id} value={mo.name}>{mo.name}</option>)}
                      </select>
                      <button onClick={() => setCards(prev => prev.map((x, j) => j === i ? { ...x, type: x.type === 'yellow' ? 'red' : 'yellow' } : x))}
                        className={`w-8 h-8 rounded-lg flex-shrink-0 ${c.type === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`}
                        title={c.type === 'yellow' ? '옐로카드 (클릭하면 레드)' : '레드카드 (클릭하면 옐로)'}
                      />
                      <input value={c.minute} onChange={e => setCards(prev => prev.map((x, j) => j === i ? { ...x, minute: e.target.value } : x))}
                        placeholder="분" className="w-14 rounded-lg border border-gray-200 px-2 py-2 text-sm text-center text-gray-900 outline-none focus:border-gray-400" />
                      <button onClick={() => setCards(prev => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <button onClick={() => setCards(prev => [...prev, { playerName: '', type: 'yellow', minute: '' }])}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 py-1">
                    <Plus size={14} /> 카드 추가
                  </button>
                </>
              )}
            </>
          )}

          {/* 교체 탭 */}
          {tab === 'subs' && (
            <>
              <p className="text-xs font-semibold text-gray-500">선수 교체 기록</p>
              {!editing ? (
                subs.length === 0 ? (
                  <p className="text-xs text-gray-400">기록된 교체가 없습니다</p>
                ) : (
                  <div className="space-y-1.5">
                    {subs.map((s, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-red-500">OUT</span>
                          <span className="text-gray-900">{s.outPlayer || '-'}</span>
                          <ArrowRightLeft size={12} className="text-gray-300" />
                          <span className="text-green-600">IN</span>
                          <span className="text-gray-900">{s.inPlayer || '-'}</span>
                        </div>
                        {s.minute && <span className="text-xs text-gray-500">{s.minute}&apos;</span>}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <>
                  {subs.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-red-400 text-xs w-5 flex-shrink-0">OUT</span>
                          <select value={s.outPlayer} onChange={e => setSubs(prev => prev.map((x, j) => j === i ? { ...x, outPlayer: e.target.value } : x))}
                            className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-gray-400">
                            <option value="">선수 선택</option>
                            {memberOptions.map((mo: any) => <option key={mo.id} value={mo.name}>{mo.name}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-green-500 text-xs w-5 flex-shrink-0">IN</span>
                          <select value={s.inPlayer} onChange={e => setSubs(prev => prev.map((x, j) => j === i ? { ...x, inPlayer: e.target.value } : x))}
                            className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-gray-400">
                            <option value="">선수 선택</option>
                            {memberOptions.map((mo: any) => <option key={mo.id} value={mo.name}>{mo.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <ArrowRightLeft size={14} className="text-gray-300" />
                        <input value={s.minute} onChange={e => setSubs(prev => prev.map((x, j) => j === i ? { ...x, minute: e.target.value } : x))}
                          placeholder="분" className="w-14 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center text-gray-900 outline-none focus:border-gray-400" />
                      </div>
                      <button onClick={() => setSubs(prev => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500 self-center"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <button onClick={() => setSubs(prev => [...prev, { outPlayer: '', inPlayer: '', minute: '' }])}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 py-1">
                    <Plus size={14} /> 교체 추가
                  </button>
                </>
              )}
            </>
          )}

          {/* 로그 탭 */}
          {tab === 'log' && (
            <>
              <p className="text-xs font-semibold text-gray-500">경기 메모 / 로그</p>
              {!editing ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{matchLog || <span className="text-gray-400">기록된 로그가 없습니다</span>}</p>
              ) : (
                <textarea
                  value={matchLog}
                  onChange={e => setMatchLog(e.target.value)}
                  placeholder="경기 중 메모, 전술 노트, 특이사항 등을 기록하세요..."
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 resize-none min-h-[160px] placeholder:text-gray-400"
                />
              )}
            </>
          )}
        </div>

        {/* 저장 버튼 — 편집 모드 + 카드/교체/로그 탭에서만 */}
        {editing && tab !== 'info' && (
          <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
            <button onClick={saveExtra} disabled={saving}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-black hover:bg-gray-100 transition-colors disabled:opacity-50" style={{ background: "white", border: "1.5px solid #222" }}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
