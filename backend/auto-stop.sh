#!/bin/bash
# EC2 자동 정지 스크립트
# 30분(1800초) 동안 API 요청이 없으면 인스턴스 정지

IDLE_TIMEOUT=300  # 5분
ACTIVITY_FILE="/tmp/ec2_last_activity"

# 활동 파일이 없으면 현재 시간으로 생성
if [ ! -f "$ACTIVITY_FILE" ]; then
    echo $(date +%s) > "$ACTIVITY_FILE"
fi

LAST_ACTIVITY=$(cat "$ACTIVITY_FILE" | cut -d'.' -f1)
NOW=$(date +%s)
IDLE_TIME=$((NOW - LAST_ACTIVITY))

if [ "$IDLE_TIME" -ge "$IDLE_TIMEOUT" ]; then
    echo "$(date): Idle for ${IDLE_TIME}s (>= ${IDLE_TIMEOUT}s). Shutting down..."
    sudo shutdown -h now
else
    REMAINING=$((IDLE_TIMEOUT - IDLE_TIME))
    echo "$(date): Idle ${IDLE_TIME}s. Shutdown in ${REMAINING}s if no activity."
fi
