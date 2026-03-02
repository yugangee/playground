#!/bin/bash

# 환경변수 로드
export $(cat .env | xargs)

FUNCTION_NAME="playground-chatbot-api"
LAYER_NAME="playground-chatbot-dependencies"
REGION="us-east-1"
ROLE_NAME="playground-chatbot-lambda-role"

echo "Step 1: Creating Lambda Layer with dependencies..."

# Layer 디렉토리 준비
rm -rf python layer.zip
mkdir -p python

# Docker로 x86_64용 패키지 설치
echo "Installing dependencies in Docker..."
docker run --rm \
    -v "$PWD":/var/task \
    -w /var/task \
    public.ecr.aws/lambda/python:3.11 \
    pip install -r requirements.txt -t python/ --no-cache-dir

# Layer ZIP 생성
zip -r layer.zip python/ -q
echo "Layer package size: $(du -h layer.zip | cut -f1)"

# Layer 업로드
echo "Uploading Lambda Layer..."
LAYER_VERSION=$(aws lambda publish-layer-version \
    --layer-name $LAYER_NAME \
    --zip-file fileb://layer.zip \
    --compatible-runtimes python3.11 \
    --region $REGION \
    --query 'Version' \
    --output text)

echo "Layer version: $LAYER_VERSION"
LAYER_ARN="arn:aws:lambda:$REGION:$(aws sts get-caller-identity --query Account --output text):layer:$LAYER_NAME:$LAYER_VERSION"

echo ""
echo "Step 2: Creating Lambda function code package..."

# 함수 코드만 패키징
rm -rf function function.zip
mkdir -p function
cp chatbot_server.py lambda_handler.py function/
cp -r football_knowledge function/ 2>/dev/null || echo "No vector store found"

cd function
zip -r ../function.zip . -q
cd ..

echo "Function package size: $(du -h function.zip | cut -f1)"

echo ""
echo "Step 3: Creating/Updating Lambda function..."

# Role 확인/생성
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text 2>/dev/null)

if [ -z "$ROLE_ARN" ]; then
    echo "Creating IAM role..."
    aws iam create-role --role-name $ROLE_NAME \
        --assume-role-policy-document '{
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Principal": {"Service": "lambda.amazonaws.com"},
                "Action": "sts:AssumeRole"
            }]
        }' > /dev/null
    
    aws iam attach-role-policy --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    
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
        }' > /dev/null
    
    sleep 10
    ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
fi

# Lambda 함수 확인
aws lambda get-function --function-name $FUNCTION_NAME --region $REGION > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "Updating existing function..."
    
    # 코드 업데이트
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://function.zip \
        --region $REGION > /dev/null
    
    sleep 2
    
    # Layer 연결
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --layers $LAYER_ARN \
        --environment "Variables={
            BEDROCK_MODEL_ID=$BEDROCK_MODEL_ID,
            BEDROCK_EMBEDDING_MODEL_ID=$BEDROCK_EMBEDDING_MODEL_ID,
            BEDROCK_TEMPERATURE=$BEDROCK_TEMPERATURE,
            BEDROCK_MAX_TOKENS=$BEDROCK_MAX_TOKENS,
            TAVILY_API_KEY=$TAVILY_API_KEY
        }" \
        --timeout 30 \
        --memory-size 1024 \
        --region $REGION > /dev/null
else
    echo "Creating new function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime python3.11 \
        --role $ROLE_ARN \
        --handler lambda_handler.handler \
        --zip-file fileb://function.zip \
        --layers $LAYER_ARN \
        --timeout 30 \
        --memory-size 1024 \
        --environment "Variables={
            BEDROCK_MODEL_ID=$BEDROCK_MODEL_ID,
            BEDROCK_EMBEDDING_MODEL_ID=$BEDROCK_EMBEDDING_MODEL_ID,
            BEDROCK_TEMPERATURE=$BEDROCK_TEMPERATURE,
            BEDROCK_MAX_TOKENS=$BEDROCK_MAX_TOKENS,
            TAVILY_API_KEY=$TAVILY_API_KEY
        }" \
        --region $REGION > /dev/null
fi

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo "Function: $FUNCTION_NAME"
echo "Layer: $LAYER_NAME (version $LAYER_VERSION)"
echo ""
echo "Waiting for function to be ready..."
sleep 5

# API Gateway 확인
API_ID=$(aws apigatewayv2 get-apis --region $REGION --query "Items[?Name=='playground-chatbot-api'].ApiId" --output text)

if [ -n "$API_ID" ]; then
    API_URL=$(aws apigatewayv2 get-api --api-id $API_ID --region $REGION --query 'ApiEndpoint' --output text)
    echo "API URL: $API_URL"
    echo "Test: curl $API_URL/health"
else
    echo "Run ./create-api-gateway.sh to create API Gateway"
fi
echo "========================================="
