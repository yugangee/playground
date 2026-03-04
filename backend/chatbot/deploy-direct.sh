#!/bin/bash

# 환경변수 로드
export $(cat .env | xargs)

FUNCTION_NAME="playground-chatbot-api"
REGION="us-east-1"
ROLE_NAME="playground-chatbot-lambda-role"

echo "Creating Lambda execution role..."
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text 2>/dev/null)

if [ -z "$ROLE_ARN" ]; then
    # Role 생성
    aws iam create-role --role-name $ROLE_NAME \
        --assume-role-policy-document '{
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Principal": {"Service": "lambda.amazonaws.com"},
                "Action": "sts:AssumeRole"
            }]
        }'
    
    # 기본 Lambda 실행 권한 추가
    aws iam attach-role-policy --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    
    # Bedrock 권한 추가
    aws iam put-role-policy --role-name $ROLE_NAME \
        --policy-name BedrockAccess \
        --policy-document '{
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Action": [
                    "bedrock:InvokeModel",
                    "bedrock:InvokeModelWithResponseStream"
                ],
                "Resource": "*"
            }]
        }'
    
    sleep 10  # Role 생성 대기
    ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
fi

echo "Role ARN: $ROLE_ARN"

# 패키지 준비
echo "Preparing deployment package..."
rm -rf package lambda-package.zip
mkdir -p package

# Docker를 사용해서 x86_64용 패키지 설치
echo "Installing dependencies for Lambda (x86_64)..."
docker run --rm -v "$PWD":/var/task public.ecr.aws/lambda/python:3.11 \
    pip install -r requirements.txt -t package/

# 코드 복사
cp chatbot_server.py lambda_handler.py package/
cp -r football_knowledge package/ 2>/dev/null || echo "No vector store found"

# ZIP 생성
cd package
zip -r ../lambda-package.zip . -q
cd ..

echo "Deploying Lambda function..."

# Lambda 함수 생성 또는 업데이트
aws lambda get-function --function-name $FUNCTION_NAME --region $REGION > /dev/null 2>&1

if [ $? -eq 0 ]; then
    # 업데이트
    echo "Updating existing function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://lambda-package.zip \
        --region $REGION
    
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
else
    # 생성
    echo "Creating new function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime python3.11 \
        --role $ROLE_ARN \
        --handler lambda_handler.handler \
        --zip-file fileb://lambda-package.zip \
        --timeout 30 \
        --memory-size 1024 \
        --environment "Variables={
            BEDROCK_MODEL_ID=$BEDROCK_MODEL_ID,
            BEDROCK_EMBEDDING_MODEL_ID=$BEDROCK_EMBEDDING_MODEL_ID,
            BEDROCK_TEMPERATURE=$BEDROCK_TEMPERATURE,
            BEDROCK_MAX_TOKENS=$BEDROCK_MAX_TOKENS,
            TAVILY_API_KEY=$TAVILY_API_KEY
        }" \
        --region $REGION
fi

echo "Deployment complete!"
echo "Function name: $FUNCTION_NAME"
echo "Next: Create API Gateway and connect to this function"
