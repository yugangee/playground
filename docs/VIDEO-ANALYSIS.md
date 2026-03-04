# 영상분석 시스템 코드 분석

## 개요

EC2(`ubuntu@34.236.216.122`)에서 FastAPI 서버로 운영되는 축구 영상 AI 분석 시스템.
YOLO 객체 감지 + 커스텀 트래킹 + RAG 기반 AI 해설을 결합하여, 업로드된 축구 영상을 자동 분석하고 시각화된 결과 영상을 생성한다.

## 아키텍처

```
프론트엔드 (fun.sedaily.ai/video)
    ↓
CloudFront (d2e8khynpnbcpl.cloudfront.net)
    ↓
EC2:8000 (uvicorn api:app)
    ↕
S3 (football-analysis-bucket)
  ├── uploads/    ← 입력 영상
  └── outputs/    ← 분석 결과 영상
```

- 서버: `uvicorn api:app --host 0.0.0.0 --port 8000`
- 프레임워크: FastAPI
- 비동기 처리: `threading.Thread` (백그라운드 분석)
- 영상 저장: S3 presigned URL (업로드 1시간, 다운로드 7일 유효)

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 |
| GET | `/api/presigned-upload-url?filename=` | S3 업로드용 presigned URL 발급 |
| POST | `/api/analyze` | 분석 시작 → jobId 즉시 반환 (비동기) |
| GET | `/api/status/{job_id}` | 작업 상태 폴링 |

### 작업 상태 흐름

```
queued → downloading → analyzing → uploading → done
                                              → error
```

### 요청/응답 예시

```json
// POST /api/analyze
{ "video_s3_key": "uploads/20260223_video.mp4" }

// 응답
{ "jobId": "uuid", "status": "queued", "message": "분석이 시작되었습니다" }

// GET /api/status/{jobId} (완료 시)
{
  "status": "done",
  "result": {
    "output_video_url": "https://s3.presigned...",
    "events": [{ "frame": 120, "type": "pass", "description": "패스 성공! ..." }],
    "team_ball_control": { "team1": 58.3, "team2": 41.7 }
  }
}
```

---

## 모듈 구조

```
~/football-analysis/
├── api.py                          # FastAPI 서버 + 비동기 작업 관리
├── models/
│   └── best.pt                     # YOLOv8 커스텀 학습 모델
├── fonts/
│   └── NanumGothic.ttf             # 한글 자막 폰트
├── trackers/
│   └── tracker.py                  # 객체 감지 + 추적 + 시각화
├── team_assigner/
│   └── team_assigner.py            # 유니폼 색상 기반 팀 분류
├── player_ball_assigner/
│   └── player_ball_assigner.py     # 공 소유 선수 판별
├── camera_movement_estimator/
│   └── camera_movement_estimator.py # 카메라 움직임 보정
├── view_transformer/
│   └── view_transformer.py         # 픽셀→실제 좌표 원근 변환
├── speed_and_distance_estimator/
│   └── speed_and_distance_estimator.py # 선수 속도/이동거리 계산
├── retriever/
│   ├── generate_commentary.py      # RAG 해설 생성 (FAISS 검색)
│   └── embedder.py                 # 벡터 스토어 빌드
├── commentary_ai/
│   ├── build_vector_store.py       # 벡터 스토어 생성 스크립트
│   ├── data/
│   │   └── commentary_samples.txt  # 한/영 해설 샘플 데이터
│   └── generator/
│       └── vector_store.pkl        # FAISS 벡터 스토어 (87MB)
└── utils/
    ├── video_utils.py              # 영상 읽기/쓰기 (OpenCV)
    └── bbox_utils.py               # bbox 중심점, 거리 계산
```

---

## 분석 파이프라인 (analyze_video)

### 1단계: 영상 입력 및 객체 감지

```python
video_frames = read_video(input_path)           # OpenCV로 전체 프레임 추출
tracker = Tracker('models/best.pt')             # YOLOv8 커스텀 모델 로드
tracks = tracker.get_object_tracks(video_frames) # 감지 + 추적
```

- YOLO `conf=0.1`로 낮은 신뢰도까지 감지
- 골키퍼(`goalkeeper`) → 플레이어(`player`)로 통합
- 감지 결과를 3종 트랙으로 분류: `players`, `referees`, `ball`
- 커스텀 트래커: 유클리드 거리 50px 이내 매칭, 30프레임 미감지 시 트랙 삭제

### 2단계: 카메라 보정

```python
camera_movement_estimator = CameraMovementEstimator(video_frames[0])
camera_movement_per_frame = camera_movement_estimator.get_camera_movement(video_frames)
```

- Lucas-Kanade 옵티컬 플로우 사용
- 프레임 좌우 가장자리(0~20px, 900~1050px)의 특징점 추적
- 최소 이동거리 5px 이상일 때만 카메라 이동으로 판정
- 모든 트랙 좌표에서 카메라 이동량을 빼서 보정

### 3단계: 좌표 변환

```python
view_transformer = ViewTransformer()
view_transformer.add_transformed_position_to_tracks(tracks)
```

