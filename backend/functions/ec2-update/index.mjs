import { SSMClient, SendCommandCommand } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({ region: "us-east-1" });
const INSTANCE_ID = "i-03dfdfeb95b7a281a";

export const handler = async (event) => {
  console.log("EC2 코드 업데이트 요청");
  
  try {
    // SSM을 통해 EC2에 명령 실행
    const command = new SendCommandCommand({
      InstanceIds: [INSTANCE_ID],
      DocumentName: "AWS-RunShellScript",
      Parameters: {
        commands: [
          "cd /home/ubuntu/football-analysis",
          "git pull origin main",
          "sudo systemctl restart football-analysis",
          "sudo systemctl status football-analysis"
        ]
      }
    });
    
    const response = await ssm.send(command);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        commandId: response.Command.CommandId,
        message: "코드 업데이트 명령이 전송되었습니다. 약 30초 후 적용됩니다."
      })
    };
  } catch (error) {
    console.error("Error:", error);
    
    // SSM Agent가 없는 경우 안내 메시지
    if (error.name === "InvalidInstanceId" || error.message.includes("not connected")) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: false,
          message: "SSM Agent가 설치되어 있지 않습니다. AWS Console에서 Session Manager로 접속하여 수동으로 업데이트해주세요.",
          guide: "https://console.aws.amazon.com/ec2/ → 인스턴스 선택 → 연결 → Session Manager"
        })
      };
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
