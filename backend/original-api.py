import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

import asyncio
import threading
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import boto3
from botocore.exceptions import ClientError
import uuid
from datetime import datetime
import traceback

from utils import read_video, save_video
from trackers import Tracker
from team_assigner import TeamAssigner
from player_ball_assigner import PlayerBallAssigner
from camera_movement_estimator import CameraMovementEstimator
from view_transformer import ViewTransformer
from speed_and_distance_estimator import SpeedAndDistance_Estimator
from retriever.generate_commentary import generate_commentary
from openai import OpenAI
import json
from typing import List, Optional

coaching_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_coaching(subtitle_data, event_data, ball_control, my_team=None):
    commentary_text = "\n".join([s for s in subtitle_data if s and s.strip()])
    events_text = "\n".join([e for e in event_data if e and e.strip()])
    ball_info = f"팀1 점유율: {ball_control.get('team1', 0)}%, 팀2 점유율: {ball_control.get('team2', 0)}%"

    my_team_instruction = ""
    if my_team:
        other_team = "팀2" if my_team == "팀1" else "팀1"
        my_team_instruction = (
            f"\n\n[중요] 너는 '{my_team}'의 전담 코치야. "
            f"'{my_team}'을 '우리팀', '{other_team}'을 '상대팀'으로 지칭하고, "
            f"우리팀의 승리를 위한 관점에서 분석하고 피드백해야 해. "
            f"우리팀의 장점은 살리고, 약점은 냉철하게 지적하며, 상대팀의 허점을 공략하는 전술을 제시할 것."
        )

    system_prompt = (
        "너는 데이터와 전술 이론에 정통한 '엘리트 축구 감독'이야. "
        "경기 결과뿐만 아니라 팀의 전술적 구조(Structural Analysis)를 해부하고, "
        "포지션별로 책임을 명확히 묻는 엄격한 피드백을 제공해야 해."
        + my_team_instruction +
        "\n\n[분석 지침: 5개 핵심 섹션] 아래 데이터를 바탕으로 다음 순서로 분석을 진행할 것:\n\n"
        "1. 전반적인 전술 구조 분석 (Tactical Setup)\n"
        "공격 형태: 지공/역습의 효율성, 공격 시 선수들의 간격과 대형(Structure)이 적절했는지 분석.\n"
        "수비 형태: 전방 압박의 강도나 수비 블록의 견고함, 상대 전술에 대한 대응력을 평가할 것.\n\n"
        "2. 결정력 및 xG(기대 득점) 분석\n"
        "슈팅의 위치와 질을 평가하고, 기회 창출 대비 득점 전환율이 낮았던 원인을 분석할 것.\n\n"
        "3. 포지션별 1:1 집중 피드백\n"
        "공격진(FW): 박스 안에서의 집중력, 결정적 기회에서의 선택(Shot vs Pass).\n"
        "수비진(DF): 대인 마크 실패 지점, 공간 커버 범위, 라인 조절의 미숙함.\n"
        "골키퍼(GK): 실점 상황의 위치 선정 및 수비진을 지휘하는 리더십(Commanding).\n\n"
        "4. 공수 전환 및 위기 관리 (Transition)\n"
        "공격에서 수비로 전환될 때의 속도와 하프 스페이스(Half-space) 허용 여부를 지적할 것.\n\n"
        "5. 감독의 최종 지시 (The Locker Room)\n"
        "총평: 오늘 전술의 성패를 한 문장으로 요약할 것.\n"
        "지시: 다음 경기 승리를 위해 '전술적 수정 사항'과 '선수단 정신 무장'을 냉철하게 전달할 것."
    )

    user_content = f"[볼 점유율]\n{ball_info}\n\n[AI 중계 내용]\n{commentary_text}\n\n[이벤트 기록]\n{events_text}"

    try:
        response = coaching_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            max_tokens=1500,
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[COACHING GPT ERROR] {e}")
        return "코칭 분석을 생성할 수 없습니다."

