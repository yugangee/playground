"use client";

import { useState, useMemo } from "react";
import { Search, X, HelpCircle } from "lucide-react";

interface GroupBuy {
  id: number; title: string; sport: string; category: string;
  targetPrice: number; unitPrice: number; minQty: number; currentQty: number; maxQty: number;
  organizer: string; deadline: string; emoji: string; description: string; joined: boolean;
}

const GROUP_BUYS: GroupBuy[] = [
  { id: 1, emoji: "👟", sport: "축구", category: "축구화", title: "나이키 팬텀 GX 엘리트 FG 팀 공동구매", targetPrice: 180000, unitPrice: 220000, minQty: 10, currentQty: 7, maxQty: 15, organizer: "박호현", deadline: "2026-03-15", description: "나이키 팬텀 GX 엘리트 FG 축구화 팀 공동구매입니다.", joined: false },
  { id: 2, emoji: "👕", sport: "축구", category: "유니폼", title: "서경 어벤져스 2026 시즌 유니폼 공동주문", targetPrice: 55000, unitPrice: 75000, minQty: 15, currentQty: 15, maxQty: 20, organizer: "이건율", deadline: "2026-03-08", description: "2026 시즌 서경 어벤져스 팀 유니폼 공동주문.", joined: true },
  { id: 3, emoji: "⚽", sport: "축구", category: "용품", title: "아디다스 챔피언스리그 공식 볼 10개 공구", targetPrice: 48000, unitPrice: 65000, minQty: 10, currentQty: 4, maxQty: 10, organizer: "김민수", deadline: "2026-03-20", description: "아디다스 UCL 공식 경기구 공동구매.", joined: false },
  { id: 4, emoji: "🏀", sport: "농구", category: "용품", title: "스팔딩 NBA 공식구 팀 공동구매", targetPrice: 58000, unitPrice: 78000, minQty: 6, currentQty: 6, maxQty: 8, organizer: "최상훈", deadline: "2026-03-10", description: "스팔딩 NBA 공식 경기구 6개 공동구매.", joined: false },
  { id: 5, emoji: "🧤", sport: "야구", category: "용품", title: "롤링스 야구 글러브 팀 공동구매", targetPrice: 140000, unitPrice: 185000, minQty: 8, currentQty: 3, maxQty: 12, organizer: "정다영", deadline: "2026-04-01", description: "롤링스 프로 시리즈 야구 글러브 공동구매.", joined: false },
];

const sports = ["전체", "축구", "농구", "야구", "테니스", "수영", "기타"];
const categories = ["전체 카테고리", "축구화", "농구화", "유니폼", "용품", "보호대", "가방", "스마트워치"];
const grades = [
  { grade: "S", label: "신품급", tip: "택이 포함된 새 상품" },
  { grade: "A", label: "최상급", tip: "1회 착용, 오염 없음" },
  { grade: "B", label: "상급", tip: "2-3회 착용, 깨끗함" },
  { grade: "C", label: "일반급", tip: "4회 이상 착용" },
];
const SELLERS = ["이건율", "박호현", "김민수", "이지현", "최상훈", "정다영", "박철민", "한승우", "오세훈", "강나래"];
const REGIONS = ["서울 강남", "서울 마포", "경기 수원", "서울 종로", "부산 해운대", "서울 영등포", "인천 연수"];

interface Product {
  id: number; name: string; category: string; price: number; grade: string;
  emoji: string; sport: string; seller: string; region: string; views: number; likes: number;
}

