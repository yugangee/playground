#!/bin/bash
set -e

echo "📦 빌드 중..."
npm run build

echo "☁️ S3 업로드 중..."
aws s3 sync out/ s3://playground-web-sedaily-us --delete --exclude "uploads/*" --no-verify-ssl

echo "🔄 CloudFront 캐시 무효화 중..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id E1U8HJ0871GR0O \
  --paths "/*" \
  --no-verify-ssl \
  --query 'Invalidation.Id' \
  --output text)

echo "✅ 배포 완료! 무효화 ID: $INVALIDATION_ID"
echo "🌐 https://d1t0vkbh1b2z3x.cloudfront.net"
