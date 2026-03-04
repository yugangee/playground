#!/bin/bash

# 환경변수 로드
source .env

FUNCTION_NAME="playground-chatbot-api"
REGION="us-east-1"

echo "Building lightweight Lambda package..."

# 패키지 디렉토리 준비
rm -rf package lambda-package.zip
mkdir -p package

# 가벼운 의존성만 설치
echo "Installing dependencies..."
pip3 install \
    --platform manylinux2014_x86_64 \
    --target=package \
    --implementation cp \
    --python-version 3.11 \
    --only-binary=:all: \
    --upgrade \
    -r requirements-simple.txt

# 코드 복사
cp chatbot_simple.py package/chatbot_server.py
cp lambda_handler_simple.py package/lambda_handler.py

# ZIP 생성
cd package
zip -r ../lambda-package.zip . -q
cd ..

PACKAGE_SIZE=$(du -h lambda-package.zip | cut -f1)
echo "Package size: $PACKAGE_SIZE"

# 업데이트
echo "Updating Lambda function..."
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://lambda-package.zip \
    --region $REGION

sleep 3

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
    --memory-size 512 \
    --region $REGION

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo "API URL: https://7ymq2ssv3e.execute-api.us-east-1.amazonaws.com"
echo "Test: curl https://7ymq2ssv3e.execute-api.us-east-1.amazonaws.com/health"
echo "========================================="
