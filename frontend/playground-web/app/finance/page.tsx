"use client";

import { useState, useEffect, useMemo } from "react";
import { Wallet, TrendingDown, Plus, X, Bot, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { manageFetch } from "@/lib/manageFetch";
import Link from "next/link";

const FEE = 30000;

const categoryColors: Record<string, string> = {
  "구장 대여": "bg-blue-500/20 text-blue-400",
  "유니폼": "bg-fuchsia-500/20 text-fuchsia-400",
  "간식": "bg-yellow-500/20 text-yellow-400",
  "기타": "bg-white/10 text-gray-400",
};

interface Member { userId: string; role: string; joinedAt: string }
interface Due { id: string; memberId: string; amount: number; paid: boolean; paidAt?: string; createdAt: string }
interface Transaction { id: string; category: string; amount: number; description?: string; type?: string; date?: string; createdAt: string }

export default function FinancePage() {
  const { user } = useAuth();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [duesList, setDuesList] = useState<Due[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selMonth, setSelMonth] = useState(new Date().toISOString().slice(0, 7));
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ category: "", amount: "", memo: "" });
  const [isLeaderUser, setIsLeaderUser] = useState(false);

  const loadDues = async (tid: string) => {
    const data = await manageFetch(`/finance/dues?teamId=${tid}`).catch(() => []);
    setDuesList(data ?? []);
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    manageFetch("/team")
      .then(async (teams: { id: string; name: string }[]) => {
        if (!teams?.length) return;
        const team = teams[0];
        setTeamId(team.id);
        setIsLeaderUser(team.leaderId === user?.username);
        const [teamMembers, teamDues, teamTxns] = await Promise.all([
          manageFetch(`/team/${team.id}/members`).catch(() => []),
          manageFetch(`/finance/dues?teamId=${team.id}`).catch(() => []),
          manageFetch(`/finance/transactions?teamId=${team.id}`).catch(() => []),
        ]);
        setMembers(teamMembers ?? []);
        setDuesList(teamDues ?? []);
        setTransactions(teamTxns ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const expenses = useMemo(
    () =>
      transactions
        .filter((t) => !t.type || t.type === "expense")
        .map((t) => ({
          id: t.id,
          month: (t.date || t.createdAt).slice(0, 7),
          category: t.category || "기타",
          amount: t.amount,
          memo: t.description || "",
        })),
    [transactions]
  );

  const months = useMemo(() => {
    const txMonths = expenses.map((e) => e.month);
    const all = new Set([...txMonths, new Date().toISOString().slice(0, 7)]);
    return Array.from(all).sort().slice(-3);
  }, [expenses]);

  const paidList = useMemo(
    () =>
      members.map((m) => {
        const memberDues = duesList.filter((d) => d.memberId === m.userId);
        const unpaidDue = memberDues.find((d) => !d.paid);
        const paid = memberDues.some((d) => d.paid);
        return { userId: m.userId, paid, dueId: unpaidDue?.id ?? null };
      }),
    [members, duesList]
  );

  const totalCollected = paidList.filter((m) => m.paid).length * FEE;
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = totalCollected - totalSpent;
  const monthExpenses = expenses.filter((e) => e.month === selMonth);
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const monthTotals = months.map((m) => ({
    month: m,
    total: expenses.filter((e) => e.month === m).reduce((s, e) => s + e.amount, 0),
  }));
  const avgMonthly = months.length
    ? Math.round(monthTotals.reduce((s, m) => s + m.total, 0) / months.length)
    : 0;
  const recommendedFee = members.length ? Math.ceil(avgMonthly / members.length / 1000) * 1000 : 0;
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => { categoryTotals[e.category] = (categoryTotals[e.category] ?? 0) + e.amount; });
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const unpaidMembers = paidList.filter((m) => !m.paid).map((m) => m.userId);
  const aiComment =
    remaining < 0
      ? `⚠️ 잔액이 부족해요! ${Math.abs(remaining).toLocaleString()}원 초과 지출 상태예요.`
      : remaining < 50000
      ? `💡 잔액이 ${remaining.toLocaleString()}원으로 적어요. 다음 달 회비 수금을 서두르세요.`
      : `✅ 현재 잔액 ${remaining.toLocaleString()}원으로 안정적이에요. 미납 ${unpaidMembers.length}명 독촉을 권장해요.`;

  const togglePaid = async (member: { userId: string; paid: boolean; dueId: string | null }) => {
    if (!teamId || member.paid) return;
    try {
      if (member.dueId) {
        await manageFetch(`/finance/dues/${member.dueId}/pay`, { method: "PATCH" });
      } else {
        const due: Due = await manageFetch("/finance/dues", {
          method: "POST",
          body: JSON.stringify({ teamId, memberId: member.userId, amount: FEE }),
        });
        await manageFetch(`/finance/dues/${due.id}/pay`, { method: "PATCH" });
      }
      await loadDues(teamId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "처리 실패");
    }
  };

  const deleteExpense = async (id: string) => {
    if (!teamId || !confirm('이 지출 항목을 삭제하시겠습니까?')) return;
    try {
      await manageFetch(`/finance/transactions/${id}`, { method: 'DELETE' });
      setTransactions((p) => p.filter((t) => t.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  const deleteDue = async (dueId: string) => {
    if (!teamId || !confirm('이 회비 기록을 삭제하시겠습니까?')) return;
    try {
      await manageFetch(`/finance/dues/${dueId}`, { method: 'DELETE' });
      setDuesList((p) => p.filter((d) => d.id !== dueId));
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  const addExpense = async () => {
    if (!draft.category || !draft.amount || !teamId) return;
    try {
      const newTxn: Transaction = await manageFetch("/finance/transactions", {
        method: "POST",
        body: JSON.stringify({
          teamId,
          category: draft.category,
          amount: Number(draft.amount),
          description: draft.memo,
          type: "expense",
          date: `${selMonth}-01`,
        }),
      });
      setTransactions((p) => [...p, newTxn]);
      setDraft({ category: "", amount: "", memo: "" });
      setAdding(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "지출 추가 실패");
    }
  };

  return (
    <div className="relative">
      {!user && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center mb-6">
          <Wallet size={24} className="text-fuchsia-400 mx-auto mb-3" />
          <p className="text-white font-semibold mb-2">로그인하여 내 팀 재정을 관리하세요</p>
          <p className="text-gray-400 text-sm mb-4">로그인 후 실제 팀 데이터가 표시됩니다</p>
          <Link href="/login" className="inline-block px-6 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
            로그인
          </Link>
        </div>
      )}

      {user && loading && (
        <div className="flex justify-center items-center py-20">
          <div className="w-6 h-6 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {user && !loading && !teamId && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center mb-6">
          <Wallet size={24} className="text-fuchsia-400 mx-auto mb-3" />
          <p className="text-white font-semibold mb-2">팀에 가입하거나 팀을 만들어야 합니다</p>
          <Link href="/manage/team" className="inline-block px-6 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
            팀 관리하기
          </Link>
        </div>
      )}

      {(user && !loading && teamId) && (
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold text-white">스마트 팀 매니지먼트</h1>

          {/* AI 분석 */}
          <div className="bg-fuchsia-500/5 border border-fuchsia-500/20 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Bot size={15} className="text-fuchsia-400" />
              <span className="text-sm font-semibold text-gray-300">AI 분석</span>
              <span className="text-xs text-gray-500 ml-auto">{aiComment}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-xl p-4 space-y-1">
                <p className="text-xs text-gray-500">월 적정 회비 추정</p>
                <p className="text-fuchsia-400 text-xl font-bold">{recommendedFee.toLocaleString()}원</p>
                <p className="text-gray-500 text-xs">월 평균 지출 {avgMonthly.toLocaleString()}원 ÷ {members.length}명</p>
                <div className="mt-2 space-y-1">
                  {monthTotals.map(({ month, total }) => {
                    const maxTotal = Math.max(...monthTotals.map((m) => m.total), 1);
                    return (
                      <div key={month} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-8">{month.slice(5)}월</span>
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full">
                          <div className="h-1.5 rounded-full bg-fuchsia-500/60" style={{ width: `${Math.round((total / maxTotal) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-16 text-right">{total.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 space-y-1">
                <p className="text-xs text-gray-500">가장 많은 지출</p>
                <p className="text-fuchsia-400 text-xl font-bold">{topCategory?.[0] ?? "없음"}</p>
                <p className="text-gray-500 text-xs">전체 {topCategory?.[1].toLocaleString() ?? 0}원 지출</p>
                <div className="mt-2 space-y-1">
                  {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-14 truncate">{cat}</span>
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full">
                        <div className="h-1.5 rounded-full bg-fuchsia-500/60" style={{ width: `${topCategory ? Math.round((amt / topCategory[1]) * 100) : 0}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 w-16 text-right">{amt.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 space-y-1">
                <p className="text-xs text-gray-500">미납 멤버</p>
                <p className="text-fuchsia-400 text-xl font-bold">{unpaidMembers.length}명</p>
                <p className="text-gray-500 text-xs">미수금 {(unpaidMembers.length * FEE).toLocaleString()}원</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {unpaidMembers.length === 0
                    ? <span className="text-xs text-green-400">전원 납부 완료 ✅</span>
                    : unpaidMembers.map((uid) => (
                      <span key={uid} className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-mono">{uid.slice(0, 8)}…</span>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "총 수금액", value: totalCollected, color: "text-fuchsia-400" },
              { label: "총 지출액", value: totalSpent, color: "text-red-400" },
              { label: "현재 잔액", value: remaining, color: remaining >= 0 ? "text-green-400" : "text-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className={`text-xl font-bold ${color}`}>{value.toLocaleString()}원</p>
                <p className="text-gray-500 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 회비 납부 현황 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Wallet size={15} className="text-fuchsia-400" />
                <span className="text-sm font-semibold text-gray-300">회비 납부 현황</span>
                <span className="ml-auto text-xs text-gray-500">{FEE.toLocaleString()}원/인</span>
              </div>
              {paidList.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">팀 멤버가 없습니다</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {paidList.map((m) => (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between px-3 py-2 rounded-lg"
                      style={{
                        background: m.paid ? "rgba(192,38,211,0.1)" : "var(--chip-inactive-bg)",
                        border: `1px solid ${m.paid ? "rgba(192,38,211,0.3)" : "var(--chip-inactive-border)"}`,
                      }}
                    >
                      <button
                        onClick={() => togglePaid(m)}
                        disabled={m.paid}
                        className="flex-1 flex items-center justify-between transition-colors disabled:cursor-default"
                      >
                        <span className="text-sm text-white font-mono text-xs">{m.userId.slice(0, 10)}…</span>
                        <span className={`text-xs font-semibold ${m.paid ? "text-fuchsia-400" : "text-gray-600"}`}>
                          {m.paid ? "납부" : "미납"}
                        </span>
                      </button>
                      {isLeaderUser && m.dueId && (
                        <button onClick={() => deleteDue(m.dueId!)} className="ml-2 text-gray-600 hover:text-red-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 월별 지출 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingDown size={15} className="text-fuchsia-400" />
                <span className="text-sm font-semibold text-gray-300">월별 지출</span>
                <button onClick={() => setAdding(true)} className="ml-auto text-gray-500 hover:text-white transition-colors">
                  <Plus size={15} />
                </button>
              </div>

              <div className="flex gap-2">
                {months.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelMonth(m)}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                    style={
                      selMonth === m
                        ? { background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" }
                        : { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)" }
                    }
                  >
                    {m.slice(5)}월
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {monthExpenses.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-4">이 달의 지출 내역이 없습니다</p>
                ) : (
                  monthExpenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${categoryColors[e.category] ?? categoryColors["기타"]}`}>{e.category}</span>
                        <span className="text-gray-400 text-xs">{e.memo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-semibold">{e.amount.toLocaleString()}원</span>
                        {isLeaderUser && (
                          <button onClick={() => deleteExpense(e.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div className="flex justify-between pt-1 border-t border-white/10">
                  <span className="text-xs text-gray-500">합계</span>
                  <span className="text-sm font-bold text-red-400">{monthTotal.toLocaleString()}원</span>
                </div>
              </div>

              {adding && (
                <div className="space-y-2 border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">지출 추가</span>
                    <button onClick={() => setAdding(false)} className="text-gray-500 hover:text-white"><X size={13} /></button>
                  </div>
                  {[
                    { ph: "카테고리 (예: 구장 대여)", key: "category" },
                    { ph: "금액", key: "amount", type: "number" },
                    { ph: "메모", key: "memo" },
                  ].map(({ ph, key, type }) => (
                    <input
                      key={key}
                      type={type ?? "text"}
                      placeholder={ph}
                      value={draft[key as keyof typeof draft]}
                      onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-fuchsia-500/50 placeholder:text-gray-600"
                    />
                  ))}
                  <button onClick={addExpense} className="w-full py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>추가</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
