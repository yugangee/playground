#!/bin/bash

# EC2 인스턴스 코드 업데이트 스크립트
# SSH 키 없이 인스턴스를 재시작하여 최신 코드 적용

INSTANCE_ID="i-03dfdfeb95b7a281a"

echo "🔄 EC2 인스턴스 재시작 중..."
echo "재시작 시 자동으로 최신 코드를 git pull 합니다."

# 인스턴스 재시작
aws ec2 reboot-instances --instance-ids $INSTANCE_ID

echo "✅ 재시작 명령 전송 완료"
echo "⏳ 약 2-3분 후 인스턴스가 다시 시작됩니다."
echo ""
echo "📍 인스턴스 상태 확인:"
echo "   aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].State.Name'"
