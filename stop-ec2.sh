#!/bin/bash

# EC2 인스턴스 중지 스크립트
# 영상 분석 EC2 인스턴스 (g4dn.2xlarge)를 중지합니다

INSTANCE_ID="i-03dfdfeb95b7a281a"
REGION="us-east-1"

echo "🛑 EC2 인스턴스 중지 중..."
echo "Instance ID: $INSTANCE_ID"
echo "Region: $REGION"
echo ""

# 현재 상태 확인
CURRENT_STATE=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region $REGION \
  --query 'Reservations[0].Instances[0].State.Name' \
  --output text)

echo "현재 상태: $CURRENT_STATE"

if [ "$CURRENT_STATE" == "stopped" ]; then
  echo "✅ 인스턴스가 이미 중지되어 있습니다."
  exit 0
fi

if [ "$CURRENT_STATE" == "stopping" ]; then
  echo "⏳ 인스턴스가 이미 중지 중입니다. 완료될 때까지 대기합니다..."
  aws ec2 wait instance-stopped --instance-ids $INSTANCE_ID --region $REGION
  echo "✅ 인스턴스 중지 완료"
  exit 0
fi

# 인스턴스 중지
echo "⏳ 인스턴스를 중지합니다..."
aws ec2 stop-instances --instance-ids $INSTANCE_ID --region $REGION > /dev/null

# 중지 완료 대기
echo "⏳ 중지 완료 대기 중..."
aws ec2 wait instance-stopped --instance-ids $INSTANCE_ID --region $REGION

echo ""
echo "✅ EC2 인스턴스 중지 완료!"
echo ""
echo "💰 비용 절감:"
echo "   - 시간당 $0.752 절약"
echo "   - 하루 $18.05 절약"
echo ""
echo "📝 참고:"
echo "   - EBS 스토리지 비용은 계속 발생합니다 (~$10/월)"
echo "   - 다시 시작하려면 프론트엔드에서 영상 분석을 시도하거나"
echo "   - 수동으로 시작: aws ec2 start-instances --instance-ids $INSTANCE_ID --region $REGION"
