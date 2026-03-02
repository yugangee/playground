#!/bin/bash

# 환경변수 로드
source .env

FUNCTION_NAME="playground-chatbot-api"
REGION="us-east-1"

echo "Building Lambda package..."

# 패키지 디렉토리 준비
rm -rf package lambda-package.zip
mkdir -p package

# pip로 manylinux 휠 설치 (Lambda 호환)
echo "Installing dependencies..."
pip3 install \
    --platform manylinux2014_x86_64 \
    --target=package \
    --implementation cp \
    --python-version 3.11 \
    --only-binary=:all: \
    --upgrade \
    -r requirements.txt

# 코드 복사
cp chatbot_server.py lambda_handler.py package/
cp -r football_knowledge package/ 2>/dev/null || echo "No vector store found"

# ZIP 생성
cd package
zip -r ../lambda-package.zip . -q
cd ..

PACKAGE_SIZE=$(du -h lambda-package.zip | cut -f1)
echo "Package size: $PACKAGE_SIZE"

# 50MB 이상이면 S3 사용
if [ $(stat -f%z lambda-package.zip) -gt 52428800 ]; then
    echo "Package too large, uploading to S3..."
    BUCKET="sedaily-lambda-deployments"
    S3_KEY="chatbot/lambda-package-$(date +%Y%m%d-%H%M%S).zip"
    
    aws s3 cp lambda-package.zip s3://$BUCKET/$S3_KEY
    
    echo "Updating function from S3..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --s3-bucket $BUCKET \
        --s3-key $S3_KEY \
        --region $REGION
else
    echo "Updating function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://lambda-package.zip \
        --region $REGION
fi

echo ""
echo "Updating environment variables..."
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment "Variables={
        BEDROCK_MODEL_ID=$BEDROCK_MODEL_ID,
        BEDROCK_EMBEDDING_MODEL_ID=$BEDROCK_EMBEDDING_MODEL_ID,
        BEDROCK_TEMPERATURE=$BEDROCK_TEMPERATURE,
        BEDROCK_MAX_TOKENS=$BEDROCK_MAX_TOKENS,
        TAVILY_API_KEY=$TAVILY_API_KEY
    }" \
    --timeout 30 \
    --memory-size 1024 \
    --region $REGION

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo "API URL: https://7ymq2ssv3e.execute-api.us-east-1.amazonaws.com"
echo "Test: curl https://7ymq2ssv3e.execute-api.us-east-1.amazonaws.com/health"
echo "========================================="
