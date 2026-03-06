"""
LangGraph 기반 축구 AI 챗봇 서버
- 축구 규칙/전술 RAG (FAISS 벡터스토어)
- 경기 분석 결과 기반 대화
"""
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from langchain_aws import ChatBedrock, BedrockEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Annotated
import operator
import json
import boto3

# Load environment variables
load_dotenv()

app = FastAPI(title="Football AI Chatbot")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Bedrock Configuration
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-opus-4-5-20251101-v1:0")
BEDROCK_EMBEDDING_MODEL_ID = os.getenv("BEDROCK_EMBEDDING_MODEL_ID", "amazon.titan-embed-text-v2:0")
BEDROCK_TEMPERATURE = float(os.getenv("BEDROCK_TEMPERATURE", "0.7"))
BEDROCK_MAX_TOKENS = int(os.getenv("BEDROCK_MAX_TOKENS", "2000"))

bedrock_runtime = boto3.client(
    service_name="bedrock-runtime",
    region_name=AWS_REGION
)

llm = ChatBedrock(
    model_id=BEDROCK_MODEL_ID,
    client=bedrock_runtime,
    model_kwargs={"temperature": BEDROCK_TEMPERATURE, "max_tokens": BEDROCK_MAX_TOKENS}
)

# Bedrock Embeddings
from langchain_aws import BedrockEmbeddings
embeddings = BedrockEmbeddings(
    client=bedrock_runtime,
    model_id=BEDROCK_EMBEDDING_MODEL_ID
)

# Tavily Search Tool
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
web_search = None
if TAVILY_API_KEY and TAVILY_API_KEY != "your-tavily-api-key-here":
    web_search = TavilySearchResults(api_key=TAVILY_API_KEY, max_results=3)

# ─── 축구 지식 벡터스토어 ───
VECTOR_STORE_PATH = os.path.join(os.path.dirname(__file__), "football_knowledge")
vectorstore = None

def init_vectorstore():
    global vectorstore
    if os.path.exists(VECTOR_STORE_PATH):
        vectorstore = FAISS.load_local(VECTOR_STORE_PATH, embeddings, allow_dangerous_deserialization=True)
        print(f"[VECTORSTORE] Loaded from {VECTOR_STORE_PATH}")
    else:
        # 초기 축구 지식 데이터로 생성
        docs = get_football_knowledge()
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = splitter.create_documents(docs)
        vectorstore = FAISS.from_documents(chunks, embeddings)
        vectorstore.save_local(VECTOR_STORE_PATH)
        print(f"[VECTORSTORE] Created and saved to {VECTOR_STORE_PATH}")

