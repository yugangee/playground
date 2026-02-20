"use client";

import { useState } from "react";
import { ShoppingCart, HelpCircle } from "lucide-react";

const sports = ["전체", "축구", "농구", "야구", "테니스", "수영", "기타"];

const grades = [
  { grade: "S", label: "신품급", tip: "택이 포함된 새 상품이거나 시착만 해본 미사용 제품" },
  { grade: "A", label: "최상급", tip: "1회 착용 후 세탁 완료, 오염이나 늘어남이 전혀 없는 상태" },
  { grade: "B", label: "상급",   tip: "2-3회 착용, 미세한 사용감은 있으나 외관상 아주 깨끗함" },
  { grade: "C", label: "일반급", tip: "4회 이상 착용, 생활 보풀이나 자연스러운 사용감이 있는 상태" },
];

const gradeStyle: Record<string, string> = {
  S: "bg-fuchsia-500/10 text-fuchsia-400",
  A: "bg-sky-400/10 text-sky-400",
  B: "bg-emerald-400/10 text-emerald-400",
  C: "bg-white/10 text-gray-400",
};

const products = [
  { id: 1,  name: "나이키 머큐리얼 슈퍼플라이 10",     category: "축구화",   price: 280000, grade: "A", emoji: "👟", sport: "축구" },
  { id: 2,  name: "아디다스 프레데터 엘리트",           category: "축구화",   price: 195000, grade: "C", emoji: "👟", sport: "축구" },
  { id: 3,  name: "나이키 팬텀 GX 엘리트",             category: "축구화",   price: 230000, grade: "S", emoji: "👟", sport: "축구" },
  { id: 4,  name: "퓨마 킹 플래티넘",                  category: "축구화",   price: 142000, grade: "C", emoji: "👟", sport: "축구" },
  { id: 5,  name: "나이키 티엠포 레전드 10",            category: "축구화",   price: 165000, grade: "B", emoji: "👟", sport: "축구" },
  { id: 6,  name: "손흥민 토트넘 홈 유니폼 23/24",      category: "유니폼",   price: 85000,  grade: "S", emoji: "👕", sport: "축구" },
  { id: 7,  name: "FC 바르셀로나 어웨이 유니폼",        category: "유니폼",   price: 72000,  grade: "C", emoji: "👕", sport: "축구" },
  { id: 8,  name: "맨체스터 시티 홈 유니폼 24/25",      category: "유니폼",   price: 98000,  grade: "S", emoji: "👕", sport: "축구" },
  { id: 9,  name: "레알 마드리드 써드 유니폼",          category: "유니폼",   price: 110000, grade: "S", emoji: "👕", sport: "축구" },
  { id: 10, name: "아디다스 챔피언스리그 공식 볼",       category: "축구공",   price: 55000,  grade: "A", emoji: "⚽", sport: "축구" },
  { id: 11, name: "나이키 스트라이크 프리미어",          category: "축구공",   price: 42000,  grade: "B", emoji: "⚽", sport: "축구" },
  { id: 12, name: "신가드 프로 정강이 보호대",           category: "보호대",   price: 28000,  grade: "S", emoji: "🦺", sport: "축구" },
  { id: 13, name: "나이키 에어 줌 BB NXT",              category: "농구화",   price: 210000, grade: "A", emoji: "👟", sport: "농구" },
  { id: 14, name: "아디다스 D.O.N. Issue 5",            category: "농구화",   price: 178000, grade: "C", emoji: "👟", sport: "농구" },
  { id: 15, name: "조던 36 로우",                       category: "농구화",   price: 245000, grade: "S", emoji: "👟", sport: "농구" },
  { id: 16, name: "언더아머 커리 11",                   category: "농구화",   price: 195000, grade: "A", emoji: "👟", sport: "농구" },
  { id: 17, name: "NBA 레이커스 저지 23/24",             category: "유니폼",   price: 92000,  grade: "S", emoji: "👕", sport: "농구" },
  { id: 18, name: "NBA 골든스테이트 워리어스 저지",      category: "유니폼",   price: 88000,  grade: "B", emoji: "👕", sport: "농구" },
  { id: 19, name: "스팔딩 NBA 공식 경기구",              category: "농구공",   price: 65000,  grade: "A", emoji: "🏀", sport: "농구" },
  { id: 20, name: "윌슨 NBA 드라이브 농구공",            category: "농구공",   price: 48000,  grade: "C", emoji: "🏀", sport: "농구" },
  { id: 21, name: "나이키 엘리트 농구 양말 세트",        category: "용품",     price: 18000,  grade: "S", emoji: "🧦", sport: "농구" },
  { id: 22, name: "맥데이비드 농구 무릎 보호대",         category: "보호대",   price: 35000,  grade: "A", emoji: "🦺", sport: "농구" },
  { id: 23, name: "롤링스 프로 야구 글러브",             category: "글러브",   price: 165000, grade: "B", emoji: "🧤", sport: "야구" },
  { id: 24, name: "미즈노 프로 포수 미트",               category: "글러브",   price: 220000, grade: "A", emoji: "🧤", sport: "야구" },
  { id: 25, name: "루이스빌 슬러거 메이플 배트",         category: "배트",     price: 135000, grade: "C", emoji: "🪵", sport: "야구" },
  { id: 26, name: "이스턴 알파 360 알루미늄 배트",       category: "배트",     price: 98000,  grade: "S", emoji: "🪵", sport: "야구" },
  { id: 27, name: "나이키 후버 엘리트 야구화",           category: "야구화",   price: 125000, grade: "A", emoji: "👟", sport: "야구" },
  { id: 28, name: "아디다스 이코 클리트 야구화",         category: "야구화",   price: 89000,  grade: "C", emoji: "👟", sport: "야구" },
  { id: 29, name: "MLB 다저스 유니폼 오타니",            category: "유니폼",   price: 145000, grade: "S", emoji: "👕", sport: "야구" },
  { id: 30, name: "MLB 양키스 홈 유니폼",               category: "유니폼",   price: 118000, grade: "A", emoji: "👕", sport: "야구" },
  { id: 31, name: "롤링스 공식 경기 야구공 12개",        category: "야구공",   price: 55000,  grade: "S", emoji: "⚾", sport: "야구" },
  { id: 32, name: "이스턴 배팅 헬멧",                   category: "헬멧",     price: 62000,  grade: "B", emoji: "⛑️", sport: "야구" },
  { id: 33, name: "윌슨 프로 스태프 97 테니스 라켓",     category: "라켓",     price: 320000, grade: "A", emoji: "🎾", sport: "테니스" },
  { id: 34, name: "바볼랏 퓨어 에어로 라켓",             category: "라켓",     price: 285000, grade: "B", emoji: "🎾", sport: "테니스" },
  { id: 35, name: "헤드 스피드 MP 라켓",                category: "라켓",     price: 265000, grade: "S", emoji: "🎾", sport: "테니스" },
  { id: 36, name: "나이키 에어 줌 베이퍼 케이지 4",      category: "테니스화", price: 155000, grade: "A", emoji: "👟", sport: "테니스" },
  { id: 37, name: "아디다스 솔매치 테니스화",            category: "테니스화", price: 128000, grade: "C", emoji: "👟", sport: "테니스" },
  { id: 38, name: "윌슨 US오픈 테니스공 4개입",          category: "테니스공", price: 22000,  grade: "S", emoji: "🎾", sport: "테니스" },
  { id: 39, name: "나이키 코트 드라이핏 테니스 셔츠",    category: "유니폼",   price: 58000,  grade: "A", emoji: "👕", sport: "테니스" },
  { id: 40, name: "바볼랏 퓨어 스트라이크 테니스백",     category: "가방",     price: 95000,  grade: "B", emoji: "🎒", sport: "테니스" },
  { id: 41, name: "아레나 수영 경기용 수트",             category: "수영복",   price: 78000,  grade: "S", emoji: "🩱", sport: "수영" },
  { id: 42, name: "스피도 파스트스킨 LZR 레이서",        category: "수영복",   price: 145000, grade: "A", emoji: "🩱", sport: "수영" },
  { id: 43, name: "TYR 티탄 수영복",                    category: "수영복",   price: 92000,  grade: "B", emoji: "🩱", sport: "수영" },
  { id: 44, name: "스피도 퓨처 바이오퓨즈 수경",         category: "수경",     price: 45000,  grade: "S", emoji: "🥽", sport: "수영" },
  { id: 45, name: "아레나 코브라 울트라 수경",           category: "수경",     price: 38000,  grade: "A", emoji: "🥽", sport: "수영" },
  { id: 46, name: "스피도 실리콘 수영 모자",             category: "수영모",   price: 15000,  grade: "S", emoji: "🏊", sport: "수영" },
  { id: 47, name: "아레나 카본 에어 수영 핀",            category: "훈련용품", price: 68000,  grade: "C", emoji: "🏊", sport: "수영" },
  { id: 48, name: "풀부이 킥보드 세트",                  category: "훈련용품", price: 32000,  grade: "B", emoji: "🏊", sport: "수영" },
  { id: 49, name: "나이키 줌 페가수스 40 러닝화",        category: "러닝화",   price: 148000, grade: "A", emoji: "👟", sport: "기타" },
  { id: 50, name: "아디다스 울트라부스트 23",            category: "러닝화",   price: 185000, grade: "B", emoji: "👟", sport: "기타" },
  { id: 51, name: "가민 포러너 955 GPS 워치",            category: "스마트워치", price: 420000, grade: "A", emoji: "⌚", sport: "기타" },
  { id: 52, name: "폴라 밴티지 V2 스포츠 워치",          category: "스마트워치", price: 380000, grade: "C", emoji: "⌚", sport: "기타" },
  { id: 53, name: "나이키 드라이핏 트레이닝 반바지",     category: "의류",     price: 42000,  grade: "S", emoji: "🩳", sport: "기타" },
  { id: 54, name: "언더아머 히트기어 압박 레깅스",       category: "의류",     price: 65000,  grade: "A", emoji: "👖", sport: "기타" },
  { id: 55, name: "나이키 스포츠 백팩 30L",              category: "가방",     price: 88000,  grade: "S", emoji: "🎒", sport: "기타" },
  { id: 56, name: "아디다스 팀 더플백",                  category: "가방",     price: 72000,  grade: "B", emoji: "👜", sport: "기타" },
  { id: 57, name: "폼롤러 프로 근막이완 세트",           category: "회복용품", price: 35000,  grade: "A", emoji: "🧘", sport: "기타" },
  { id: 58, name: "테이핑 테이프 스포츠용 10롤",         category: "회복용품", price: 18000,  grade: "S", emoji: "🩹", sport: "기타" },
  { id: 59, name: "나이키 프로 엘보우 슬리브",           category: "보호대",   price: 28000,  grade: "B", emoji: "🦺", sport: "기타" },
  { id: 60, name: "맥데이비드 앵클 브레이스",            category: "보호대",   price: 45000,  grade: "C", emoji: "🦺", sport: "기타" },
];

