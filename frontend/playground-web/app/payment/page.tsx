"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CreditCard, Check } from "lucide-react";
import { Suspense } from "react";

const cardBrands = ["신한", "KB국민", "현대", "롯데", "NH농협", "삼성", "하나", "우리"];

function PaymentForm() {
  const params = useSearchParams();
  const router = useRouter();
  const plan = params.get("plan") ?? "플러스";
  const price = plan === "프로" ? "₩19,900" : "₩9,900";

  const [form, setForm] = useState({ card: "", expiry: "", name: "", birth: "" });
  const [agreed, setAgreed] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  function formatCard(v: string) {
    return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  }

  function submit() {
    if (!form.card || !form.expiry || !form.name || !form.birth || !agreed) return;
    setDone(true);
  }

  const inputCls = "w-full bg-transparent border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-fuchsia-500/60 placeholder:text-gray-600";

  if (done) return (
    <div className="max-w-sm mx-auto pt-20 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
        <Check size={28} className="text-white" />
      </div>
      <h2 className="text-xl font-bold text-white">{plan} 플랜 결제 완료!</h2>
      <p className="text-gray-400 text-sm">이제 모든 기능을 이용할 수 있어요</p>
      <button onClick={() => router.push("/")} className="mt-2 px-8 py-2.5 rounded-full text-sm font-semibold text-white"
        style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>홈으로</button>
    </div>
  );

  return (
    <div className="max-w-sm mx-auto space-y-6 pt-8">
      {/* 플랜 요약 */}
      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-5 py-4">
        <div>
          <p className="text-xs text-gray-500">선택한 플랜</p>
          <p className="text-white font-bold text-lg mt-0.5">{plan}</p>
        </div>
        <p className="text-fuchsia-400 font-black text-xl">{price}<span className="text-gray-500 text-sm font-normal">/월</span></p>
      </div>

      <div>
        <h1 className="text-xl font-bold text-white mb-1">결제 정보를 업데이트해 주세요</h1>

        {/* 카드사 아이콘 */}
        <div className="flex gap-2 flex-wrap my-4">
          {cardBrands.map(b => (
            <span key={b} className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-400">{b}</span>
          ))}
        </div>

        <div className="space-y-3">
          <div className="relative">
            <input value={form.card} onChange={e => setForm(p => ({ ...p, card: formatCard(e.target.value) }))}
              placeholder="카드 번호" className={inputCls} maxLength={19} />
            <CreditCard size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600" />
          </div>
          <input value={form.expiry} onChange={set("expiry")} placeholder="유효기간 (MM/YYYY)" className={inputCls} />
          <input value={form.name}   onChange={set("name")}   placeholder="카드 소유자명"       className={inputCls} />
          <input value={form.birth}  onChange={set("birth")}  placeholder="생년월일 (YYYY/M/DD)" className={inputCls} />
        </div>

        <label className="flex items-start gap-2 mt-4 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 accent-fuchsia-500" />
          <span className="text-xs text-gray-500">본인의 개인 정보를 <span className="text-fuchsia-400">결제 서비스업체</span>에 제공함에 동의합니다.</span>
        </label>
      </div>

      <button onClick={submit} disabled={!form.card || !form.expiry || !form.name || !form.birth || !agreed}
        className="w-full py-3.5 rounded-xl font-bold text-white text-base disabled:opacity-40 transition-opacity hover:opacity-90"
        style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
        저장
      </button>
    </div>
  );
}

export default function PaymentPage() {
  return <Suspense><PaymentForm /></Suspense>;
}
