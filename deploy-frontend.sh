#!/bin/bash

# 프론트엔드 배포 스크립트
# 사용법: ./deploy-frontend.sh

set -e

echo "🚀 프론트엔드 배포 시작..."

# 프론트엔드 디렉토리로 이동
cd /Users/yugang/Desktop/project/playground/frontend/playground-web

# 빌드
echo "📦 빌드 중..."
npm run build

# S3에 업로드
echo "☁️ S3에 업로드 중..."
aws s3 sync out/ s3://playground-frontend-887078546492 --delete

# CloudFront 캐시 무효화 (배포 ID 확인 필요)
# CLOUDFRONT_ID="YOUR_DISTRIBUTION_ID"
# echo "🔄 CloudFront 캐시 무효화 중..."
# aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"

echo "✅ 배포 완료!"
echo "🌐 https://playground.sedaily.kr 에서 확인하세요"
