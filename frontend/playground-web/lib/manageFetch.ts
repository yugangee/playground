import { tryRefreshTokens, clearTokens } from "./tokenRefresh";

const BASE = process.env.NEXT_PUBLIC_MANAGE_API_URL || process.env.NEXT_PUBLIC_API_URL;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  // Manage API uses CognitoUserPoolsAuthorizer (REST), which only propagates
  // claims (claims.sub) for ID tokens, not Access tokens.
  return localStorage.getItem("idToken") || localStorage.getItem("accessToken");
}

async function doFetch(path: string, options: RequestInit = {}): Promise<Response> {
  if (!BASE) throw new Error("API URL이 설정되지 않았습니다. 환경변수를 확인하세요.");
  const token = getToken();
  return fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
}

export async function manageFetch(path: string, options: RequestInit = {}) {
  let res = await doFetch(path, options);

  // 401이면 토큰 갱신 후 1회 재시도
  if (res.status === 401) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) {
      res = await doFetch(path, options);
    } else {
      clearTokens();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new Error("세션이 만료되었습니다. 다시 로그인해 주세요.");
    }
  }

  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}
