"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CreditCard, Check } from "lucide-react";
import { Suspense } from "react";

const cardBrands = ["신한", "KB국민", "현대", "롯데", "NH농협", "삼성", "하나", "우리"];

const plans = [
  {
    name: "베이직",
    price: "₩1,000",
    description: "개인 사용자를 위한 기본 플랜",
    features: ["팀 가입 및 검색", "경기 일정 확인", "기본 통계 확인", "커뮤니티 이용"]
  },
  {
    name: "플러스",
    price: "₩9,900",
    description: "팀 운영자를 위한 추천 플랜",
    features: ["베이직 모든 기능", "팀 생성 및 관리", "경기 매칭 시스템", "상세 통계 분석", "회비 관리"]
  },
  {
    name: "프로",
    price: "₩19,900",
    description: "프로 팀을 위한 프리미엄 플랜",
    features: ["플러스 모든 기능", "AI 전술 분석", "영상 분석 리포트", "리그 운영 기능", "우선 고객 지원"]
  }
];

function PaymentForm() {
  const params = useSearchParams();
  const router = useRouter();
  const initialPlan = params.get("plan") ?? "플러스";
  
  const [selectedPlan, setSelectedPlan] = useState(initialPlan);
  const selectedPlanData = plans.find(p => p.name === selectedPlan) || plans[1];
  const price = selectedPlanData.price;

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

  const inputCls = "w-full bg-transparent border rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-white/40 placeholder:text-gray-600" + " border-white/10";

  if (done) return (
    <div className="max-w-sm mx-auto pt-20 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#ffffff" }}>
        <Check size={28} style={{ color: "#000000" }} />
      </div>
      <h2 className="text-xl font-bold text-white">{selectedPlan} 플랜 결제 완료!</h2>
      <p className="text-gray-400 text-sm">이제 모든 기능을 이용할 수 있어요</p>
      <button onClick={() => router.push("/")} className="mt-2 px-8 py-2.5 rounded-full text-sm font-semibold"
        style={{ background: "#ffffff", color: "#000000" }}>홈으로</button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 요금제 선택 섹션 */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-white text-center mb-2">요금제 선택</h1>
        <p className="text-gray-400 text-center text-sm mb-8">나에게 맞는 플랜을 선택하세요</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              onClick={() => setSelectedPlan(plan.name)}
              className={`relative rounded-xl p-6 cursor-pointer transition-all border ${
                selectedPlan === plan.name 
                  ? "border-white bg-white/5" 
                  : "border-white/10 hover:border-white/30"
              }`}
              style={{ background: selectedPlan === plan.name ? "rgba(255,255,255,0.05)" : "transparent" }}
            >
              {plan.name === "플러스" && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold rounded-full" style={{ background: "#ffffff", color: "#000000" }}>
                  추천
                </span>
              )}
              <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
              <p className="text-2xl font-black text-white mb-1">
                {plan.price}<span className="text-sm font-normal text-gray-400">/월</span>
              </p>
              <p className="text-xs text-gray-400 mb-4">{plan.description}</p>
              <ul className="space-y-2">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                    <Check size={14} className="text-white" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* 결제 폼 */}
      <div className="max-w-sm mx-auto space-y-6">
        {/* 플랜 요약 */}
        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-5 py-4">
          <div>
            <p className="text-xs text-gray-500">선택한 플랜</p>
            <p className="text-white font-bold text-lg mt-0.5">{selectedPlan}</p>
          </div>
          <p className="text-white font-black text-xl">{price}<span className="text-gray-500 text-sm font-normal">/월</span></p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-1">결제 정보를 입력해 주세요</h2>

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
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 accent-white" />
            <span className="text-xs text-gray-500">본인의 개인 정보를 <span className="text-white">결제 서비스업체</span>에 제공함에 동의합니다.</span>
          </label>
        </div>

        <button onClick={submit} disabled={!form.card || !form.expiry || !form.name || !form.birth || !agreed}
          className="w-full py-3.5 rounded-xl font-bold text-base disabled:opacity-40 transition-opacity hover:opacity-90 border"
          style={{ background: "#000000", color: "#ffffff", borderColor: "rgba(255,255,255,0.3)" }}>
          결제하기
        </button>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return <Suspense><PaymentForm /></Suspense>;
}