export default function MarketPage() {
  const [sport, setSport] = useState("전체");
  const [tooltip, setTooltip] = useState(false);

  const filtered = sport === "전체" ? products : products.filter((p) => p.sport === sport);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">마켓</h1>
            {/* 물음표 툴팁 */}
            <div className="relative" onMouseEnter={() => setTooltip(true)} onMouseLeave={() => setTooltip(false)}>
              <HelpCircle size={16} className="text-gray-500 hover:text-gray-300 cursor-pointer transition-colors" />
              {tooltip && (
                <div className="absolute left-6 top-0 z-50 w-72 bg-[#1e1e1e] border border-white/10 rounded-xl p-4 shadow-xl">
                  <p className="text-xs font-semibold text-gray-400 mb-3">등급 안내</p>
                  <div className="space-y-2.5">
                    {grades.map(({ grade, label, tip }) => (
                      <div key={grade} className="flex gap-2.5">
                        <span className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${gradeStyle[grade]}`}>{grade}급</span>
                        <div>
                          <span className="text-xs font-medium text-white">{label}</span>
                          <p className="text-xs text-gray-500 mt-0.5">{tip}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-1">스포츠 용품 중고거래</p>
        </div>
        <button
          className="flex items-center gap-2 font-semibold text-sm px-4 py-2 rounded-lg text-white"
          style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}
        >
          <ShoppingCart size={15} /> 판매하기
        </button>
      </div>

      {/* 종목 필터 */}
      <div className="flex gap-2 flex-wrap">
        {sports.map((s) => (
          <button
            key={s}
            onClick={() => setSport(s)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={sport === s
              ? { background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" }
              : { background: "rgba(255,255,255,0.05)", color: "#9ca3af" }
            }
          >
            {s}
          </button>
        ))}
      </div>

      {/* 상품 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {filtered.map(({ id, name, category, price, grade, emoji }) => (
          <div
            key={id}
            className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors cursor-pointer group"
          >
            <div className="aspect-square bg-white/5 flex items-center justify-center text-5xl group-hover:bg-white/10 transition-colors">
              {emoji}
            </div>
            <div className="p-3 space-y-1.5">
              <p className="text-xs text-gray-500">{category}</p>
              <p className="text-sm text-white font-medium leading-snug line-clamp-2">{name}</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-fuchsia-400 font-bold text-sm">{price.toLocaleString()}원</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${gradeStyle[grade]}`}>{grade}급</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
