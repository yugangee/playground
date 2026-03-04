// 동시에 여러 요청이 갱신을 시도하지 않도록 singleton promise로 관리
let refreshPromise: Promise<boolean> | null = null;

export async function tryRefreshTokens(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // 이미 갱신 중이면 같은 Promise 재사용
  if (refreshPromise) return refreshPromise;

  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return false;

  refreshPromise = (async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        }
      );
      if (!res.ok) return false;
      const data = await res.json();
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("idToken", data.idToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("idToken");
  localStorage.removeItem("refreshToken");
}

/** JWT exp 클레임을 디코딩해 만료 여부 확인 (5분 여유) */
export function isTokenExpiredOrNearExpiry(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    const { exp } = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );
    return Date.now() / 1000 >= exp - 300; // 5분 전 갱신
  } catch {
    return true;
  }
}