app = FastAPI(title="Football Analysis API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# S3 클라이언트 초기화
s3_client = boto3.client('s3')
S3_BUCKET = os.getenv('S3_BUCKET_NAME', 'football-analysis-bucket')

# 마지막 API 활동 시간 기록 (자동 정지용)
LAST_ACTIVITY_FILE = "/tmp/ec2_last_activity"

def touch_activity():
    """API 요청이 올 때마다 마지막 활동 시간 기록"""
    try:
        with open(LAST_ACTIVITY_FILE, "w") as f:
            f.write(str(datetime.now().timestamp()))
    except:
        pass

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest

class ActivityTracker(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        # health check 제외, 실제 API 요청만 추적
        if request.url.path not in ["/health", "/", "/docs", "/openapi.json"]:
            touch_activity()
        return await call_next(request)

app.add_middleware(ActivityTracker)

# 작업 상태 저장 (메모리)
jobs = {}

class AnalyzeRequest(BaseModel):
    video_s3_key: str

class AnalyzeResponse(BaseModel):
    status: str
    output_video_url: str
    events: list
    team_ball_control: dict = {}
    message: str

def analyze_video(input_path: str, output_path: str, job_id: str = None):
    """영상 분석 메인 로직"""
    vector_store_path = os.path.abspath(
        os.path.join("commentary_ai", "generator", "vector_store.pkl")
    )

    video_frames = read_video(input_path)
    total_frames = len(video_frames)
    
    # 진행 상황 초기화
    if job_id and job_id in jobs:
        jobs[job_id]["total_frames"] = total_frames
        jobs[job_id]["current_frame"] = 0
        jobs[job_id]["progress_percent"] = 0
        jobs[job_id]["progress_stage"] = "초기화"

    # 480p 리사이즈로 YOLO 처리 속도 향상
    import cv2
    if video_frames and video_frames[0].shape[0] > 720:
        h, w = video_frames[0].shape[:2]
        new_h = 720
        new_w = int(w * (new_h / h))
        video_frames = [cv2.resize(f, (new_w, new_h)) for f in video_frames]
        print(f"[RESIZE] {w}x{h} → {new_w}x{new_h} ({len(video_frames)} frames)")

    # 1단계: 선수 추적 (0-30%)
    if job_id and job_id in jobs:
        jobs[job_id]["progress_stage"] = "선수 추적중"
        jobs[job_id]["progress_percent"] = 5
    
    tracker = Tracker('models/best.pt')
    tracks = tracker.get_object_tracks(video_frames, read_from_stub=False, stub_path=None)
    tracker.add_positions_to_tracks(tracks)
    
    if job_id and job_id in jobs:
        jobs[job_id]["progress_percent"] = 30

    # 2단계: 카메라 움직임 분석 (30-40%)
    if job_id and job_id in jobs:
        jobs[job_id]["progress_stage"] = "카메라 움직임 분석중"
        jobs[job_id]["progress_percent"] = 30
    
    camera_movement_estimator = CameraMovementEstimator(video_frames[0])
    camera_movement_per_frame = camera_movement_estimator.get_camera_movement(
        video_frames, read_from_stub=False, stub_path=None
    )
    camera_movement_estimator.add_adjust_positions_to_tracks(tracks, camera_movement_per_frame)
    
    if job_id and job_id in jobs:
        jobs[job_id]["progress_percent"] = 40

    # 3단계: 좌표 변환 및 속도 계산 (40-50%)
    if job_id and job_id in jobs:
        jobs[job_id]["progress_stage"] = "좌표 변환중"
        jobs[job_id]["progress_percent"] = 40
    
    view_transformer = ViewTransformer()
    view_transformer.add_transformed_position_to_tracks(tracks)

    tracks["ball"] = tracker.interpolate_ball_positions(tracks["ball"])

    speed_and_distance_estimator = SpeedAndDistance_Estimator()
    speed_and_distance_estimator.add_speed_and_distance_to_tracks(tracks)
    
    if job_id and job_id in jobs:
        jobs[job_id]["progress_percent"] = 50

    # 4단계: 팀 배정 (50-55%)
    if job_id and job_id in jobs:
        jobs[job_id]["progress_stage"] = "팀 분석중"
        jobs[job_id]["progress_percent"] = 50
    
    team_assigner = TeamAssigner()
    team_assigner.assign_team_color(video_frames[0], tracks['players'][0])
    for frame_num, player_track in enumerate(tracks['players']):
        for player_id, track in player_track.items():
            team = team_assigner.get_player_team(video_frames[frame_num], track['bbox'], player_id)
            tracks['players'][frame_num][player_id]['team'] = team
            tracks['players'][frame_num][player_id]['team_color'] = team_assigner.team_colors[team]
    
    if job_id and job_id in jobs:
        jobs[job_id]["progress_percent"] = 55

    # 5단계: 이벤트 감지 (55-85%)
    if job_id and job_id in jobs:
        jobs[job_id]["progress_stage"] = "이벤트 감지중"
        jobs[job_id]["progress_percent"] = 55
    
    player_assigner = PlayerBallAssigner()
    team_ball_control = []
    previous_player_with_ball = -1
    previous_team_with_ball = None

    subtitle_data = []
    event_data = []
    
    # 총 프레임 수 (이벤트 감지 진행률 계산용)
    total_player_frames = len(tracks['players'])
    events_list = []

    for frame_num, player_track in enumerate(tracks['players']):
        # 프레임별 진행률 업데이트 (55% → 85%)
        if job_id and job_id in jobs and total_player_frames > 0:
            jobs[job_id]["current_frame"] = frame_num
            frame_progress = int(55 + (frame_num / total_player_frames) * 30)
            jobs[job_id]["progress_percent"] = frame_progress
        
        ball_bbox = tracks['ball'][frame_num][1]['bbox']
        ball_speed = tracks['ball'][frame_num].get('speed', 0)
        assigned_player = player_assigner.assign_ball_to_player(player_track, ball_bbox)

        if assigned_player != -1:
            tracks['players'][frame_num][assigned_player]['has_ball'] = True
            current_team_with_ball = tracks['players'][frame_num][assigned_player]['team']
            tracker.update_ball_owner(assigned_player, current_team_with_ball)
            team_ball_control.append(current_team_with_ball)
        else:
            current_team_with_ball = previous_team_with_ball

        event_texts = []

        if previous_player_with_ball != -1 and assigned_player != previous_player_with_ball:
            if assigned_player != -1:
                event_text = f"패스 성공! 플레이어 {previous_player_with_ball} ➡ 플레이어 {assigned_player}"
                event_texts.append(event_text)
                events_list.append({"frame": frame_num, "type": "pass", "description": event_text})
        elif assigned_player != -1:
            speed = tracks['players'][frame_num][assigned_player].get('speed', 0)
            if speed > 1.5:
                event_text = f"플레이어 {assigned_player}이 드리블 중입니다."
                event_texts.append(event_text)

        if previous_team_with_ball is not None and current_team_with_ball != previous_team_with_ball:
            event_text = "태클 성공! 상대 팀이 볼을 차단했습니다."
            event_texts.append(event_text)
            events_list.append({"frame": frame_num, "type": "tackle", "description": event_text})

        if ball_speed > 8:
            event_text = "슛! 볼이 빠른 속도로 움직입니다."
            event_texts.append(event_text)
            events_list.append({"frame": frame_num, "type": "shot", "description": event_text})

        goal_area = ((100, 50), (200, 100))
        if goal_area[0][0] < ball_bbox[0] < goal_area[1][0] and goal_area[0][1] < ball_bbox[1] < goal_area[1][1]:
            event_text = "골! 볼이 골대에 들어갔습니다!"
            event_texts.append(event_text)
            events_list.append({"frame": frame_num, "type": "goal", "description": event_text})

        event_text = "\n".join(event_texts)
        event_data.append(event_text)

        if assigned_player != -1:
            speed = tracks['players'][frame_num][assigned_player].get('speed', 0)
        else:
            speed = 0

        if frame_num % 48 == 0:
            # 24fps 기준으로 시간 계산 (48프레임 = 2초)
            seconds = frame_num / 24
            query = (
                f"프레임 {frame_num}에서, "
                f"플레이어 {assigned_player}은(는) 속도 {speed:.2f}로 이동 중이며, "
                f"볼의 속도는 {ball_speed:.2f}입니다. "
                f"현재 볼 소유 팀은 {current_team_with_ball}이고, "
                f"볼의 위치는 {ball_bbox}입니다. "
                f"이 상황에 대해 해설해주세요."
            )

            subtitle_text = generate_commentary(query, vector_store_path)
            subtitle_data.append({
                "frame": frame_num,
                "time": seconds,
                "text": subtitle_text
            })
            
            # 실시간으로 jobs에 추가
            if job_id and job_id in jobs:
                jobs[job_id]["partial_subtitles"] = subtitle_data.copy()

        previous_player_with_ball = assigned_player
        previous_team_with_ball = current_team_with_ball

    # 6단계: 영상 렌더링 (85-95%)
    if job_id and job_id in jobs:
        jobs[job_id]["progress_stage"] = "영상 렌더링중"
        jobs[job_id]["progress_percent"] = 85
    
    output_video_frames = tracker.draw_annotations(video_frames, tracks, team_ball_control)
    save_video(output_video_frames, output_path)
    
    if job_id and job_id in jobs:
        jobs[job_id]["progress_percent"] = 95

    # 7단계: 최종 처리 (95-100%)
    if job_id and job_id in jobs:
        jobs[job_id]["progress_stage"] = "최종 처리중"
        jobs[job_id]["progress_percent"] = 95
    
    import subprocess
    h264_path = output_path.replace(".mp4", "_h264.mp4")
    subprocess.run(["ffmpeg", "-y", "-i", output_path, "-vcodec", "libx264", "-acodec", "aac", h264_path], capture_output=True)
    import shutil
    shutil.move(h264_path, output_path)

    import numpy as np
    tc = np.array(team_ball_control)
    t1 = int(np.sum(tc == 1))
    t2 = int(np.sum(tc == 2))
    total = t1 + t2
    ball_control = {"team1": round(t1/total*100, 1) if total > 0 else 50.0, "team2": round(t2/total*100, 1) if total > 0 else 50.0}

    # BGR → RGB 변환 (OpenCV는 BGR, 프론트는 RGB)
    team_colors_rgb = {}
    for team_id, color in team_assigner.team_colors.items():
        team_colors_rgb[str(team_id)] = [int(color[2]), int(color[1]), int(color[0])]

    if job_id and job_id in jobs:
        jobs[job_id]["progress_percent"] = 100
        jobs[job_id]["current_frame"] = total_player_frames

    return events_list, ball_control, subtitle_data, event_data, team_colors_rgb


def run_analysis_job(job_id, s3_key):
    """백그라운드에서 분석 실행"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    input_local_path = f"/tmp/input_{job_id}.mp4"
    output_local_path = f"/tmp/output_{job_id}.mp4"

    try:
        jobs[job_id]["status"] = "downloading"
        print(f"[{job_id}] Downloading video from S3: {s3_key}")
        s3_client.download_file(S3_BUCKET, s3_key, input_local_path)

        jobs[job_id]["status"] = "analyzing"
        print(f"[{job_id}] Starting analysis...")
        events, ball_control, subtitles, event_texts, team_colors = analyze_video(input_local_path, output_local_path, job_id)

        jobs[job_id]["status"] = "uploading"
        output_s3_key = f"outputs/analyzed_{timestamp}_{job_id}.mp4"
        print(f"[{job_id}] Uploading result to S3: {output_s3_key}")
        s3_client.upload_file(output_local_path, S3_BUCKET, output_s3_key)

        output_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET, 'Key': output_s3_key},
            ExpiresIn=604800
        )

        print(f"[{job_id}] Generating coaching analysis...")
        coaching = generate_coaching(subtitles, event_texts, ball_control)

        jobs[job_id]["status"] = "done"
        jobs[job_id]["result"] = {
            "output_video_url": output_url,
            "events": events,
            "team_ball_control": ball_control,
            "subtitles": subtitles,
            "event_texts": event_texts,
            "coaching": coaching,
            "team_colors": team_colors,
        }
        print(f"[{job_id}] Analysis completed successfully")

    except Exception as e:
        print(f"[{job_id}] Analysis Error: {str(e)}")
        print(traceback.format_exc())
        jobs[job_id]["status"] = "error"
        
        # 실패 시 어느 프레임에서 실패했는지 포함
        current_frame = jobs[job_id].get("current_frame", 0)
        total_frames = jobs[job_id].get("total_frames", 0)
        progress_stage = jobs[job_id].get("progress_stage", "알 수 없음")
        
        error_msg = f"{str(e)}"
        if total_frames > 0:
            error_msg += f" (진행: {current_frame}/{total_frames} 프레임, 단계: {progress_stage})"
        
        jobs[job_id]["error"] = error_msg
    finally:
        for path in [input_local_path, output_local_path]:
            if os.path.exists(path):
                os.remove(path)


@app.get("/")
async def root():
    return {"message": "Football Analysis API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/api/analyze")
async def analyze_endpoint(request: AnalyzeRequest):
    """분석 요청 → 즉시 jobId 반환 (비동기)"""
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "queued",
        "created_at": datetime.now().isoformat(),
        "s3_key": request.video_s3_key,
        "result": None,
        "error": None,
    }

    # 백그라운드 스레드에서 분석 실행
    thread = threading.Thread(target=run_analysis_job, args=(job_id, request.video_s3_key))
    thread.daemon = True
    thread.start()

    return {"jobId": job_id, "status": "queued", "message": "분석이 시작되었습니다"}


@app.get("/api/status/{job_id}")
async def get_job_status(job_id: str):
    """작업 상태 폴링"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")

    job = jobs[job_id]

    if job["status"] == "done":
        return {
            "status": "done",
            "result": job["result"],
        }
    elif job["status"] == "error":
        return {
            "status": "error",
            "error": job["error"],
        }
    else:
        # 분석 중에도 현재까지 생성된 subtitles와 진행률 반환
        partial_subtitles = job.get("partial_subtitles", [])
        progress_info = {
            "status": job["status"],
            "message": "분석 진행 중...",
            "partial_subtitles": partial_subtitles,
            "progress_percent": job.get("progress_percent", 0),
            "progress_stage": job.get("progress_stage", "대기중"),
            "current_frame": job.get("current_frame", 0),
            "total_frames": job.get("total_frames", 0),
        }
        return progress_info


@app.post("/api/coaching")
async def coaching_endpoint(request: dict):
    subtitles = request.get("subtitles", [])
    event_texts = request.get("event_texts", [])
    ball_control = request.get("ball_control", {})
    my_team = request.get("my_team", None)
    coaching = generate_coaching(subtitles, event_texts, ball_control, my_team)
    return {"coaching": coaching}


@app.get("/api/presigned-upload-url")
async def get_presigned_upload_url(filename: str):
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        s3_key = f"uploads/{timestamp}_{filename}"
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': S3_BUCKET,
                'Key': s3_key,
                'ContentType': 'video/mp4'
            },
            ExpiresIn=3600
        )
        return {"upload_url": presigned_url, "s3_key": s3_key}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate presigned URL: {str(e)}")