def get_football_knowledge():
    return [
        # 기본 규칙
        "축구는 11명으로 구성된 두 팀이 경기하며, 전반 45분 후반 45분 총 90분 경기한다. 하프타임은 15분이다.",
        "오프사이드: 공격 선수가 상대 진영에서 볼보다 앞에 있고, 상대 수비수 뒤에서 두 번째 선수보다 골라인에 가까이 있을 때 오프사이드다.",
        "페널티킥: 페널티 에어리어 안에서 수비팀이 파울을 범하면 페널티킥이 주어진다. 페널티 마크에서 골키퍼와 1대1로 차는 킥이다.",
        "프리킥: 직접 프리킥은 바로 골을 넣을 수 있고, 간접 프리킥은 다른 선수가 터치해야 골이 인정된다.",
        "옐로카드는 경고, 레드카드는 퇴장이다. 한 경기에서 옐로카드 2장을 받으면 퇴장된다.",
        "VAR(비디오 판독)은 골, 페널티, 레드카드, 선수 오인 상황에서 사용된다.",
        "골킥은 공이 골라인을 넘어갔을 때 수비팀이 차는 킥이다. 코너킥은 수비팀이 마지막으로 터치한 공이 골라인을 넘었을 때 공격팀에게 주어진다.",
        "스로인은 공이 터치라인을 넘었을 때 마지막으로 터치하지 않은 팀이 양손으로 머리 위에서 던진다.",
        # 포메이션
        "4-3-3 포메이션: 수비수 4명, 미드필더 3명, 공격수 3명. 공격적이며 측면 공격에 강하다. 바르셀로나, 리버풀이 자주 사용한다.",
        "4-4-2 포메이션: 가장 전통적인 포메이션. 균형 잡힌 공수 밸런스. 중앙 미드필드가 넓어 수비 안정성이 높다.",
        "3-5-2 포메이션: 수비수 3명, 미드필더 5명, 공격수 2명. 윙백이 공수를 오가며 측면을 담당한다. 미드필드 지배력이 높다.",
        "4-2-3-1 포메이션: 더블 피봇(수비형 미드필더 2명)으로 수비 안정성을 확보하면서 공격형 미드필더 1명이 창의적 플레이를 담당한다.",
        "5-3-2 포메이션: 수비적 포메이션. 3명의 센터백과 2명의 윙백으로 수비를 견고하게 한다. 역습에 효과적이다.",
        # 전술
        "티키타카: 짧은 패스를 빠르게 연결하며 점유율을 높이는 전술. 바르셀로나의 펩 과르디올라 감독이 대표적이다.",
        "게겐프레싱: 볼을 잃은 직후 즉시 전방에서 압박하여 볼을 되찾는 전술. 위르겐 클롭 감독의 리버풀이 대표적이다.",
        "카운터어택(역습): 수비적으로 진영을 낮추고 볼을 빼앗은 후 빠른 전환으로 공격하는 전술. 빠른 공격수가 핵심이다.",
        "하이프레스: 상대 진영 높은 곳에서부터 압박하여 빌드업을 방해하는 전술. 체력 소모가 크지만 효과적이다.",
        "맨마킹: 특정 상대 선수를 1대1로 밀착 마크하는 수비 전술. 존 디펜스와 대비된다.",
        "존 디펜스: 선수가 특정 구역을 담당하여 수비하는 전술. 조직적인 수비가 가능하지만 구역 사이 공간이 약점이다.",
        # 포지션
        "골키퍼(GK): 골대를 지키는 포지션. 현대 축구에서는 발로 빌드업에 참여하는 능력도 중요하다.",
        "센터백(CB): 중앙 수비수. 공중볼 경합, 태클, 위치 선정이 핵심 능력이다.",
        "풀백(LB/RB): 측면 수비수. 현대 축구에서는 공격 가담과 크로스 능력도 요구된다.",
        "수비형 미드필더(CDM): 수비와 미드필드를 연결하는 포지션. 볼 탈취와 패스 배급이 핵심이다.",
        "중앙 미드필더(CM): 경기의 템포를 조절하고 공수 연결을 담당한다. 박스투박스 미드필더는 공수 모두 활발히 참여한다.",
        "공격형 미드필더(CAM): 공격의 창의성을 담당. 킬패스, 드리블, 슈팅 능력이 중요하다.",
        "윙어(LW/RW): 측면 공격수. 드리블과 속도로 수비를 돌파하고 크로스나 컷인 슈팅을 한다.",
        "스트라이커(ST/CF): 최전방 공격수. 골 결정력이 가장 중요한 포지션이다.",
        # 훈련
        "론도 훈련: 원 안에서 패스를 돌리며 가운데 수비수가 빼앗는 훈련. 패스 정확도와 판단력을 기른다.",
        "슈팅 훈련: 다양한 각도와 거리에서 슈팅 연습. 인스텝킥, 인사이드킥, 발리슛 등을 반복한다.",
        "체력 훈련: 인터벌 러닝, 셔틀런, 서킷 트레이닝 등으로 90분 경기를 뛸 수 있는 체력을 만든다.",
        "세트피스 훈련: 코너킥, 프리킥 상황에서의 공격/수비 패턴을 반복 연습한다.",
    ]

# ─── 분석 결과 저장소 (메모리) ───
analysis_results = {}

class ChatRequest(BaseModel):
    messages: List[dict]
    analysis_id: Optional[str] = None  # 경기 분석 결과 ID

class ChatResponse(BaseModel):
    reply: str

# ─── LangGraph State ───
class ChatState(TypedDict):
    messages: list
    context: str
    analysis_data: str
    web_search_results: str
    response: str

