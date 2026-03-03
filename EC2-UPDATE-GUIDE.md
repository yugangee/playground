# EC2 코드 업데이트 가이드

## 방법 1: AWS Console에서 직접 접속 (가장 쉬움)

1. AWS Console 접속: https://console.aws.amazon.com/ec2/
2. 인스턴스 `i-03dfdfeb95b7a281a` 선택
3. 우측 상단 "연결" 버튼 클릭
4. "Session Manager" 탭 선택
5. "연결" 버튼 클릭
6. 터미널이 열리면 다음 명령어 실행:

```bash
# ubuntu 사용자로 전환
sudo su - ubuntu

# 프로젝트 디렉토리로 이동
cd ~/football-analysis

# 최신 코드 받기
git pull origin main

# 서비스 재시작
sudo systemctl restart football-analysis

# 서비스 상태 확인
sudo systemctl status football-analysis
```

## 방법 2: SSH 키 파일이 있는 경우

```bash
ssh -i [키파일경로] ubuntu@23.22.213.21
cd ~/football-analysis
git pull origin main
sudo systemctl restart football-analysis
```

## 방법 3: 인스턴스 재시작 (코드 업데이트 안됨)

```bash
./update-ec2-code.sh
```

⚠️ 주의: 이 방법은 코드를 업데이트하지 않고 단순히 재시작만 합니다.

## 업데이트 내용

- 실시간 영상 분석 진행률 추적 기능 추가
- 프레임별 진행률 표시 (어느 프레임까지 처리됐는지)
- 분석 실패 시 실패한 프레임 정보 포함
- 7단계 진행률: 선수 추적 → 카메라 움직임 → 좌표 변환 → 팀 배정 → 이벤트 감지 → 영상 렌더링 → 최종 처리

## 확인 방법

업데이트 후 https://fun.sedaily.ai/video 에서 영상 분석을 시작하면:
- 실제 진행률이 표시됩니다 (5% → 100%)
- 각 단계별 메시지가 표시됩니다
- 실패 시 어느 프레임에서 실패했는지 표시됩니다