# ═══════════════════════════════════════════
# LangGraph 기반 AI 챗봇
# ═══════════════════════════════════════════
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, START, END
from typing import TypedDict

chat_llm = ChatOpenAI(
    model=os.getenv("CHATBOT_MODEL_ID", "gpt-4o-mini"),
    temperature=0.7,
    max_tokens=800,
)
chat_embeddings = OpenAIEmbeddings(model=os.getenv("EMBEDDING_MODEL_ID", "text-embedding-3-small"))

VECTOR_STORE_PATH = os.path.join(os.path.dirname(__file__), "football_knowledge")
FOOTBALL_RULES_PDF = os.path.join(os.path.dirname(__file__), "football_rules.pdf")
vectorstore = None
chat_graph = None
analysis_store = {}  # 분석 결과 저장

def load_football_knowledge_from_pdf():
    """FIFA 24/25 Laws of the Game PDF에서 텍스트 추출"""
    from langchain_community.document_loaders import PyPDFLoader
    print(f"[CHATBOT] Loading PDF: {FOOTBALL_RULES_PDF}")
    loader = PyPDFLoader(FOOTBALL_RULES_PDF)
    pages = loader.load()
    print(f"[CHATBOT] Loaded {len(pages)} pages from PDF")
    return pages

class ChatState(TypedDict):
    messages: list
    context: str
    analysis_data: str
    response: str