# ─── LangGraph 노드 ───
def classify_intent(state: ChatState) -> ChatState:
    """사용자 의도 분류: RAG 검색, 웹 검색, 일반 대화 판단"""
    last_msg = state["messages"][-1]["content"]
    
    # 분석 데이터가 있으면 분석 기반 대화
    if state["analysis_data"]:
        return state
    
    # 웹 검색이 필요한 키워드 (최신 정보, 선수, 팀, 리그 등)
    web_keywords = ["최신", "뉴스", "이적", "순위", "일정", "결과", "선수", "팀", "리그", 
                    "월드컵", "챔피언스리그", "프리미어리그", "라리가", "분데스리가", "세리에",
                    "메시", "호날두", "음바페", "손흥민", "토트넘", "맨시티", "레알", "바르셀로나"]
    if web_search and any(k in last_msg for k in web_keywords):
        state["context"] = "web"
        return state
    
    # 축구 규칙/전술 관련 키워드 체크
    rag_keywords = ["규칙", "전술", "포메이션", "오프사이드", "페널티", "포지션", "훈련", "카드", "VAR",
                    "티키타카", "게겐프레싱", "역습", "프리킥", "코너킥", "골킥", "스로인",
                    "수비", "공격", "미드필더", "골키퍼", "윙어", "스트라이커", "풀백", "센터백"]
    if any(k in last_msg for k in rag_keywords):
        state["context"] = "rag"
    
    return state

def search_web(state: ChatState) -> ChatState:
    """웹 검색 수행"""
    if state["context"] != "web" or not web_search:
        return state
    
    last_msg = state["messages"][-1]["content"]
    try:
        results = web_search.invoke(last_msg)
        search_context = "\n\n".join([
            f"[{r.get('title', 'No title')}]({r.get('url', '')})\n{r.get('content', '')}"
            for r in results
        ])
        state["web_search_results"] = search_context
    except Exception as e:
        print(f"[WEB SEARCH ERROR] {e}")
        state["web_search_results"] = ""
    
    return state

def retrieve_knowledge(state: ChatState) -> ChatState:
    """벡터스토어에서 관련 축구 지식 검색"""
    if state["context"] != "rag" or not vectorstore:
        return state
    last_msg = state["messages"][-1]["content"]
    docs = vectorstore.similarity_search(last_msg, k=3)
    knowledge = "\n".join([d.page_content for d in docs])
    state["context"] = knowledge
    return state

def generate_response(state: ChatState) -> ChatState:
    """LLM으로 응답 생성"""
    system_parts = [
        "# Role\n"
        "너는 축구 전문 AI 어시스턴트야. 축구에 관한 모든 주제(규칙, 전술, 선수, 리그, 월드컵, 이적, 역사 등)에 대해 한국어로 친절하고 전문적으로 답변해.\n\n"
        "# Task\n"
        "1. 축구 규칙/판정 관련 질문: 제공된 [Context]의 축구 규칙 데이터(FIFA Laws of the Game)를 최우선으로 참고하여 정확하게 답변한다.\n"
        "   - 규칙이 모호한 상황에서는 IFAB 가이드라인에 따라 '심판의 재량'임을 언급하되, 판단 근거가 되는 규칙 조항을 설명한다.\n"
        "   - 최신 개정 사항(예: 핸드볼 규정 변화, 오프사이드 판정 기준 등)이 있다면 강조해서 설명한다.\n"
        "2. 그 외 축구 관련 질문(선수, 리그, 월드컵, 전술, 이적 등): 너의 일반 지식을 활용하여 자유롭게 답변한다.\n\n"
        "# Guidelines\n"
        "- 규칙 질문 시 [Context]가 제공되면 이를 최우선으로 한다.\n"
        "- 규칙 번호(예: 제12조 반칙과 불법 행위)를 명시하고, 불렛 포인트를 사용하여 깔끔하게 정리한다.\n"
        "- 전문적이면서도 축구 팬들이 이해하기 쉽게 친절하게 설명한다.\n"
        "- 특정 팀에 대한 편향된 판정 의견을 내지 않는다.\n"
        "- 답변에 적절한 이모티콘(⚽🏆🥅🟨🟥🏟️👟💪🎯📋 등)을 활용하여 가독성과 재미를 높인다.\n\n"
        "# Output Format\n"
        "규칙/판정 관련 질문일 경우 아래 형식을 사용한다:\n\n"
        "### 📢 판정 가이드\n"
        "> (핵심 결론 한 줄 요약)\n\n"
        "---\n\n"
        "### 📖 관련 규칙: 제OO조 (규칙 이름)\n"
        "* **핵심 내용**: (규칙의 핵심 문구 요약)\n"
        "* **판단 근거**: (왜 이런 판정이 나왔는지 설명)\n\n"
        "### 💡 심판의 팁 (상황 예시)\n"
        "* (실제 경기 상황을 예로 들어 짧게 설명)\n\n"
        "그 외 일반 축구 질문에는 자유로운 형식으로 답변한다."
    ]

    if state["analysis_data"]:
        system_parts.append(f"\n[경기 분석 데이터]\n{state['analysis_data']}\n이 데이터를 참고하여 경기에 대한 질문에 답변해.")

