"use client";
import { createContext, useContext, useState, ReactNode } from "react";

export type ChatMsg = {
  from: "me" | "them";
  text: string;
  times?: string[];       // 시간 선택 메시지
  selectedTime?: string[];  // 상대방이 선택한 시간들
};

export type ChatRoom = {
  id: number;
  team: string;
  userName: string;
  avatar: string;
  date: string;
  venue: string;
  msgs: ChatMsg[];
};

type ChatCtx = {
  rooms: ChatRoom[];
  addRoom: (r: Omit<ChatRoom, "msgs">) => void;
  sendMsg: (id: number, text: string) => void;
  sendTimeSlot: (id: number, date: string, times: string[]) => void;
  selectTime: (roomId: number, msgIdx: number, time: string) => void;
};

const ChatContext = createContext<ChatCtx | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<ChatRoom[]>([
    { id: 101, team: "수원 불꽃",    userName: "김진호", avatar: "/user_1.jpg",  date: "2026.03.05 (목) 19:00", venue: "수원종합운동장",  msgs: [{ from: "them", text: "안녕하세요! 경기 제안드립니다. 가능하신가요?" }, { from: "me", text: "네 좋습니다! 일정 맞춰볼게요." }] },
    { id: 102, team: "한강 라이온즈", userName: "이재원", avatar: "/user_2.jpg",  date: "2026.03.12 (목) 18:00", venue: "여의도한강공원", msgs: [{ from: "them", text: "3월 12일 경기 어떠세요?" }] },
    { id: 103, team: "북한산 FC",    userName: "박승현", avatar: "/user_3.jpg", date: "2026.03.20 (금) 17:00", venue: "은평구민체육관", msgs: [{ from: "them", text: "친선경기 제안드려요 :)" }, { from: "me", text: "검토 후 연락드릴게요!" }, { from: "them", text: "감사합니다 기다릴게요~" }] },
    { id: 104, team: "강남 스트라이커즈", userName: "최유진", avatar: "/user_4.jpg", date: "2026.03.25 (수) 20:00", venue: "탄천종합운동장", msgs: [{ from: "them", text: "주말 경기 가능하신가요? 장소는 탄천이요!" }] },
    { id: 105, team: "인천 유나이티드", userName: "정하늘", avatar: "/user_5.jpg", date: "2026.04.02 (목) 19:00", venue: "인천축구전용경기장", msgs: [{ from: "them", text: "4월 초 연습경기 한번 잡아볼까요?" }, { from: "me", text: "좋아요! 시간 조율해봅시다." }] },
  ]);

  function addRoom(r: Omit<ChatRoom, "msgs">) {
    setRooms(prev => {
      if (prev.find(p => p.id === r.id)) return prev;
      return [...prev, { ...r, msgs: [{ from: "them", text: `안녕하세요! ${r.date} ${r.venue}에서 경기 제안드립니다. 가능하신가요?` }] }];
    });
  }

  function sendMsg(id: number, text: string) {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, msgs: [...r.msgs, { from: "me", text }] } : r));
    setTimeout(() => {
      setRooms(prev => prev.map(r => r.id === id ? { ...r, msgs: [...r.msgs, { from: "them", text: "네 확인했습니다! 일정 맞추죠." }] } : r));
    }, 800);
  }

  function sendTimeSlot(id: number, date: string, times: string[]) {
    setRooms(prev => prev.map(r => r.id === id
      ? { ...r, msgs: [...r.msgs, { from: "me", text: `📅 ${date}`, times }] }
      : r
    ));
  }

  function selectTime(roomId: number, msgIdx: number, time: string) {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      const msgs = r.msgs.map((m, i) => {
        if (i !== msgIdx) return m;
        const prev = m.selectedTime ?? [];
        const next = prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time];
        return { ...m, selectedTime: next };
      });
      return { ...r, msgs };
    }));
  }

  return <ChatContext.Provider value={{ rooms, addRoom, sendMsg, sendTimeSlot, selectTime }}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
