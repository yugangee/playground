@echo off

echo 📦 빌드 중...
powershell -Command "(Get-Content next.config.ts) -replace 'const nextConfig: NextConfig = \{', 'const nextConfig: NextConfig = {`n  output: \"export\",' | Set-Content next.config.ts"
call npm run build
powershell -Command "(Get-Content next.config.ts) | Where-Object { $_ -notmatch 'output: .export.' } | Set-Content next.config.ts"

echo ☁️ S3 업로드 중...
aws s3 sync out/ s3://playground-web-sedaily-us --delete --no-verify-ssl
if errorlevel 1 ( echo ❌ S3 업로드 실패 & exit /b 1 )

echo 🔄 CloudFront 캐시 무효화 중...
for /f "tokens=*" %%i in ('aws cloudfront create-invalidation --distribution-id E1U8HJ0871GR0O --paths "/*" --no-verify-ssl --query "Invalidation.Id" --output text') do set INVALIDATION_ID=%%i

echo ✅ 배포 완료! 무효화 ID: %INVALIDATION_ID%
echo 🌐 https://d1t0vkbh1b2z3x.cloudfront.net