def classify_intent(state: ChatState) -> ChatState:
    last_msg = state["messages"][-1]["content"]
    if state["analysis_data"]:
        return state
    keywords = ["규칙", "전술", "포메이션", "오프사이드", "페널티", "포지션", "훈련",
                "카드", "VAR", "티키타카", "게겐프레싱", "역습", "프리킥", "코너킥",
                "수비", "공격", "미드필더", "골키퍼", "윙어", "스트라이커", "풀백", "센터백"]
    if any(k in last_msg for k in keywords):
        state["context"] = "rag"
    return state

def retrieve_knowledge(state: ChatState) -> ChatState:
    if state["context"] != "rag" or not vectorstore:
        return state
    last_msg = state["messages"][-1]["content"]
    docs = vectorstore.similarity_search(last_msg, k=3)
    state["context"] = "\n".join([d.page_content for d in docs])
    return state

def generate_chat_response(state: ChatState) -> ChatState:
    system_parts = [
        "너는 축구 전문 AI 어시스턴트야. 한국어로 친절하고 전문적으로 답변해. 답변은 간결하되 핵심을 놓치지 마."
    ]
    if state["analysis_data"]:
        system_parts.append(f"\n[경기 분석 데이터]\n{state['analysis_data']}\n이 데이터를 참고하여 경기에 대한 질문에 답변해.")
    if state["context"] and state["context"] != "rag":
        system_parts.append(f"\n[참고 자료]\n{state['context']}\n이 자료를 바탕으로 답변해.")

    msgs = [SystemMessage(content="\n".join(system_parts))]
    for m in state["messages"]:
        if m["role"] == "user":
            msgs.append(HumanMessage(content=m["content"]))
        else:
            msgs.append(AIMessage(content=m["content"]))
    result = chat_llm.invoke(msgs)
    state["response"] = result.content
    return state