const products: Product[] = [
  { id: 1, name: "나이키 머큐리얼 슈퍼플라이 10", category: "축구화", price: 280000, grade: "A", emoji: "👟", sport: "축구", seller: SELLERS[0], region: REGIONS[0], views: 142, likes: 12 },
  { id: 2, name: "아디다스 프레데터 엘리트", category: "축구화", price: 195000, grade: "C", emoji: "👟", sport: "축구", seller: SELLERS[1], region: REGIONS[1], views: 88, likes: 7 },
  { id: 3, name: "나이키 팬텀 GX 엘리트", category: "축구화", price: 230000, grade: "S", emoji: "👟", sport: "축구", seller: SELLERS[2], region: REGIONS[2], views: 201, likes: 25 },
  { id: 4, name: "퓨마 킹 플래티넘", category: "축구화", price: 142000, grade: "C", emoji: "👟", sport: "축구", seller: SELLERS[3], region: REGIONS[3], views: 55, likes: 3 },
  { id: 5, name: "손흥민 토트넘 홈 유니폼 23/24", category: "유니폼", price: 85000, grade: "S", emoji: "👕", sport: "축구", seller: SELLERS[4], region: REGIONS[0], views: 312, likes: 41 },
  { id: 6, name: "맨체스터 시티 홈 유니폼 24/25", category: "유니폼", price: 98000, grade: "S", emoji: "👕", sport: "축구", seller: SELLERS[5], region: REGIONS[5], views: 187, likes: 22 },
  { id: 7, name: "아디다스 챔피언스리그 공식 볼", category: "용품", price: 55000, grade: "A", emoji: "⚽", sport: "축구", seller: SELLERS[6], region: REGIONS[2], views: 67, likes: 5 },
  { id: 8, name: "나이키 에어 줌 BB NXT", category: "농구화", price: 210000, grade: "A", emoji: "👟", sport: "농구", seller: SELLERS[7], region: REGIONS[0], views: 133, likes: 18 },
  { id: 9, name: "조던 36 로우", category: "농구화", price: 245000, grade: "S", emoji: "👟", sport: "농구", seller: SELLERS[8], region: REGIONS[5], views: 298, likes: 37 },
  { id: 10, name: "NBA 레이커스 저지 23/24", category: "유니폼", price: 92000, grade: "S", emoji: "👕", sport: "농구", seller: SELLERS[9], region: REGIONS[3], views: 221, likes: 28 },
  { id: 11, name: "스팔딩 NBA 공식 경기구", category: "용품", price: 65000, grade: "A", emoji: "🏀", sport: "농구", seller: SELLERS[0], region: REGIONS[0], views: 88, likes: 9 },
  { id: 12, name: "롤링스 프로 야구 글러브", category: "용품", price: 165000, grade: "B", emoji: "🧤", sport: "야구", seller: SELLERS[1], region: REGIONS[5], views: 94, likes: 10 },
  { id: 13, name: "MLB 다저스 유니폼 오타니", category: "유니폼", price: 145000, grade: "S", emoji: "👕", sport: "야구", seller: SELLERS[2], region: REGIONS[4], views: 267, likes: 35 },
  { id: 14, name: "윌슨 프로 스태프 97 테니스 라켓", category: "용품", price: 320000, grade: "A", emoji: "🎾", sport: "테니스", seller: SELLERS[3], region: REGIONS[3], views: 176, likes: 21 },
  { id: 15, name: "가민 포러너 955 GPS 워치", category: "스마트워치", price: 420000, grade: "A", emoji: "⌚", sport: "기타", seller: SELLERS[4], region: REGIONS[0], views: 199, likes: 24 },
  { id: 16, name: "나이키 스포츠 백팩 30L", category: "가방", price: 88000, grade: "S", emoji: "🎒", sport: "기타", seller: SELLERS[5], region: REGIONS[4], views: 108, likes: 12 },
];

type SortOption = "latest" | "price_asc" | "price_desc" | "views";
type MarketTab = "trade" | "group";
type PayMethod = "card" | "kakao" | "toss" | "naver";
interface PayItem { type: "trade" | "group"; id: number; name: string; price: number; emoji: string; }
interface SellForm { name: string; category: string; price: string; grade: string; sport: string; region: string; }
const EMPTY_FORM: SellForm = { name: "", category: categories[1], price: "", grade: "A", sport: "축구", region: REGIONS[0] };