- 4개 기준점으로 원근 변환 (Perspective Transform)
- 픽셀 좌표 → 실제 코트 좌표 (68m × 23.32m)
- `cv2.getPerspectiveTransform` + `cv2.perspectiveTransform`

### 4단계: 공 위치 보간

```python
tracks["ball"] = tracker.interpolate_ball_positions(tracks["ball"])
```

- 공이 감지되지 않은 프레임을 pandas `interpolate()` + `bfill()`로 보간

### 5단계: 속도/거리 계산

```python
speed_and_distance_estimator = SpeedAndDistance_Estimator()
speed_and_distance_estimator.add_speed_and_distance_to_tracks(tracks)
```

- 5프레임 윈도우 단위로 이동거리 측정
- 24fps 기준 → km/h 변환
- 선수만 계산 (공, 심판 제외)

### 6단계: 팀 분류

```python
team_assigner = TeamAssigner()
team_assigner.assign_team_color(video_frames[0], tracks['players'][0])
```

- 첫 프레임에서 각 선수의 상반신(bbox 상위 50%) 이미지 추출
- KMeans(n=2)로 유니폼 색상 클러스터링
- 4개 코너 픽셀 → 배경 클러스터 판별 → 나머지가 유니폼 색상
- 전체 선수 색상을 다시 KMeans(n=2)로 2팀 분류
- 이후 프레임에서는 캐시된 팀 배정 재사용

### 7단계: 공 소유 판별 + 이벤트 감지

```python
player_assigner = PlayerBallAssigner()  # max_distance=70px
```

프레임별로 공과 가장 가까운 선수를 공 소유자로 판별하고, 이벤트를 감지:

| 이벤트 | 감지 조건 |
|--------|-----------|
| 패스 | 같은 팀 내 공 소유자 변경 |
| 태클 | 다른 팀으로 공 소유 변경 |
| 슛 | 공 속도 > 8 |
| 골 | 공이 골 영역 좌표 내 진입 |
| 드리블 | 공 소유자 속도 > 1.5 (자막만, 이벤트 미기록) |

### 8단계: AI 해설 생성 (RAG)

```python
subtitle_text = generate_commentary(query, vector_store_path)
```

- 프레임별 상황을 자연어 쿼리로 구성:
  - 플레이어 ID, 속도, 공 속도, 소유 팀, 공 위치
- `SentenceTransformer("all-MiniLM-L6-v2")`로 쿼리 임베딩
- FAISS `IndexFlatL2`로 유사도 검색 (top-3 중 1위 반환)
- 해설 샘플: 한/영 병기 (`///` 구분자)
  - 드리블, 태클, 슛, 패스, 반칙 등 상황별 해설

### 9단계: 시각화 + 인코딩

```python
output_video_frames = tracker.draw_annotations(video_frames, tracks, ...)
save_video(output_video_frames, output_path)
# ffmpeg -vcodec libx264 -acodec aac → H.264 인코딩
```

시각화 요소:

| 요소 | 표현 | 색상 |
|------|------|------|
| 선수 | 타원 + 트랙 ID 번호 | 팀 색상 (KMeans 결과) |
| 공 소유자 | 빨간 삼각형 마커 | 빨강 |
| 심판 | 타원 + 트랙 ID | 시안 (0,255,255) |
| 공 | 삼각형 마커 | 초록 (0,255,0) |
| 팀 볼 컨트롤 | 우측 하단 반투명 박스 | 흰색 배경 + 검정 텍스트 |
| AI 해설 자막 | 하단 반투명 배경 | 흰색 텍스트 |
| 이벤트 자막 | 해설 아래 | 노란색 텍스트 |

---

## 핵심 기술 스택

| 분류 | 기술 |
|------|------|
| 웹 프레임워크 | FastAPI + uvicorn |
| 객체 감지 | YOLOv8 (ultralytics) — 커스텀 학습 모델 `best.pt` |
| 객체 추적 | DeepSORT (`deep_sort_realtime`) + 커스텀 유클리드 매칭 |
| 팀 분류 | scikit-learn KMeans 클러스터링 |
| 카메라 보정 | OpenCV Lucas-Kanade 옵티컬 플로우 |
| 좌표 변환 | OpenCV Perspective Transform |
| 공 보간 | pandas interpolate + bfill |
| AI 해설 | SentenceTransformer + FAISS (RAG) |
| 영상 처리 | OpenCV + PIL (한글 자막) |
| 인코딩 | ffmpeg (H.264) |
| 스토리지 | AWS S3 (presigned URL) |

---

## 인프라 정보

| 항목 | 값 |
|------|-----|
| EC2 호스트 | `ubuntu@34.236.216.122` |
| 서버 포트 | 8000 |
| CloudFront | `d2e8khynpnbcpl.cloudfront.net` (ID: `E2AQ982ZLLWYM9`) |
| S3 버킷 | `football-analysis-bucket` |
| YOLO 모델 | `~/football-analysis/models/best.pt` |
| 벡터 스토어 | `~/football-analysis/commentary_ai/generator/vector_store.pkl` (87MB) |
| 한글 폰트 | `~/football-analysis/fonts/NanumGothic.ttf` |
