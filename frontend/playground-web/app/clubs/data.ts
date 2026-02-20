export type Club = {
  id: number;
  name: string;
  sido: string;
  sigungu: string;
  record: string;
  winRate: number;
  members: number;
  style: string;
  founded: string;
  logo: string;
  positions: { gk: number; df: number; mf: number; fw: number };
  areas: [string, string, string];
};

export const clubs: Club[] = [
  { id: 1,  name: "FC 드래곤",      sido: "서울", sigungu: "강남구",   record: "12승 4무 3패", winRate: 63, members: 18, style: "공격형 4-3-3",   founded: "2019", logo: "/logos/Gemini_Generated_Image_3p9jt3p9jt3p9jt3.png", positions: { gk: 2, df: 5, mf: 6, fw: 5 }, areas: ["강남구", "서초구", "송파구"] },
  { id: 2,  name: "썬더 United",    sido: "서울", sigungu: "마포구",   record: "10승 5무 4패", winRate: 53, members: 15, style: "압박 수비형",     founded: "2020", logo: "/logos/Gemini_Generated_Image_51u3bi51u3bi51u3.png", positions: { gk: 1, df: 6, mf: 5, fw: 3 }, areas: ["마포구", "서대문구", "은평구"] },
  { id: 3,  name: "블루스톰 FC",    sido: "경기", sigungu: "성남시",   record: "9승 6무 4패",  winRate: 47, members: 20, style: "역습 전술",       founded: "2018", logo: "/logos/Gemini_Generated_Image_5jnh575jnh575jnh.png", positions: { gk: 2, df: 6, mf: 7, fw: 5 }, areas: ["성남시", "용인시", "수원시"] },
  { id: 4,  name: "한강 라이온즈",  sido: "서울", sigungu: "영등포구", record: "8승 3무 6패",  winRate: 47, members: 16, style: "균형형 4-4-2",   founded: "2021", logo: "/logos/Gemini_Generated_Image_8jui758jui758jui.png", positions: { gk: 2, df: 5, mf: 5, fw: 4 }, areas: ["영등포구", "구로구", "동작구"] },
  { id: 5,  name: "북한산 FC",      sido: "서울", sigungu: "은평구",   record: "11승 2무 5패", winRate: 61, members: 14, style: "수비 중심",       founded: "2017", logo: "/logos/Gemini_Generated_Image_bph5v3bph5v3bph5.png", positions: { gk: 1, df: 6, mf: 4, fw: 3 }, areas: ["은평구", "서대문구", "마포구"] },
  { id: 6,  name: "인천 파도",      sido: "인천", sigungu: "연수구",   record: "7승 4무 7패",  winRate: 39, members: 22, style: "측면 공격형",     founded: "2020", logo: "/logos/Gemini_Generated_Image_cou7ldcou7ldcou7.png", positions: { gk: 2, df: 6, mf: 7, fw: 7 }, areas: ["연수구", "남동구", "부평구"] },
  { id: 7,  name: "수원 불꽃",      sido: "경기", sigungu: "수원시",   record: "13승 3무 2패", winRate: 72, members: 19, style: "공격형 3-4-3",   founded: "2016", logo: "/logos/Gemini_Generated_Image_d0038qd0038qd003.png", positions: { gk: 2, df: 4, mf: 6, fw: 7 }, areas: ["수원시", "화성시", "오산시"] },
  { id: 8,  name: "분당 스타즈",    sido: "경기", sigungu: "분당구",   record: "6승 5무 7패",  winRate: 33, members: 17, style: "패스 중심",       founded: "2022", logo: "/logos/Gemini_Generated_Image_jk8v4wjk8v4wjk8v.png", positions: { gk: 2, df: 5, mf: 7, fw: 3 }, areas: ["분당구", "성남시", "용인시"] },
  { id: 9,  name: "강동 이글스",    sido: "서울", sigungu: "강동구",   record: "9승 4무 5패",  winRate: 50, members: 21, style: "균형형",          founded: "2019", logo: "/logos/Gemini_Generated_Image_khiunukhiunukhiu.png", positions: { gk: 2, df: 6, mf: 7, fw: 6 }, areas: ["강동구", "송파구", "하남시"] },
  { id: 10, name: "용인 FC",        sido: "경기", sigungu: "용인시",   record: "10승 6무 2패", winRate: 56, members: 13, style: "압박형 4-2-3-1", founded: "2018", logo: "/logos/Gemini_Generated_Image_l1axhql1axhql1ax.png", positions: { gk: 1, df: 4, mf: 5, fw: 3 }, areas: ["용인시", "수지구", "기흥구"] },
  { id: 11, name: "마포 불사조",    sido: "서울", sigungu: "마포구",   record: "5승 3무 10패", winRate: 28, members: 12, style: "수비 역습형",     founded: "2023", logo: "/logos/Gemini_Generated_Image_m14pp3m14pp3m14p.png", positions: { gk: 1, df: 5, mf: 4, fw: 2 }, areas: ["마포구", "용산구", "중구"] },
  { id: 12, name: "송파 드래곤즈",  sido: "서울", sigungu: "송파구",   record: "8승 5무 5패",  winRate: 44, members: 16, style: "세트피스 특화",   founded: "2020", logo: "/logos/Gemini_Generated_Image_vnv8fzvnv8fzvnv8.png", positions: { gk: 2, df: 5, mf: 5, fw: 4 }, areas: ["송파구", "강동구", "강남구"] },
];
