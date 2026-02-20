"use client";

import { useState } from "react";
import { Wallet, TrendingDown, Plus, X, Bot, BarChart2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

const members = [
  { name: "김민준", paid: true },
  { name: "이서준", paid: true },
  { name: "박지호", paid: false },
  { name: "최현우", paid: true },
  { name: "정도윤", paid: false },
  { name: "강시우", paid: true },
  { name: "윤준서", paid: true },
  { name: "임지훈", paid: false },
  { name: "한승민", paid: true },
  { name: "오태양", paid: true },
  { name: "신재원", paid: true },
  { name: "백승호", paid: false },
  { name: "류성민", paid: true },
];

const FEE = 30000;

type Expense = { id: number; month: string; category: string; amount: number; memo: string };

const initExpenses: Expense[] = [
  { id: 1, month: "2026-01", category: "구장 대여", amount: 120000, memo: "마포구민체육센터" },
  { id: 2, month: "2026-01", category: "유니폼",   amount: 85000,  memo: "동복 유니폼 제작" },
  { id: 3, month: "2026-02", category: "구장 대여", amount: 120000, memo: "탄천종합운동장" },
  { id: 4, month: "2026-02", category: "간식",      amount: 35000,  memo: "경기 후 간식" },
  { id: 5, month: "2026-03", category: "구장 대여", amount: 120000, memo: "잠실종합운동장" },
];

const months = ["2026-01", "2026-02", "2026-03"];
const categoryColors: Record<string, string> = {
  "구장 대여": "bg-blue-500/20 text-blue-400",
  "유니폼":   "bg-fuchsia-500/20 text-fuchsia-400",
  "간식":     "bg-yellow-500/20 text-yellow-400",
  "기타":     "bg-white/10 text-gray-400",
};

export default function FinancePage() {
  const { user } = useAuth();
  const [paidList, setPaidList] = useState(members.map(m => ({ ...m })));
  const [expenses, setExpenses] = useState(initExpenses);
  const [selMonth, setSelMonth] = useState("2026-03");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ category: "", amount: "", memo: "" });

  const totalCollected = paidList.filter(m => m.paid).length * FEE;
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = totalCollected - totalSpent;

  const monthExpenses = expenses.filter(e => e.month === selMonth);
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

  // AI 분석
  const monthTotals = months.map(m => ({ month: m, total: expenses.filter(e => e.month === m).reduce((s, e) => s + e.amount, 0) }));
  const avgMonthly = Math.round(monthTotals.reduce((s, m) => s + m.total, 0) / months.length);
  const recommendedFee = Math.ceil(avgMonthly / members.length / 1000) * 1000;

  const categoryTotals: Record<string, number> = {};
  expenses.forEach(e => { categoryTotals[e.category] = (categoryTotals[e.category] ?? 0) + e.amount; });
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  // 미납 이력 (paid=false인 멤버)
  const unpaidMembers = paidList.filter(m => !m.paid).map(m => m.name);

  const aiComment = remaining < 0
    ? `⚠️ 잔액이 부족해요! ${Math.abs(remaining).toLocaleString()}원 초과 지출 상태예요.`
    : remaining < 50000
    ? `💡 잔액이 ${remaining.toLocaleString()}원으로 적어요. 다음 달 회비 수금을 서두르세요.`
    : `✅ 현재 잔액 ${remaining.toLocaleString()}원으로 안정적이에요. 미납 ${paidList.filter(m => !m.paid).length}명 독촉을 권장해요.`;

  function addExpense() {
    if (!draft.category || !draft.amount) return;
    setExpenses(p => [...p, { id: Date.now(), month: selMonth, category: draft.category, amount: Number(draft.amount), memo: draft.memo }]);
    setDraft({ category: "", amount: "", memo: "" });
    setAdding(false);
  }

  return (
    <div className="relative">
      {!user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto bg-[#111] border border-white/10 rounded-2xl p-8 max-w-xs text-center space-y-4 shadow-2xl">
            <p className="text-white font-semibold">로그인이 필요합니다</p>
            <p className="text-gray-400 text-xs">로그인하고 팀 매니지먼트를 시작하세요</p>
            <Link href="/login" className="inline-block px-8 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
              로그인
            </Link>
          </div>
        </div>
      )}
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">스마트 팀 매니지먼트</h1>

      {/* AI 분석 */}
      <div className="bg-fuchsia-500/5 border border-fuchsia-500/20 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bot size={15} className="text-fuchsia-400" />
          <span className="text-sm font-semibold text-gray-300">AI 분석</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 월 적정 회비 */}
          <div className="bg-white/5 rounded-xl p-4 space-y-1">
            <p className="text-xs text-gray-500">월 적정 회비 추정</p>
            <p className="text-fuchsia-400 text-xl font-bold">{recommendedFee.toLocaleString()}원</p>
            <p className="text-gray-500 text-xs">월 평균 지출 {avgMonthly.toLocaleString()}월 ÷ {members.length}명</p>
            <div className="mt-2 space-y-1">
              {monthTotals.map(({ month, total }) => (
                <div key={month} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-8">{month.replace("2026-", "")}월</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full">
                    <div className="h-1.5 rounded-full bg-fuchsia-500/60" style={{ width: `${Math.round(total / Math.max(...monthTotals.map(m => m.total)) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-16 text-right">{total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 최다 지출 항목 */}
          <div className="bg-white/5 rounded-xl p-4 space-y-1">
            <p className="text-xs text-gray-500">가장 많은 지출</p>
            <p className="text-fuchsia-400 text-xl font-bold">{topCategory?.[0]}</p>
            <p className="text-gray-500 text-xs">전체 {topCategory?.[1].toLocaleString()}원 지출</p>
            <div className="mt-2 space-y-1">
              {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-14 truncate">{cat}</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full">
                    <div className="h-1.5 rounded-full bg-fuchsia-500/60" style={{ width: `${Math.round(amt / topCategory[1] * 100)}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-16 text-right">{amt.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 미납 멤버 */}
          <div className="bg-white/5 rounded-xl p-4 space-y-1">
            <p className="text-xs text-gray-500">미납 멤버</p>
            <p className="text-fuchsia-400 text-xl font-bold">{unpaidMembers.length}명</p>
            <p className="text-gray-500 text-xs">미수금 {(unpaidMembers.length * FEE).toLocaleString()}원</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {unpaidMembers.length === 0
                ? <span className="text-xs text-green-400">전원 납부 완료 ✅</span>
                : unpaidMembers.map(n => (
                  <span key={n} className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">{n}</span>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "총 수금액", value: totalCollected, color: "text-fuchsia-400" },
          { label: "총 지출액", value: totalSpent,     color: "text-red-400" },
          { label: "현재 잔액", value: remaining,       color: remaining >= 0 ? "text-green-400" : "text-red-400" },
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
          <div className="grid grid-cols-2 gap-2">
            {paidList.map((m, i) => (
              <button key={m.name} onClick={() => setPaidList(p => p.map((x, j) => j === i ? { ...x, paid: !x.paid } : x))}
                className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors"
                style={{ background: m.paid ? "rgba(192,38,211,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${m.paid ? "rgba(192,38,211,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                <span className="text-sm text-white">{m.name}</span>
                <span className={`text-xs font-semibold ${m.paid ? "text-fuchsia-400" : "text-gray-600"}`}>{m.paid ? "납부" : "미납"}</span>
              </button>
            ))}
          </div>
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

          {/* 월 탭 */}
          <div className="flex gap-2">
            {months.map(m => (
              <button key={m} onClick={() => setSelMonth(m)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                style={selMonth === m
                  ? { background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" }
                  : { background: "rgba(255,255,255,0.05)", color: "#9ca3af" }}>
                {m.replace("2026-", "")}월
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {monthExpenses.map(e => (
              <div key={e.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${categoryColors[e.category] ?? categoryColors["기타"]}`}>{e.category}</span>
                  <span className="text-gray-400 text-xs">{e.memo}</span>
                </div>
                <span className="text-white text-sm font-semibold">{e.amount.toLocaleString()}원</span>
              </div>
            ))}
            <div className="flex justify-between pt-1 border-t border-white/10">
              <span className="text-xs text-gray-500">합계</span>
              <span className="text-sm font-bold text-red-400">{monthTotal.toLocaleString()}원</span>
            </div>
          </div>

          {/* 지출 추가 */}
          {adding && (
            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">지출 추가</span>
                <button onClick={() => setAdding(false)} className="text-gray-500 hover:text-white"><X size={13} /></button>
              </div>
              {[
                { ph: "카테고리 (예: 구장 대여)", key: "category" },
                { ph: "금액",                    key: "amount", type: "number" },
                { ph: "메모",                    key: "memo" },
              ].map(({ ph, key, type }) => (
                <input key={key} type={type ?? "text"} placeholder={ph}
                  value={draft[key as keyof typeof draft]}
                  onChange={e => setDraft(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-fuchsia-500/50 placeholder:text-gray-600" />
              ))}
              <button onClick={addExpense} className="w-full py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>추가</button>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
