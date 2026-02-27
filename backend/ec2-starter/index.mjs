import { EC2Client, StartInstancesCommand, DescribeInstancesCommand } from "@aws-sdk/client-ec2";

const ec2 = new EC2Client({ region: "us-east-1" });
const INSTANCE_ID = process.env.INSTANCE_ID || "i-03dfdfeb95b7a281a";

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    // 현재 상태 확인
    const desc = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
    const instance = desc.Reservations[0]?.Instances[0];
    const state = instance?.State?.Name;
    const publicIp = instance?.PublicIpAddress;

    if (state === "running") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: "running", publicIp, message: "EC2 이미 실행 중" }),
      };
    }

    if (state === "stopped") {
      await ec2.send(new StartInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: "starting", message: "EC2 시작 중..." }),
      };
    }

    // pending, stopping 등
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: state, message: `EC2 상태: ${state}` }),
    };
  } catch (err) {
    console.error("EC2 start error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
