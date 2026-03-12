#!/bin/bash

# 프론트엔드 배포 스크립트
# S3 + CloudFront 배포

set -e

echo "🚀 프론트엔드 배포 시작..."
echo ""

# 빌드
echo "📦 Next.js 빌드 중..."
npm run build

# E-2: SW 캐시 버전에 git 커밋 해시 주입 (out/sw.js만 수정, public/sw.js 유지)
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
sed -i "s/playground-v[a-zA-Z0-9._-]*/playground-${GIT_HASH}/" out/sw.js
echo "🔖 SW 캐시 버전: playground-${GIT_HASH}"

echo ""
echo "☁️  S3에 업로드 중..."
echo "⚠️  uploads/ 폴더는 제외됩니다 (사용자 업로드 파일 보호)"
aws s3 sync out/ s3://playground-web-sedaily-us --delete --exclude "uploads/*"

echo ""
echo "🔄 CloudFront 캐시 무효화 중..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id E1U8HJ0871GR0O \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "✅ 캐시 무효화 요청 완료: $INVALIDATION_ID"
echo ""
echo "🎉 배포 완료!"
echo ""
echo "📍 배포 URL:"
echo "   - https://fun.sedaily.ai"
echo "   - https://d1t0vkbh1b2z3x.cloudfront.net"
echo ""
echo "💡 캐시 무효화는 1-2분 정도 소요됩니다."