def init_chatbot():
    global vectorstore, chat_graph
    try:
        print("[CHATBOT] Initializing...")
        if os.path.exists(VECTOR_STORE_PATH):
            vectorstore = FAISS.load_local(VECTOR_STORE_PATH, chat_embeddings, allow_dangerous_deserialization=True)
            print("[CHATBOT] Loaded vectorstore from disk")
        else:
            print("[CHATBOT] Building vectorstore from FIFA rules PDF...")
            pages = load_football_knowledge_from_pdf()
            splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            chunks = splitter.split_documents(pages)
            print(f"[CHATBOT] Split into {len(chunks)} chunks, creating embeddings...")
            vectorstore = FAISS.from_documents(chunks, chat_embeddings)
            vectorstore.save_local(VECTOR_STORE_PATH)
            print("[CHATBOT] Created and saved vectorstore")

        graph = StateGraph(ChatState)
        graph.add_node("classify", classify_intent)
        graph.add_node("retrieve", retrieve_knowledge)
        graph.add_node("generate", generate_chat_response)
        graph.add_edge(START, "classify")
        graph.add_edge("classify", "retrieve")
        graph.add_edge("retrieve", "generate")
        graph.add_edge("generate", END)
        chat_graph = graph.compile()
        print("[CHATBOT] LangGraph ready")
    except Exception as e:
        print(f"[CHATBOT] Init error: {e}")
        import traceback
        traceback.print_exc()


