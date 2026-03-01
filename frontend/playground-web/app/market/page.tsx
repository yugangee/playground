"use client";

import { useState, useMemo } from "react";
import { ShoppingCart, HelpCircle, Search, X, SlidersHorizontal } from "lucide-react";

const sports = ["전체", "축구", "농구", "야구", "테니스", "수영", "기타"];
const categories = ["전체 카테고리", "축구화", "농구화", "야구화", "테니스화", "러닝화", "유니폼", "용품", "보호대", "가방", "스마트워치"];

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

const SELLERS = ["이건율", "박호현", "김민수", "이지현", "최상훈", "정다영", "박철민", "한승우", "오세훈", "강나래"];
const REGIONS = ["서울 강남", "서울 마포", "경기 수원", "서울 종로", "부산 해운대", "서울 영등포", "인천 연수"];

const products = [
  { id: 1,  name: "나이키 머큐리얼 슈퍼플라이 10",     category: "축구화",      price: 280000, grade: "A", emoji: "👟", sport: "축구",   seller: SELLERS[0], region: REGIONS[0], views: 142, likes: 12 },
  { id: 2,  name: "아디다스 프레데터 엘리트",           category: "축구화",      price: 195000, grade: "C", emoji: "👟", sport: "축구",   seller: SELLERS[1], region: REGIONS[1], views: 88,  likes: 7  },
  { id: 3,  name: "나이키 팬텀 GX 엘리트",             category: "축구화",      price: 230000, grade: "S", emoji: "👟", sport: "축구",   seller: SELLERS[2], region: REGIONS[2], views: 201, likes: 25 },
  { id: 4,  name: "퓨마 킹 플래티넘",                  category: "축구화",      price: 142000, grade: "C", emoji: "👟", sport: "축구",   seller: SELLERS[3], region: REGIONS[3], views: 55,  likes: 3  },
  { id: 5,  name: "나이키 티엠포 레전드 10",            category: "축구화",      price: 165000, grade: "B", emoji: "👟", sport: "축구",   seller: SELLERS[4], region: REGIONS[4], views: 73,  likes: 8  },
  { id: 6,  name: "손흥민 토트넘 홈 유니폼 23/24",      category: "유니폼",      price: 85000,  grade: "S", emoji: "👕", sport: "축구",   seller: SELLERS[5], region: REGIONS[0], views: 312, likes: 41 },
  { id: 7,  name: "FC 바르셀로나 어웨이 유니폼",        category: "유니폼",      price: 72000,  grade: "C", emoji: "👕", sport: "축구",   seller: SELLERS[6], region: REGIONS[1], views: 98,  likes: 9  },
  { id: 8,  name: "맨체스터 시티 홈 유니폼 24/25",      category: "유니폼",      price: 98000,  grade: "S", emoji: "👕", sport: "축구",   seller: SELLERS[7], region: REGIONS[5], views: 187, likes: 22 },
  { id: 9,  name: "레알 마드리드 써드 유니폼",          category: "유니폼",      price: 110000, grade: "S", emoji: "👕", sport: "축구",   seller: SELLERS[8], region: REGIONS[6], views: 256, likes: 33 },
  { id: 10, name: "아디다스 챔피언스리그 공식 볼",       category: "용품",        price: 55000,  grade: "A", emoji: "⚽", sport: "축구",   seller: SELLERS[9], region: REGIONS[2], views: 67,  likes: 5  },
  { id: 11, name: "나이키 스트라이크 프리미어",          category: "용품",        price: 42000,  grade: "B", emoji: "⚽", sport: "축구",   seller: SELLERS[0], region: REGIONS[3], views: 44,  likes: 2  },
  { id: 12, name: "신가드 프로 정강이 보호대",           category: "보호대",      price: 28000,  grade: "S", emoji: "🦺", sport: "축구",   seller: SELLERS[1], region: REGIONS[4], views: 38,  likes: 4  },
  { id: 13, name: "나이키 에어 줌 BB NXT",              category: "농구화",      price: 210000, grade: "A", emoji: "👟", sport: "농구",   seller: SELLERS[2], region: REGIONS[0], views: 133, likes: 18 },
  { id: 14, name: "아디다스 D.O.N. Issue 5",            category: "농구화",      price: 178000, grade: "C", emoji: "👟", sport: "농구",   seller: SELLERS[3], region: REGIONS[1], views: 79,  likes: 6  },
  { id: 15, name: "조던 36 로우",                       category: "농구화",      price: 245000, grade: "S", emoji: "👟", sport: "농구",   seller: SELLERS[4], region: REGIONS[5], views: 298, likes: 37 },
  { id: 16, name: "언더아머 커리 11",                   category: "농구화",      price: 195000, grade: "A", emoji: "👟", sport: "농구",   seller: SELLERS[5], region: REGIONS[2], views: 115, likes: 14 },
  { id: 17, name: "NBA 레이커스 저지 23/24",             category: "유니폼",      price: 92000,  grade: "S", emoji: "👕", sport: "농구",   seller: SELLERS[6], region: REGIONS[3], views: 221, likes: 28 },
  { id: 18, name: "NBA 골든스테이트 워리어스 저지",      category: "유니폼",      price: 88000,  grade: "B", emoji: "👕", sport: "농구",   seller: SELLERS[7], region: REGIONS[6], views: 102, likes: 11 },
  { id: 19, name: "스팔딩 NBA 공식 경기구",              category: "용품",        price: 65000,  grade: "A", emoji: "🏀", sport: "농구",   seller: SELLERS[8], region: REGIONS[0], views: 88,  likes: 9  },
  { id: 20, name: "윌슨 NBA 드라이브 농구공",            category: "용품",        price: 48000,  grade: "C", emoji: "🏀", sport: "농구",   seller: SELLERS[9], region: REGIONS[1], views: 52,  likes: 3  },
  { id: 21, name: "롤링스 프로 야구 글러브",             category: "용품",        price: 165000, grade: "B", emoji: "🧤", sport: "야구",   seller: SELLERS[2], region: REGIONS[5], views: 94,  likes: 10 },
  { id: 22, name: "미즈노 프로 포수 미트",               category: "용품",        price: 220000, grade: "A", emoji: "🧤", sport: "야구",   seller: SELLERS[3], region: REGIONS[6], views: 128, likes: 16 },
  { id: 23, name: "루이스빌 슬러거 메이플 배트",         category: "용품",        price: 135000, grade: "C", emoji: "🪵", sport: "야구",   seller: SELLERS[4], region: REGIONS[0], views: 71,  likes: 6  },
  { id: 24, name: "MLB 다저스 유니폼 오타니",            category: "유니폼",      price: 145000, grade: "S", emoji: "👕", sport: "야구",   seller: SELLERS[8], region: REGIONS[4], views: 267, likes: 35 },
  { id: 25, name: "MLB 양키스 홈 유니폼",               category: "유니폼",      price: 118000, grade: "A", emoji: "👕", sport: "야구",   seller: SELLERS[9], region: REGIONS[5], views: 154, likes: 19 },
  { id: 26, name: "윌슨 프로 스태프 97 테니스 라켓",     category: "용품",        price: 320000, grade: "A", emoji: "🎾", sport: "테니스", seller: SELLERS[3], region: REGIONS[3], views: 176, likes: 21 },
  { id: 27, name: "나이키 에어 줌 베이퍼 케이지 4",      category: "테니스화",    price: 155000, grade: "A", emoji: "👟", sport: "테니스", seller: SELLERS[8], region: REGIONS[1], views: 91,  likes: 10 },
  { id: 28, name: "아레나 수영 경기용 수트",             category: "용품",        price: 78000,  grade: "S", emoji: "🩱", sport: "수영",   seller: SELLERS[9], region: REGIONS[2], views: 67,  likes: 8  },
  { id: 29, name: "스피도 파스트스킨 LZR 레이서",        category: "용품",        price: 145000, grade: "A", emoji: "🩱", sport: "수영",   seller: SELLERS[0], region: REGIONS[3], views: 93,  likes: 11 },
  { id: 30, name: "가민 포러너 955 GPS 워치",            category: "스마트워치",  price: 420000, grade: "A", emoji: "⌚", sport: "기타",   seller: SELLERS[0], region: REGIONS[0], views: 199, likes: 24 },
  { id: 31, name: "폴라 밴티지 V2 스포츠 워치",          category: "스마트워치",  price: 380000, grade: "C", emoji: "⌚", sport: "기타",   seller: SELLERS[1], region: REGIONS[1], views: 144, likes: 17 },
  { id: 32, name: "나이키 스포츠 백팩 30L",              category: "가방",        price: 88000,  grade: "S", emoji: "🎒", sport: "기타",   seller: SELLERS[4], region: REGIONS[4], views: 108, likes: 12 },
  { id: 33, name: "아디다스 팀 더플백",                  category: "가방",        price: 72000,  grade: "B", emoji: "👜", sport: "기타",   seller: SELLERS[5], region: REGIONS[5], views: 73,  likes: 8  },
  { id: 34, name: "폼롤러 프로 근막이완 세트",           category: "용품",        price: 35000,  grade: "A", emoji: "🧘", sport: "기타",   seller: SELLERS[6], region: REGIONS[6], views: 55,  likes: 6  },
];

