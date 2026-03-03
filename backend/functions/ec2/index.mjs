import { EC2Client, DescribeInstancesCommand, StartInstancesCommand, StopInstancesCommand } from "@aws-sdk/client-ec2";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const ec2 = new EC2Client({ region: "us-east-1" });
const s3 = new S3Client({ region: "us-east-1" });

const BUCKET_NAME = "playground-web-sedaily-us";
const HEARTBEAT_KEY = "ec2-heartbeat.json";
const INSTANCE_ID = "i-03dfdfeb95b7a281a";
const AUTO_STOP_MINUTES = 30;

// CORS 헤더
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  // EventBridge에서 호출된 경우 (자동 종료 체크)
  if (event.autoStop === true || event.source === "aws.events") {
    return await autoStopHandler(event);
  }

  // CORS preflight
  if (event.httpMethod === "OPTIONS" || event.requestContext?.http?.method === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const path = event.path || event.rawPath || "";
  const method = event.httpMethod || event.requestContext?.http?.method || "GET";

  try {
    // POST /ec2/ensure - 인스턴스 상태 확인 및 시작
    if (path.includes("/ec2/ensure") && method === "POST") {
      return await ensureInstanceRunning();
    }

    // POST /ec2/heartbeat - 마지막 사용 시간 업데이트
    if (path.includes("/ec2/heartbeat") && method === "POST") {
      return await updateHeartbeat();
    }

    // GET /ec2/status - 인스턴스 상태 조회
    if (path.includes("/ec2/status") && method === "GET") {
      return await getInstanceStatus();
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// 인스턴스 상태 확인 및 시작
async function ensureInstanceRunning() {
  const status = await checkInstanceStatus();
  
  if (status === "running") {
    await updateHeartbeat();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ running: true, status: "running", message: "Instance is already running" }),
    };
  }

  if (status === "pending") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ running: false, status: "pending", message: "Instance is starting" }),
    };
  }

  // stopped 상태면 시작
  if (status === "stopped") {
    console.log("Starting instance:", INSTANCE_ID);
    await ec2.send(new StartInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
    await updateHeartbeat();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ running: false, status: "starting", message: "Instance started" }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ running: false, status, message: `Instance status: ${status}` }),
  };
}

// 인스턴스 상태 조회
async function checkInstanceStatus() {
  const result = await ec2.send(
    new DescribeInstancesCommand({ InstanceIds: [INSTANCE_ID] })
  );
  
  const state = result.Reservations?.[0]?.Instances?.[0]?.State?.Name;
  return state || "unknown";
}

// 인스턴스 상태 반환
async function getInstanceStatus() {
  const status = await checkInstanceStatus();
  const heartbeat = await getHeartbeat();
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      instanceId: INSTANCE_ID,
      status,
      running: status === "running",
      lastHeartbeat: heartbeat?.lastUsed || null,
    }),
  };
}

// 마지막 사용 시간 업데이트
async function updateHeartbeat() {
  const now = Date.now();
  const data = {
    instanceId: INSTANCE_ID,
    lastUsed: now,
    timestamp: new Date(now).toISOString(),
  };
  
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: HEARTBEAT_KEY,
      Body: JSON.stringify(data),
      ContentType: "application/json",
    })
  );
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, lastUsed: now }),
  };
}

// 마지막 사용 시간 조회
async function getHeartbeat() {
  try {
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: HEARTBEAT_KEY,
      })
    );
    
    const body = await result.Body.transformToString();
    return JSON.parse(body);
  } catch (error) {
    if (error.name === "NoSuchKey") {
      return null;
    }
    throw error;
  }
}

// EventBridge에서 호출 - 30분 이상 미사용 시 자동 종료
async function autoStopHandler(event) {
  console.log("Auto-stop check triggered");
  
  try {
    const status = await checkInstanceStatus();
    
    if (status !== "running") {
      console.log("Instance not running, skipping auto-stop");
      return { statusCode: 200, body: "Instance not running" };
    }
    
    const heartbeat = await getHeartbeat();
    const now = Date.now();
    const lastUsed = heartbeat?.lastUsed || 0;
    const minutesSinceLastUse = (now - lastUsed) / 1000 / 60;
    
    console.log(`Minutes since last use: ${minutesSinceLastUse.toFixed(2)}`);
    
    if (minutesSinceLastUse >= AUTO_STOP_MINUTES) {
      console.log(`Stopping instance ${INSTANCE_ID} (inactive for ${minutesSinceLastUse.toFixed(2)} minutes)`);
      await ec2.send(new StopInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
      return { statusCode: 200, body: "Instance stopped due to inactivity" };
    }
    
    console.log("Instance still in use, not stopping");
    return { statusCode: 200, body: "Instance still in use" };
  } catch (error) {
    console.error("Auto-stop error:", error);
    return { statusCode: 500, body: error.message };
  }
}