<<<<<<< HEAD
    if state["context"] and state["context"] != "rag":
        system_parts.append(f"\n[Context]\n{state['context']}")
=======
    if state.get("web_search_results"):
        system_parts.append(f"\n[웹 검색 결과]\n{state['web_search_results']}\n최신 정보를 바탕으로 답변하고, 출처 링크를 포함해.")

    if state["context"] and state["context"] not in ["rag", "web"]:
        system_parts.append(f"\n[참고 자료]\n{state['context']}\n이 자료를 바탕으로 답변해.")
>>>>>>> 3a56648fe97aabd89a299735a258b59d57fcf981

    msgs = [SystemMessage(content="\n".join(system_parts))]
    for m in state["messages"]:
        if m["role"] == "user":
            msgs.append(HumanMessage(content=m["content"]))
        else:
            msgs.append(AIMessage(content=m["content"]))

    result = llm.invoke(msgs)
    state["response"] = result.content
    return state

# ─── LangGraph 빌드 ───
def build_graph():
    graph = StateGraph(ChatState)
    graph.add_node("classify", classify_intent)
    graph.add_node("web_search", search_web)
    graph.add_node("retrieve", retrieve_knowledge)
    graph.add_node("generate", generate_response)
    graph.add_edge(START, "classify")
    graph.add_edge("classify", "web_search")
    graph.add_edge("web_search", "retrieve")
    graph.add_edge("retrieve", "generate")
    graph.add_edge("generate", END)
    graph.add_edge(START, "classify")
    graph.add_edge("classify", "web_search")
    graph.add_edge("web_search", "retrieve")
    graph.add_edge("retrieve", "generate")
    graph.add_edge("generate", END)
    return graph.compile()

chat_graph = None

@app.on_event("startup")
async def startup():
    global chat_graph
    init_vectorstore()
    chat_graph = build_graph()
    print("[CHATBOT] LangGraph ready")

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    # 분석 데이터 가져오기
    analysis_data = ""
    if req.analysis_id and req.analysis_id in analysis_results:
        analysis_data = json.dumps(analysis_results[req.analysis_id], ensure_ascii=False)

    state = {
        "messages": req.messages,
        "context": "",
        "analysis_data": analysis_data,
        "web_search_results": "",
        "response": "",
    }
    result = chat_graph.invoke(state)
    return ChatResponse(reply=result["response"])

@app.post("/api/chat/analysis")
async def store_analysis(data: dict):
    """경기 분석 결과를 챗봇에 저장 (프론트에서 분석 완료 후 호출)"""
    analysis_id = data.get("analysis_id", "latest")
    analysis_results[analysis_id] = {
        "events": data.get("events", []),
        "team_ball_control": data.get("team_ball_control", {}),
        "coaching": data.get("coaching", ""),
        "subtitles": data.get("subtitles", []),
    }
    return {"status": "ok", "analysis_id": analysis_id}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "football-chatbot"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
