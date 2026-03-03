// EC2 인스턴스 자동 시작 유틸리티

const INSTANCE_ID = "i-03dfdfeb95b7a281a";
const REGION = "us-east-1";
const MANAGE_API_URL = process.env.NEXT_PUBLIC_MANAGE_API_URL || "https://91iv3etr0h.execute-api.us-east-1.amazonaws.com/prod";

export async function ensureEC2Running(): Promise<boolean> {
  try {
    console.log("[EC2] Checking instance status...");
    
    // Lambda 함수를 통해 EC2 상태 확인 및 시작
    const response = await fetch(
      `${MANAGE_API_URL}/ec2/ensure`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId: INSTANCE_ID, region: REGION }),
      }
    );

    if (!response.ok) {
      console.error("[EC2] Failed to ensure instance running:", response.status);
      return false;
    }

    const data = await response.json();
    console.log("[EC2] Instance status:", data);
    
    return data.running === true;
  } catch (err) {
    console.error("[EC2] Error ensuring instance:", err);
    return false;
  }
}

export async function startEC2IfNeeded(): Promise<void> {
  console.log("[EC2] Starting instance if needed...");
  await ensureEC2Running();
}
