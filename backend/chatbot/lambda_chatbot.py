"""
PLAYGROUND AI 챗봇 Lambda — Bedrock 직접 호출 (의존성: boto3만)
축구 지식은 시스템 프롬프트에 내장, userContext로 플랫폼 데이터 참조
"""
import json
import os
import boto3

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-20250514-v1:0")
MAX_TOKENS = int(os.getenv("BEDROCK_MAX_TOKENS", "2000"))

bedrock = boto3.client("bedrock-runtime", region_name=AWS_REGION)

FOOTBALL_KNOWLEDGE = """
# 축구 기본 규칙
- 11명 vs 11명, 전반 45분 + 후반 45분 = 90분, 하프타임 15분
- 오프사이드: 공격 선수가 상대 진영에서 볼보다 앞에 있고 수비수 뒤에서 두 번째 선수보다 골라인에 가까울 때
- 페널티킥: 페널티 에어리어 안 수비 파울 시, 직접 프리킥은 바로 골 가능, 간접은 다른 선수 터치 필요
- 옐로카드 경고, 레드카드 퇴장, 옐로 2장 = 퇴장
- VAR: 골, 페널티, 레드카드, 선수 오인 상황에서 사용
- 골킥/코너킥/스로인 규칙

# 포메이션
- 4-3-3: 공격적, 측면 강화 (바르셀로나, 리버풀)
- 4-4-2: 전통적 균형 포메이션
- 3-5-2: 윙백 활용, 미드필드 지배력
- 4-2-3-1: 더블 피봇 수비 + 공격형 미드필더
- 5-3-2: 수비적, 역습 효과적

# 전술
- 티키타카: 짧은 패스 점유율 (펩 과르디올라)
- 게겐프레싱: 볼 로스트 직후 압박 (위르겐 클롭)
- 카운터어택: 수비 후 빠른 전환 공격
- 하이프레스/맨마킹/존 디펜스

# 포지션
- GK(골키퍼), CB(센터백), LB/RB(풀백), CDM(수비형 미드), CM(중앙 미드)
- CAM(공격형 미드), LW/RW(윙어), ST/CF(스트라이커)
"""

SYSTEM_PROMPT = f"""# Role
너는 PLAYGROUND 아마추어 스포츠 플랫폼의 AI 어시스턴트야.
사용자의 팀, 경기 일정, 경기 결과 등 플랫폼 데이터와 축구 지식에 대해 한국어로 친절하게 답변해.

# Task
0. 플랫폼 데이터 질문: [유저 플랫폼 데이터]가 제공되면 팀 정보, 경기 일정, 결과, 팀원 정보에 대해 정확하게 답변.
1. 축구 규칙/전술 질문: 아래 축구 지식을 참고하여 정확하게 답변.
2. 그 외 스포츠/축구 질문: 일반 지식으로 자유롭게 답변.

# Guidelines
- 플랫폼 데이터 질문 시 날짜, 상대팀, 점수 등 구체적 정보를 포함해서 답변
- 전문적이면서도 이해하기 쉽게 친절하게 설명
- 적절한 이모티콘(⚽🏆🥅🟨🟥 등) 활용
- 답변은 간결하게 (불필요하게 길지 않게)

# 축구 지식
{FOOTBALL_KNOWLEDGE}
"""


def build_messages(messages: list, user_context: str = "") -> list:
    """Bedrock Messages API 형식으로 변환"""
    system = SYSTEM_PROMPT
    if user_context:
        system += f"\n\n[유저 플랫폼 데이터]\n{user_context}\n사용자가 팀, 경기, 일정 등을 물어보면 이 데이터를 기반으로 답변해."

    bedrock_messages = []
    for m in messages[-10:]:  # 최근 10개만
        role = "user" if m.get("role") == "user" else "assistant"
        bedrock_messages.append({"role": role, "content": m.get("content", "")})

    # Bedrock는 첫 메시지가 user여야 함
    if bedrock_messages and bedrock_messages[0]["role"] != "user":
        bedrock_messages = bedrock_messages[1:]

    # 연속 같은 role 방지
    cleaned = []
    for msg in bedrock_messages:
        if cleaned and cleaned[-1]["role"] == msg["role"]:
            cleaned[-1]["content"] += "\n" + msg["content"]
        else:
            cleaned.append(msg)

    return system, cleaned


def invoke_bedrock(system: str, messages: list) -> str:
    """Bedrock Claude API 호출"""
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": MAX_TOKENS,
        "temperature": 0.7,
        "system": system,
        "messages": messages,
    }
    response = bedrock.invoke_model(
        modelId=MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=json.dumps(body),
    )
    result = json.loads(response["body"].read())
    return result["content"][0]["text"]


def handler(event, context):
    """Lambda 핸들러 — Function URL 또는 API Gateway 프록시"""
    # CORS preflight
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    }

    # OPTIONS 요청 처리
    method = event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod", "")
    if method == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    # Health check
    path = event.get("rawPath") or event.get("path", "")
    if path.endswith("/health"):
        return {"statusCode": 200, "headers": headers, "body": json.dumps({"status": "healthy"})}

    try:
        body = json.loads(event.get("body", "{}"))
        messages = body.get("messages", [])
        user_context = body.get("userContext", "")

        if not messages:
            return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "messages required"})}

        system, cleaned_msgs = build_messages(messages, user_context)
        reply = invoke_bedrock(system, cleaned_msgs)

        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({"reply": reply}, ensure_ascii=False),
        }
    except Exception as e:
        print(f"[ERROR] {e}")
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": str(e)}, ensure_ascii=False),
        }
