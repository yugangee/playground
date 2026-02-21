#!/bin/bash
set -e

BUCKET="playground-web-sedaily-us"
DISTRIBUTION_ID="YOUR_DISTRIBUTION_ID"  # CloudFront 배포 ID로 교체

echo "🔨 빌드 중..."
npm run build

echo "📦 S3 업로드 중... (uploads/ 폴더 제외)"
aws s3 sync out/ s3://$BUCKET --delete --exclude "uploads/*"

echo "🔄 CloudFront 캐시 무효화..."
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

echo "✅ 배포 완료"
