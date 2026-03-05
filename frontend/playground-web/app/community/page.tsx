"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Play, Clock, Eye, Heart, ChevronRight } from "lucide-react";

// 탭 목록
const tabs = ["우리동네", "자유게시판", "축구", "풋살", "농구", "야구", "배드민턴", "테니스", "마켓"];

// 내 동네 설정 (개인이 설정해둔 3곳)
const myRegions = ["강남구", "서초구", "마포구"];

// Mock 하이라이트 영상
const mockHighlights = [
  { id: 1, title: "환상적인 중거리 슛!", player: "김민수", team: "강남 FC", views: 12340, likes: 892 },
  { id: 2, title: "수비수 3명 제치고 골!", player: "이준호", team: "서초 유나이티드", views: 9870, likes: 654 },
  { id: 3, title: "역대급 프리킥 골", player: "박성진", team: "수원 블루윙즈", views: 7560, likes: 521 },
  { id: 4, title: "역전 결승골 순간", player: "최영훈", team: "강남 FC", views: 23410, likes: 1832 },
  { id: 5, title: "골키퍼 완벽 선방", player: "정대현", team: "마포 FC", views: 5430, likes: 387 },
];

// Mock 종목별 게시글
const mockSportPosts = [
  { id: 1, title: "4-3-3 포메이션 완벽 가이드", author: "전술매니아", comments: 45, likes: 189, hot: true, sport: "축구" },
  { id: 2, title: "어제 경기 하이라이트 분석", author: "축구박사", comments: 32, likes: 156, hot: true, sport: "축구" },
  { id: 3, title: "새로 나온 축구화 실착 리뷰", author: "장비덕후", comments: 52, likes: 234, hot: true, sport: "축구" },
  { id: 4, title: "풋살 기본기 연습법", author: "풋살러", comments: 28, likes: 98, hot: false, sport: "풋살" },
  { id: 5, title: "농구 슛 폼 교정 팁", author: "농구코치", comments: 35, likes: 145, hot: true, sport: "농구" },
];

// Mock 자유게시판 게시글
const mockFreePosts = [
  { id: 1, title: "운동 후 단백질 보충 어떻게 하세요?", author: "헬스초보", comments: 67, likes: 234, hot: true },
  { id: 2, title: "주말에 같이 운동하실 분!", author: "운동좋아", comments: 23, likes: 45, hot: false },
  { id: 3, title: "운동화 추천 부탁드려요", author: "뉴비", comments: 41, likes: 89, hot: false },
  { id: 4, title: "다이어트 식단 공유합니다", author: "다이어터", comments: 89, likes: 312, hot: true },
];

// Mock 용병 구인
const mockMercenaryPosts = [
  { id: 1, location: "강남구", sport: "풋살", time: "오늘 19:00", needed: 1, venue: "강남 풋살파크", urgent: true },
  { id: 2, location: "마포구", sport: "농구", time: "오늘 20:00", needed: 2, venue: "마포 체육관", urgent: true },
  { id: 3, location: "서초구", sport: "축구", time: "내일 14:00", needed: 3, venue: "서초 운동장", urgent: false },
];

// Mock 구장 정보
const mockVenues = [
  { id: 1, name: "강남 스포츠센터", distance: "0.5km", available: true, activity: 85, price: "3만원/시간" },
  { id: 2, name: "역삼 풋살장", distance: "0.8km", available: true, activity: 62, price: "2.5만원/시간" },
  { id: 3, name: "선릉 테니스장", distance: "1.2km", available: false, activity: 90, price: "2만원/시간" },
];

// Mock 동네 게시글
const mockLocalPosts = [
  { id: 1, title: "강남구 구장 상태 어떤가요?", author: "뉴비", location: "강남구", comments: 23, time: "10분 전" },
  { id: 2, title: "우리 동네 축구 크루 모집합니다", author: "강남FC대장", location: "강남구", comments: 45, time: "30분 전" },
  { id: 3, title: "서초구 주말 농구 정모", author: "농구러버", location: "서초구", comments: 18, time: "1시간 전" },
];

function CommunityContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabFromUrl = searchParams.get("tab");
  
  const [selectedTab, setSelectedTab] = useState("우리동네");
  const [selectedRegion, setSelectedRegion] = useState("강남구");
  const [hoveredVideo, setHoveredVideo] = useState<number | null>(null);
  
  useEffect(() => {
    if (tabFromUrl && tabs.includes(tabFromUrl)) {
      setSelectedTab(tabFromUrl);
    }
  }, [tabFromUrl]);
  
  const isSport = !["자유게시판", "우리동네"].includes(selectedTab);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>커뮤니티</h1>
      </div>

      {/* 탭 선택 */}
      <div className="flex gap-6 overflow-x-auto pb-2" style={{ borderBottom: "1px solid var(--card-border)" }}>
        {tabs.map((tab) => {
          const isActive = selectedTab === tab;
          
          if (tab === "마켓") {
            return (
              <Link
                key={tab}
                href="/market"
                className="pb-3 text-sm font-medium whitespace-nowrap transition-all hover:opacity-80"
                style={{ color: "var(--text-muted)" }}
              >
                {tab}
              </Link>
            );
          }
          
          return (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className="pb-3 text-sm font-medium whitespace-nowrap transition-all relative"
              style={{ color: isActive ? "var(--text-primary)" : "var(--text-muted)" }}
            >
              {tab}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--text-primary)" }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ==================== 종목별 탭 (PLAYBACK + LOCKER ROOM) ==================== */}
      {isSport && (
        <div className="space-y-12">
          {/* LOCKER ROOM - 게시글 */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>게시판</h2>
            </div>
            
            <div className="space-y-1">
              {mockSportPosts
                .filter(p => p.sport === selectedTab)
                .map((post) => (
                <div
                  key={post.id}
                  className="py-5 flex items-center justify-between cursor-pointer group"
                  style={{ borderBottom: "1px solid var(--card-border)" }}
                >
                  <div className="flex items-center gap-4">
                    {post.hot && (
                      <span 
                        className="text-[10px] font-medium px-2 py-1 rounded"
                        style={{ background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }}
                      >
                        인기
                      </span>
                    )}
                    <div>
                      <h3 className="font-medium group-hover:opacity-70 transition-opacity" style={{ color: "var(--text-primary)" }}>{post.title}</h3>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{post.author}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>{post.comments} 댓글</span>
                    <span>{post.likes} 좋아요</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PLAYBACK - 베스트 플레이 */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>베스트 플레이</h2>
              <Link href="/community/videos" className="text-xs flex items-center gap-1 transition-opacity hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                전체보기 <ChevronRight size={14} />
              </Link>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {mockHighlights.slice(0, 4).map((video) => (
                <div
                  key={video.id}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredVideo(video.id)}
                  onMouseLeave={() => setHoveredVideo(null)}
                >
                  <div 
                    className="aspect-[9/14] rounded-xl overflow-hidden relative"
                    style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
                  >
                    {hoveredVideo === video.id && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#fff" }}>
                          <Play size={24} className="ml-1" style={{ color: "#000" }} fill="#000" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                      <span className="flex items-center gap-1">
                        <Eye size={12} /> {(video.views / 1000).toFixed(1)}K
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart size={12} /> {video.likes}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-base font-medium truncate group-hover:opacity-70 transition-opacity" style={{ color: "var(--text-primary)" }}>{video.title}</h3>
                    <p className="text-sm mt-1 truncate" style={{ color: "var(--text-muted)" }}>{video.player} · {video.team}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 자유게시판 탭 ==================== */}
      {selectedTab === "자유게시판" && (
        <div className="space-y-6">
          <h2 className="text-xs font-semibold tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>자유게시판</h2>
          
          <div className="space-y-1">
            {mockFreePosts.map((post) => (
              <div
                key={post.id}
                className="py-5 flex items-center justify-between cursor-pointer group"
                style={{ borderBottom: "1px solid var(--card-border)" }}
              >
                <div className="flex items-center gap-4">
                  {post.hot && (
                    <span 
                      className="text-[10px] font-medium px-2 py-1 rounded"
                      style={{ background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }}
                    >
                      인기
                    </span>
                  )}
                  <div>
                    <h3 className="font-medium group-hover:opacity-70 transition-opacity" style={{ color: "var(--text-primary)" }}>{post.title}</h3>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{post.author}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span>{post.comments} 댓글</span>
                  <span>{post.likes} 좋아요</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== 우리동네 탭 ==================== */}
      {selectedTab === "우리동네" && (
        <div className="space-y-10">
          {/* 내 동네 선택 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="text-xs font-semibold tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>내 동네</span>
              <div className="flex gap-3">
                {myRegions.map((region) => {
                  const isActive = selectedRegion === region;
                  return (
                    <button
                      key={region}
                      onClick={() => setSelectedRegion(region)}
                      className="text-sm font-medium transition-all"
                      style={{ color: isActive ? "var(--text-primary)" : "var(--text-muted)" }}
                    >
                      {region}
                    </button>
                  );
                })}
              </div>
            </div>
            <Link href="/mypage/region" className="text-xs transition-opacity hover:opacity-70" style={{ color: "var(--text-muted)" }}>
              설정 변경
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 동네 게시판 */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>동네 게시판</h2>
                <Link href="/community/local" className="text-xs transition-opacity hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                  전체보기
                </Link>
              </div>
              
              <div className="space-y-1">
                {mockLocalPosts
                  .filter(p => p.location === selectedRegion)
                  .map((post) => (
                  <div
                    key={post.id}
                    className="py-4 cursor-pointer group"
                    style={{ borderBottom: "1px solid var(--card-border)" }}
                  >
                    <h3 className="text-sm font-medium group-hover:opacity-70 transition-opacity" style={{ color: "var(--text-primary)" }}>{post.title}</h3>
                    <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>{post.author} · {post.time}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 용병 급구 */}
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-semibold tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>용병 급구</h2>
                <span 
                  className="text-[10px] font-medium px-2 py-0.5 rounded"
                  style={{ background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }}
                >
                  LIVE
                </span>
              </div>
              
              <div className="space-y-3">
                {mockMercenaryPosts
                  .filter(p => p.location === selectedRegion)
                  .map((post) => (
                  <div
                    key={post.id}
                    className="p-4 rounded-lg cursor-pointer transition-all hover:opacity-90"
                    style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      {post.urgent && (
                        <span 
                          className="text-[10px] font-medium px-2 py-0.5 rounded"
                          style={{ background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }}
                        >
                          급구
                        </span>
                      )}
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{post.sport}</span>
                    </div>
                    <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{post.needed}명 구함</h3>
                    <div className="text-xs mt-2 space-y-1" style={{ color: "var(--text-muted)" }}>
                      <div className="flex items-center gap-2"><Clock size={12} /> {post.time}</div>
                      <div className="flex items-center gap-2"><MapPin size={12} /> {post.venue}</div>
                    </div>
                    <button 
                      className="w-full mt-4 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                      style={{ background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }}
                    >
                      참가신청
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 내 주변 구장 */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>내 주변 구장</h2>
                <Link href="/venues" className="text-xs transition-opacity hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                  지도보기
                </Link>
              </div>
              
              <div className="space-y-3">
                {mockVenues.map((venue) => (
                  <div 
                    key={venue.id}
                    className="p-4 rounded-lg cursor-pointer transition-all hover:opacity-90"
                    style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{venue.name}</h4>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{venue.distance}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span 
                        className="text-xs font-medium"
                        style={{ color: venue.available ? "var(--text-primary)" : "var(--text-muted)" }}
                      >
                        {venue.available ? "예약가능" : "마감"}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{venue.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto"><h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>커뮤니티</h1></div>}>
      <CommunityContent />
    </Suspense>
  );
}
