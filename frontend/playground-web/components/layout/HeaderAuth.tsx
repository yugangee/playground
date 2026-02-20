"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Home, UserCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HeaderAuth() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="flex items-center justify-end gap-3 px-6 pt-6 pb-2">
      {loading ? (
        <div className="h-5" />
      ) : user ? (
        <>
          <span className="text-sm text-gray-400">{user.name}님</span>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <LogOut size={14} />
            로그아웃
          </button>
          <Link href="/mypage" className="text-gray-500 hover:text-white transition-colors" title="마이페이지">
            <UserCircle size={18} />
          </Link>
        </>
      ) : (
        <>
          <Link href="/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
            로그인
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium px-4 py-1.5 rounded-full text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}
          >
            회원가입
          </Link>
        </>
      )}
      <Link href="/" className="text-gray-500 hover:text-white transition-colors" title="홈">
        <Home size={18} />
      </Link>
    </div>
  );
}