export default function MarketPage() {
  const [tab, setTab] = useState<MarketTab>("trade");
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
  const [selected, setSelected] = useState<Product | null>(null);
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>(GROUP_BUYS);
  const [selectedGroup, setSelectedGroup] = useState<GroupBuy | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupForm, setGroupForm] = useState({ title: "", sport: "축구", category: categories[1], targetPrice: "", unitPrice: "", minQty: "", deadline: "", description: "" });
  const [payingItem, setPayingItem] = useState<PayItem | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("card");
  const [payForm, setPayForm] = useState({ card: "", expiry: "", name: "" });
  const [payDone, setPayDone] = useState(false);
  const [extraProducts, setExtraProducts] = useState<Product[]>([]);

  const filtered = useMemo(() => {
    let list = [...products, ...extraProducts];
    if (sport !== "전체") list = list.filter(p => p.sport === sport);
    if (category !== "전체 카테고리") list = list.filter(p => p.category === category);
    if (search.trim()) list = list.filter(p => p.name.includes(search.trim()));
    if (priceMin) list = list.filter(p => p.price >= Number(priceMin));
    if (priceMax) list = list.filter(p => p.price <= Number(priceMax));
    if (sort === "price_asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "views") list.sort((a, b) => b.views - a.views);
    return list;
  }, [sport, category, search, priceMin, priceMax, sort, extraProducts]);

  const gbFiltered = useMemo(() => sport === "전체" ? groupBuys : groupBuys.filter(g => g.sport === sport), [groupBuys, sport]);

  const toggleLike = (id: number, e: React.MouseEvent) => { e.stopPropagation(); setLiked(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; }); };
  const joinGroup = (id: number) => {
    setGroupBuys(prev => prev.map(g => g.id === id ? { ...g, joined: !g.joined, currentQty: g.joined ? g.currentQty - 1 : g.currentQty + 1 } : g));
    setSelectedGroup(prev => prev?.id === id ? { ...prev, joined: !prev.joined, currentQty: prev.joined ? prev.currentQty - 1 : prev.currentQty + 1 } : prev);
  };
  const startPurchase = (item: PayItem) => { setPayingItem(item); setPayMethod("card"); setPayForm({ card: "", expiry: "", name: "" }); setPayDone(false); };
  const confirmPay = () => { if (!payingItem) return; setPayDone(true); if (payingItem.type === "group") joinGroup(payingItem.id); else setSelected(null); };
  const closePay = () => { setPayingItem(null); setPayDone(false); };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Header */}
        <header className="space-y-1">
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium tracking-[0.2em] text-[#737373] uppercase">Market</p>
            <div className="relative" onMouseEnter={() => setTooltip(true)} onMouseLeave={() => setTooltip(false)}>
              <HelpCircle size={12} className="text-[#737373] hover:text-white cursor-pointer transition-colors" />
              {tooltip && (
                <div className="absolute left-5 top-0 z-50 w-56 bg-[#1E1E1E] border border-white/[0.08] rounded-lg p-4">
                  <p className="text-[10px] font-medium tracking-wider text-[#737373] uppercase mb-3">등급 안내</p>
                  <div className="space-y-2">
                    {grades.map(({ grade, label, tip }) => (
                      <div key={grade} className="flex gap-2">
                        <span className="text-[10px] font-medium text-white w-5">{grade}</span>
                        <span className="text-[10px] text-[#737373]">{label} - {tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-white">마켓</h1>
        </header>

        {/* Tab */}
        <div className="flex gap-8 border-b border-white/[0.08]">
          {(["trade", "group"] as MarketTab[]).map(key => (
            <button key={key} onClick={() => setTab(key)}
              className={`pb-3 text-sm font-medium transition-colors relative ${tab === key ? "text-white" : "text-[#737373] hover:text-white"}`}>
              {key === "trade" ? "개인거래" : "공동구매"}
              {tab === key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            {sports.map(s => (
              <button key={s} onClick={() => setSport(s)}
                className={`text-xs font-medium transition-colors ${sport === s ? "text-white" : "text-[#737373] hover:text-white"}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            {tab === "trade" && (
              <button onClick={() => setShowFilter(v => !v)}
                className={`text-xs font-medium transition-colors ${showFilter ? "text-white" : "text-[#737373] hover:text-white"}`}>
                필터
              </button>
            )}
            <button onClick={() => tab === "trade" ? setShowSell(true) : setShowGroupForm(true)}
              className="px-4 py-2 bg-white text-black text-xs font-medium rounded-full hover:bg-white/90 transition-colors">
              {tab === "trade" ? "판매하기" : "공구 개설"}
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        {tab === "trade" && (
          <div className="space-y-4">
            <div className="relative">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#737373]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="상품명 검색"
                className="w-full bg-[#1E1E1E] border border-white/[0.08] rounded-full pl-10 pr-10 py-3 text-sm text-white placeholder-[#737373] focus:outline-none focus:border-white/20" />
              {search && <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#737373] hover:text-white"><X size={14} /></button>}
            </div>
            {showFilter && (
              <div className="grid grid-cols-4 gap-4">
                <select value={category} onChange={e => setCategory(e.target.value)} className="bg-[#1E1E1E] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none">
                  {categories.map(c => <option key={c} value={c} className="bg-[#1E1E1E]">{c}</option>)}
                </select>
                <select value={sort} onChange={e => setSort(e.target.value as SortOption)} className="bg-[#1E1E1E] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none">
                  <option value="latest" className="bg-[#1E1E1E]">최신순</option>
                  <option value="views" className="bg-[#1E1E1E]">조회수순</option>
                  <option value="price_asc" className="bg-[#1E1E1E]">가격 낮은순</option>
                  <option value="price_desc" className="bg-[#1E1E1E]">가격 높은순</option>
                </select>
                <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="최소 가격"
                  className="bg-[#1E1E1E] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#737373] focus:outline-none" />
                <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="최대 가격"
                  className="bg-[#1E1E1E] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#737373] focus:outline-none" />
              </div>
            )}
          </div>
        )}

        {/* 개인거래 Grid */}
        {tab === "trade" && (
          filtered.length === 0 ? (
            <div className="py-20 text-center text-[#737373] text-sm">검색 결과가 없습니다</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {filtered.map(product => (
                <div key={product.id} onClick={() => setSelected(product)} className="group cursor-pointer">
                  <div className="aspect-square bg-[#1E1E1E] border border-white/[0.08] rounded-2xl flex items-center justify-center text-5xl mb-4 group-hover:border-white/20 transition-colors relative">
                    {product.emoji}
                    <button onClick={e => toggleLike(product.id, e)} className="absolute top-3 right-3 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      {liked.has(product.id) ? "❤️" : "🤍"}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-[#737373] tracking-wider uppercase">{product.category}</p>
                    <p className="text-sm text-white font-medium leading-snug line-clamp-2">{product.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{product.price.toLocaleString()}원</span>
                      <span className="text-[10px] text-[#737373]">{product.grade}급</span>
                    </div>
                    <p className="text-[11px] text-[#737373]">{product.seller} · {product.region}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* 공동구매 List */}
        {tab === "group" && (
          gbFiltered.length === 0 ? (
            <div className="py-20 text-center text-[#737373] text-sm">진행 중인 공동구매가 없습니다</div>
          ) : (
            <div className="space-y-4">
              {gbFiltered.map(gb => {
                const pct = Math.round((gb.currentQty / gb.minQty) * 100);
                const isFull = gb.currentQty >= gb.minQty;
                const discount = Math.round((1 - gb.targetPrice / gb.unitPrice) * 100);
                return (
                  <div key={gb.id} onClick={() => setSelectedGroup(gb)} className="bg-[#1E1E1E] border border-white/[0.08] rounded-2xl p-6 cursor-pointer hover:border-white/20 transition-colors">
                    <div className="flex items-start gap-5">
                      <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center text-3xl shrink-0">{gb.emoji}</div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium tracking-wider text-[#737373] uppercase">{gb.category}</span>
                          {isFull && <span className="text-[10px] font-medium text-white bg-white/10 px-2 py-0.5 rounded-full">달성</span>}
                        </div>
                        <p className="text-base font-medium text-white">{gb.title}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold text-white">{gb.targetPrice.toLocaleString()}원</span>
                          <span className="text-sm text-[#737373] line-through">{gb.unitPrice.toLocaleString()}원</span>
                          <span className="text-xs font-medium text-white">-{discount}%</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[11px] text-[#737373]">
                            <span>{gb.currentQty}/{gb.minQty}명 참여</span>
                            <span>마감 {gb.deadline.slice(5)}</span>
                          </div>
                          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); gb.joined ? joinGroup(gb.id) : startPurchase({ type: "group", id: gb.id, name: gb.title, price: gb.targetPrice, emoji: gb.emoji }); }}
                        className={`shrink-0 px-5 py-2.5 text-xs font-medium rounded-full transition-colors ${gb.joined ? "bg-white/10 text-white" : "bg-white text-black hover:bg-white/90"}`}>
                        {gb.joined ? "참여중" : "참여하기"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Product Detail Modal */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6" onClick={() => setSelected(null)}>
            <div className="w-full max-w-md bg-[#1E1E1E] border border-white/[0.08] rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="aspect-video bg-black flex items-center justify-center text-7xl">{selected.emoji}</div>
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <p className="text-[10px] text-[#737373] tracking-wider uppercase">{selected.category} · {selected.sport}</p>
                  <h3 className="text-lg font-semibold text-white">{selected.name}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-semibold text-white">{selected.price.toLocaleString()}원</span>
                    <span className="text-xs text-[#737373]">{selected.grade}급</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[#737373]">판매자</span><span className="text-white">{selected.seller}</span></div>
                  <div className="flex justify-between"><span className="text-[#737373]">거래 지역</span><span className="text-white">{selected.region}</span></div>
                  <div className="flex justify-between"><span className="text-[#737373]">조회수</span><span className="text-white">{selected.views}회</span></div>
                  <div className="flex justify-between"><span className="text-[#737373]">관심</span><span className="text-white">{selected.likes + (liked.has(selected.id) ? 1 : 0)}명</span></div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={e => toggleLike(selected.id, e)} className="w-12 h-12 border border-white/[0.08] rounded-xl flex items-center justify-center text-lg hover:bg-white/5">
                    {liked.has(selected.id) ? "❤️" : "🤍"}
                  </button>
                  <button className="flex-1 h-12 border border-white/[0.08] rounded-xl text-sm font-medium text-white hover:bg-white/5">채팅 문의</button>
                  <button onClick={() => startPurchase({ type: "trade", id: selected.id, name: selected.name, price: selected.price, emoji: selected.emoji })}
                    className="flex-1 h-12 bg-white text-black rounded-xl text-sm font-medium hover:bg-white/90">즉시 구매</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Group Buy Detail Modal */}
        {selectedGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6" onClick={() => setSelectedGroup(null)}>
            <div className="w-full max-w-md bg-[#1E1E1E] border border-white/[0.08] rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="aspect-video bg-black flex items-center justify-center text-7xl">{selectedGroup.emoji}</div>
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <p className="text-[10px] text-[#737373] tracking-wider uppercase">{selectedGroup.category} · {selectedGroup.sport}</p>
                  <h3 className="text-base font-semibold text-white">{selectedGroup.title}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-semibold text-white">{selectedGroup.targetPrice.toLocaleString()}원</span>
                    <span className="text-sm text-[#737373] line-through">{selectedGroup.unitPrice.toLocaleString()}원</span>
                    <span className="text-xs font-medium text-white">-{Math.round((1 - selectedGroup.targetPrice / selectedGroup.unitPrice) * 100)}%</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[#737373]">주최자</span><span className="text-white">{selectedGroup.organizer}</span></div>
                  <div className="flex justify-between"><span className="text-[#737373]">마감일</span><span className="text-white">{selectedGroup.deadline}</span></div>
                  <div className="flex justify-between"><span className="text-[#737373]">현재 참여</span><span className="text-white">{selectedGroup.currentQty}/{selectedGroup.minQty}명</span></div>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, Math.round((selectedGroup.currentQty / selectedGroup.minQty) * 100))}%` }} />
                </div>
                <p className="text-xs text-[#737373] leading-relaxed">{selectedGroup.description}</p>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setSelectedGroup(null)} className="flex-1 h-12 border border-white/[0.08] rounded-xl text-sm text-[#737373] hover:bg-white/5">닫기</button>
                  <button onClick={() => selectedGroup.joined ? joinGroup(selectedGroup.id) : startPurchase({ type: "group", id: selectedGroup.id, name: selectedGroup.title, price: selectedGroup.targetPrice, emoji: selectedGroup.emoji })}
                    className={`flex-1 h-12 rounded-xl text-sm font-medium transition-colors ${selectedGroup.joined ? "bg-white/10 text-white" : "bg-white text-black hover:bg-white/90"}`}>
                    {selectedGroup.joined ? "참여 취소" : "공동구매 참여"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Group Form Modal */}
        {showGroupForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <div className="w-full max-w-md bg-[#1E1E1E] border border-white/[0.08] rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">공동구매 개설</h3>
                <button onClick={() => setShowGroupForm(false)} className="text-[#737373] hover:text-white"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <input value={groupForm.title} onChange={e => setGroupForm(f => ({ ...f, title: e.target.value }))} placeholder="공동구매 제목"
                  className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#737373] focus:outline-none focus:border-white/20" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={groupForm.sport} onChange={e => setGroupForm(f => ({ ...f, sport: e.target.value }))} className="bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none">
                    {sports.filter(s => s !== "전체").map(s => <option key={s} value={s} className="bg-black">{s}</option>)}
                  </select>
                  <select value={groupForm.category} onChange={e => setGroupForm(f => ({ ...f, category: e.target.value }))} className="bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none">
                    {categories.filter(c => c !== "전체 카테고리").map(c => <option key={c} value={c} className="bg-black">{c}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" value={groupForm.targetPrice} onChange={e => setGroupForm(f => ({ ...f, targetPrice: e.target.value }))} placeholder="공구가"
                    className="bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#737373] focus:outline-none" />
                  <input type="number" value={groupForm.unitPrice} onChange={e => setGroupForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="정가"
                    className="bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#737373] focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" value={groupForm.minQty} onChange={e => setGroupForm(f => ({ ...f, minQty: e.target.value }))} placeholder="최소 인원"
                    className="bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#737373] focus:outline-none" />
                  <input type="date" value={groupForm.deadline} onChange={e => setGroupForm(f => ({ ...f, deadline: e.target.value }))}
                    className="bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none" />
                </div>
                <textarea value={groupForm.description} onChange={e => setGroupForm(f => ({ ...f, description: e.target.value }))} placeholder="공동구매 설명" rows={3}
                  className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#737373] focus:outline-none resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowGroupForm(false)} className="flex-1 h-12 border border-white/[0.08] rounded-xl text-sm text-[#737373] hover:bg-white/5">취소</button>
                <button onClick={() => { alert("공동구매 개설 완료!"); setShowGroupForm(false); }} disabled={!groupForm.title || !groupForm.targetPrice || !groupForm.minQty}
                  className="flex-1 h-12 bg-white text-black rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-white/90">개설하기</button>
              </div>
            </div>
          </div>
        )}

        {/* Sell Modal */}
        {showSell && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <div className="w-full max-w-md bg-[#1E1E1E] border border-white/[0.08] rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">판매 등록</h3>
                <button onClick={() => setShowSell(false)} className="text-[#737373] hover:text-white"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="상품명"
                  className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#737373] focus:outline-none focus:border-white/20" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value }))} className="bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none">
                    {sports.filter(s => s !== "전체").map(s => <option key={s} value={s} className="bg-black">{s}</option>)}
                  </select>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none">
                    {categories.filter(c => c !== "전체 카테고리").map(c => <option key={c} value={c} className="bg-black">{c}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="판매 가격"
                    className="bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#737373] focus:outline-none" />
                  <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} className="bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none">
                    {grades.map(g => <option key={g.grade} value={g.grade} className="bg-black">{g.grade}급 - {g.label}</option>)}
                  </select>
                </div>
                <select value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none">
                  {REGIONS.map(r => <option key={r} value={r} className="bg-black">{r}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowSell(false)} className="flex-1 h-12 border border-white/[0.08] rounded-xl text-sm text-[#737373] hover:bg-white/5">취소</button>
                <button onClick={() => {
                  const newProd: Product = { id: Date.now(), name: form.name, category: form.category, price: Number(form.price), grade: form.grade, emoji: "🛒", sport: form.sport, seller: "나", region: form.region, views: 0, likes: 0 };
                  setExtraProducts(prev => [newProd, ...prev]); setShowSell(false); setForm(EMPTY_FORM); setSport("전체"); setTab("trade");
                }} disabled={!form.name || !form.price}
                  className="flex-1 h-12 bg-white text-black rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-white/90">등록하기</button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {payingItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <div className="w-full max-w-sm bg-[#1E1E1E] border border-white/[0.08] rounded-2xl p-6 space-y-5">
              {payDone ? (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl">✓</div>
                  <h3 className="text-lg font-semibold text-white">결제 완료</h3>
                  <p className="text-sm text-[#737373]">{payingItem.name}</p>
                  <p className="text-xl font-semibold text-white">{payingItem.price.toLocaleString()}원</p>
                  <button onClick={closePay} className="mt-2 px-8 py-3 bg-white text-black rounded-full text-sm font-medium hover:bg-white/90">확인</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 pb-5 border-b border-white/[0.08]">
                    <span className="text-4xl">{payingItem.emoji}</span>
                    <div>
                      <p className="text-[10px] text-[#737373] tracking-wider uppercase">{payingItem.type === "group" ? "공동구매 참여" : "즉시 구매"}</p>
                      <p className="text-sm font-medium text-white mt-1">{payingItem.name}</p>
                      <p className="text-lg font-semibold text-white mt-1">{payingItem.price.toLocaleString()}원</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#737373] tracking-wider uppercase mb-3">결제 수단</p>
                    <div className="grid grid-cols-4 gap-2">
                      {(["card", "kakao", "toss", "naver"] as PayMethod[]).map(m => (
                        <button key={m} onClick={() => setPayMethod(m)}
                          className={`py-2.5 rounded-lg text-[10px] font-medium border transition-colors ${payMethod === m ? "border-white text-white" : "border-white/[0.08] text-[#737373] hover:border-white/20"}`}>
                          {m === "card" ? "카드" : m === "kakao" ? "카카오" : m === "toss" ? "토스" : "네이버"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {payMethod === "card" ? (
                    <div className="space-y-3">
                      <input value={payForm.card} onChange={e => setPayForm(f => ({ ...f, card: e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim() }))}
                        placeholder="카드 번호" maxLength={19} className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#737373] focus:outline-none" />
                      <div className="grid grid-cols-2 gap-3">
                        <input value={payForm.expiry} onChange={e => setPayForm(f => ({ ...f, expiry: e.target.value }))} placeholder="MM/YY" maxLength={5}
                          className="bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#737373] focus:outline-none" />
                        <input value={payForm.name} onChange={e => setPayForm(f => ({ ...f, name: e.target.value }))} placeholder="소유자명"
                          className="bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#737373] focus:outline-none" />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-black border border-white/[0.08] rounded-xl p-5 text-center">
                      <p className="text-sm text-white">{payMethod === "kakao" ? "카카오페이" : payMethod === "toss" ? "토스페이" : "네이버페이"}로 결제</p>
                      <p className="text-xs text-[#737373] mt-1">앱에서 결제를 진행합니다</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={closePay} className="flex-1 h-12 border border-white/[0.08] rounded-xl text-sm text-[#737373] hover:bg-white/5">취소</button>
                    <button onClick={confirmPay} disabled={payMethod === "card" && (!payForm.card || !payForm.expiry || !payForm.name)}
                      className="flex-1 h-12 bg-white text-black rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-white/90">
                      {payingItem.price.toLocaleString()}원 결제
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
