"""
간단한 축구 AI 챗봇 - Bedrock + Tavily 웹검색
"""
import os
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import boto3
from tavily import TavilyClient

app = FastAPI(title="Football AI Chatbot")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Bedrock 설정
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-opus-4-5-20251101-v1:0")
BEDROCK_TEMPERATURE = float(os.getenv("BEDROCK_TEMPERATURE", "0.7"))
BEDROCK_MAX_TOKENS = int(os.getenv("BEDROCK_MAX_TOKENS", "2000"))
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")
tavily = TavilyClient(api_key=TAVILY_API_KEY) if TAVILY_API_KEY and TAVILY_API_KEY != "your-tavily-api-key-here" else None

class ChatRequest(BaseModel):
    messages: List[dict]

class ChatResponse(BaseModel):
    reply: str

def should_search_web(message: str) -> bool:
    """웹 검색이 필요한지 판단"""
    keywords = ["최신", "뉴스", "이적", "순위", "일정", "결과", "선수", "팀", "리그", 
                "월드컵", "챔피언스리그", "프리미어리그", "라리가", "분데스리가",
                "메시", "호날두", "음바페", "손흥민"]
    return any(k in message for k in keywords)

def search_web(query: str) -> str:
    """Tavily로 웹 검색"""
    if not tavily:
        return ""
    
    try:
        results = tavily.search(query, max_results=3)
        if not results or "results" not in results:
            return ""
        
        search_context = "\n\n".join([
            f"[{r.get('title', 'No title')}]({r.get('url', '')})\n{r.get('content', '')}"
            for r in results["results"]
        ])
        return search_context
    except Exception as e:
        print(f"[WEB SEARCH ERROR] {e}")
        return ""

def call_bedrock(messages: List[dict], web_context: str = "") -> str:
    """Bedrock Claude 호출"""
    system_prompt = "너는 축구 전문 AI 어시스턴트야. 축구 관련 질문에 전문적으로 답변하되, 일반적인 질문에도 친절하게 답변해. 한국어로 자연스럽게 답변해."
    
    if web_context:
        system_prompt += f"\n\n[웹 검색 결과]\n{web_context}\n최신 정보를 바탕으로 답변하고, 출처 링크를 포함해."
    
    # Claude 메시지 형식으로 변환
    claude_messages = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "assistant"
        claude_messages.append({
            "role": role,
            "content": msg["content"]
        })
    
    request_body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": BEDROCK_MAX_TOKENS,
        "temperature": BEDROCK_TEMPERATURE,
        "system": system_prompt,
        "messages": claude_messages
    }
    
    response = bedrock.invoke_model(
        modelId=BEDROCK_MODEL_ID,
        body=json.dumps(request_body)
    )
    
    response_body = json.loads(response["body"].read())
    return response_body["content"][0]["text"]

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    """채팅 엔드포인트"""
    last_message = req.messages[-1]["content"]
    
    # 웹 검색 필요 여부 확인
    web_context = ""
    if should_search_web(last_message):
        web_context = search_web(last_message)
    
    # Bedrock 호출
    reply = call_bedrock(req.messages, web_context)
    
    return ChatResponse(reply=reply)

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "football-chatbot"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