@app.on_event("startup")
async def startup_event():
    # 백그라운드 스레드에서 챗봇 초기화 (서버 시작 차단 방지)
    thread = threading.Thread(target=init_chatbot, daemon=True)
    thread.start()
    # 서버 시작 시 활동 기록
    touch_activity()

@app.post("/api/chat")
async def chat_endpoint(request: dict):
    messages = request.get("messages", [])
    analysis_id = request.get("analysis_id")
    if not messages:
        raise HTTPException(status_code=400, detail="messages 필요")

    if not chat_graph:
        raise HTTPException(status_code=503, detail="챗봇 초기화 중")

    analysis_data = ""
    if analysis_id and analysis_id in analysis_store:
        analysis_data = json.dumps(analysis_store[analysis_id], ensure_ascii=False)

    state = {"messages": messages, "context": "", "analysis_data": analysis_data, "response": ""}
    result = chat_graph.invoke(state)
    return {"reply": result["response"]}

@app.post("/api/chat/analysis")
async def store_analysis_for_chat(request: dict):
    analysis_id = request.get("analysis_id", "latest")
    analysis_store[analysis_id] = {
        "events": request.get("events", []),
        "team_ball_control": request.get("team_ball_control", {}),
        "coaching": request.get("coaching", ""),
    }
    return {"status": "ok", "analysis_id": analysis_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
