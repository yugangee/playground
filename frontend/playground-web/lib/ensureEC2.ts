const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ayeyr9vgsc.execute-api.us-east-1.amazonaws.com/prod";
const VIDEO_API_URL = process.env.NEXT_PUBLIC_VIDEO_API_URL || "https://d2e8khynpnbcpl.cloudfront.net";

/**
 * EC2가 꺼져있으면 시작하고, health check 통과할 때까지 대기.
 * @param onStatus 상태 콜백 (UI 업데이트용)
 * @returns true면 EC2 준비 완료, false면 실패
 */
export async function ensureEC2Running(onStatus?: (msg: string) => void): Promise<boolean> {
  try {
    // 1. 먼저 health check 시도
    onStatus?.("서버 상태 확인 중...");
    const healthOk = await checkHealth();
    if (healthOk) return true;

    // 2. Health check 실패 → EC2 시작 요청
    onStatus?.("서버 시작 중...");
    const res = await fetch(`${API_URL}/ec2/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("EC2 시작 요청 실패");
    const data = await res.json();

    if (data.status === "running") return true;

    // 3. EC2 부팅 대기 (최대 90초)
    onStatus?.("서버 부팅 중... (최대 1분 30초 소요)");
    const maxWait = 90_000;
    const interval = 5_000;
    let elapsed = 0;

    while (elapsed < maxWait) {
      await new Promise((r) => setTimeout(r, interval));
      elapsed += interval;
      const remaining = Math.ceil((maxWait - elapsed) / 1000);
      onStatus?.(`서버 부팅 중... (약 ${remaining}초 남음)`);
      if (await checkHealth()) return true;
    }

    onStatus?.("서버 시작 시간 초과");
    return false;
  } catch (err) {
    console.error("[ensureEC2]", err);
    onStatus?.("서버 시작 실패");
    return false;
  }
}

async function checkHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${VIDEO_API_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}