type SortOption = "latest" | "price_asc" | "price_desc" | "views";
interface SellForm { name: string; category: string; price: string; grade: string; sport: string; region: string; desc: string }
const EMPTY_FORM: SellForm = { name: "", category: categories[1], price: "", grade: "A", sport: "축구", region: REGIONS[0], desc: "" };

export default function MarketPage() {
  const [sport, setSport] = useState("전체");
  const [category, setCategory] = useState("전체 카테고리");
  const [search, setSearch] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sort, setSort] = useState<SortOption>("latest");
  const [tooltip, setTooltip] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [form, setForm] = useState<SellForm>(EMPTY_FORM);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<typeof products[0] | null>(null);

  const filtered = useMemo(() => {
    let list = [...products];
    if (sport !== "전체") list = list.filter(p => p.sport === sport);
    if (category !== "전체 카테고리") list = list.filter(p => p.category === category);
    if (search.trim()) list = list.filter(p => p.name.includes(search.trim()));
    if (priceMin) list = list.filter(p => p.price >= Number(priceMin));
    if (priceMax) list = list.filter(p => p.price <= Number(priceMax));
    if (sort === "price_asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "views") list.sort((a, b) => b.views - a.views);
    return list;
  }, [sport, category, search, priceMin, priceMax, sort]);

  const toggleLike = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const resetFilter = () => { setPriceMin(""); setPriceMax(""); setCategory("전체 카테고리"); setSort("latest"); };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">마켓</h1>
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
          <p className="text-gray-400 text-sm mt-1">스포츠 용품 중고거래 · {filtered.length}개 상품</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilter(v => !v)}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-colors ${showFilter ? "border-violet-500 text-violet-400 bg-violet-500/10" : "border-white/10 text-gray-400 hover:border-white/20"}`}>
            <SlidersHorizontal size={14} /> 필터
          </button>
          <button onClick={() => setShowSell(true)}
            className="flex items-center gap-2 font-semibold text-sm px-4 py-2 rounded-lg text-white"
            style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
            <ShoppingCart size={15} /> 판매하기
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="상품명 검색..."
          className="w-full rounded-xl bg-white/5 border border-white/10 pl-9 pr-9 py-2.5 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none" />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilter && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">카테고리</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none">
                {categories.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">정렬</label>
              <select value={sort} onChange={e => setSort(e.target.value as SortOption)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none">
                <option value="latest" className="bg-slate-900">최신순</option>
                <option value="views" className="bg-slate-900">조회수순</option>
                <option value="price_asc" className="bg-slate-900">가격 낮은순</option>
                <option value="price_desc" className="bg-slate-900">가격 높은순</option>
              </select>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1.5 block">최소 가격</label>
              <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="0원"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-violet-500 focus:outline-none" />
            </div>
            <span className="text-gray-600 pb-2.5">~</span>
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1.5 block">최대 가격</label>
              <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="무제한"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-violet-500 focus:outline-none" />
            </div>
            <button onClick={resetFilter} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-400 hover:bg-white/5">초기화</button>
          </div>
        </div>
      )}

      {/* Sport filter chips */}
      <div className="flex gap-2 flex-wrap">
        {sports.map(s => (
          <button key={s} onClick={() => setSport(s)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={sport === s
              ? { background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" }
              : { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)" }}>
            {s}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-500 text-sm">검색 결과가 없습니다</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filtered.map(product => (
            <div key={product.id} onClick={() => setSelected(product)}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors cursor-pointer group relative">
              <div className="aspect-square bg-white/5 flex items-center justify-center text-5xl group-hover:bg-white/10 transition-colors relative">
                {product.emoji}
                <button onClick={e => toggleLike(product.id, e)}
                  className="absolute top-2 right-2 text-base opacity-0 group-hover:opacity-100 transition-opacity">
                  {liked.has(product.id) ? "❤️" : "🤍"}
                </button>
              </div>
              <div className="p-3 space-y-1.5">
                <p className="text-xs text-gray-500">{product.category}</p>
                <p className="text-sm text-white font-medium leading-snug line-clamp-2">{product.name}</p>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-fuchsia-400 font-bold text-sm">{product.price.toLocaleString()}원</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${gradeStyle[product.grade]}`}>{product.grade}급</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>{product.seller}</span>
                  <span>·</span>
                  <span>👁 {product.views}</span>
                  <span>·</span>
                  <span>{liked.has(product.id) ? "❤️" : "🤍"} {product.likes + (liked.has(product.id) ? 1 : 0)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-[#1a1a2e] border border-white/10 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="aspect-video bg-white/5 flex items-center justify-center text-7xl">{selected.emoji}</div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-500">{selected.category} · {selected.sport}</p>
                <h3 className="text-lg font-bold text-white mt-1">{selected.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl font-bold text-fuchsia-400">{selected.price.toLocaleString()}원</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${gradeStyle[selected.grade]}`}>{selected.grade}급</span>
                </div>
              </div>
              <div className="rounded-xl bg-white/5 p-3 space-y-1.5 text-sm">
                {[
                  ["판매자", selected.seller],
                  ["거래 지역", selected.region],
                  ["조회수", `${selected.views}회`],
                  ["관심", `${selected.likes + (liked.has(selected.id) ? 1 : 0)}명`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-400">{k}</span>
                    <span className="text-white">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={e => toggleLike(selected.id, e)}
                  className="flex-shrink-0 rounded-xl border border-white/10 px-4 py-3 text-lg hover:bg-white/5">
                  {liked.has(selected.id) ? "❤️" : "🤍"}
                </button>
                <button className="flex-1 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 py-3 text-sm font-semibold text-white hover:opacity-90">
                  채팅으로 문의
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sell modal */}
      {showSell && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#1a1a2e] border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">판매 등록</h3>
              <button onClick={() => setShowSell(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="상품명"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value }))}
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none">
                  {sports.filter(s => s !== "전체").map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                </select>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none">
                  {categories.filter(c => c !== "전체 카테고리").map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="판매 가격 (원)"
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none" />
                <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none">
                  {grades.map(g => <option key={g.grade} value={g.grade} className="bg-slate-900">{g.grade}급 — {g.label}</option>)}
                </select>
              </div>
              <select value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none">
                {REGIONS.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
              </select>
              <textarea value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
                placeholder="상품 설명 (상태, 구매 시기, 착용 횟수 등)" rows={3}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none resize-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSell(false)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-gray-400 hover:bg-white/5">취소</button>
              <button
                onClick={() => { alert(`"${form.name}" 등록 완료! (데모)`); setShowSell(false); setForm(EMPTY_FORM); }}
                disabled={!form.name || !form.price}
                className="flex-1 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                등록하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
