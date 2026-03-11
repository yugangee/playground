#!/bin/bash
# PLAYGROUND 챗봇 Lambda 배포 스크립트
# boto3만 사용하므로 의존성 설치 불필요 — 코드 파일 하나만 ZIP

FUNCTION_NAME="playground-chatbot"
REGION="us-east-1"
RUNTIME="python3.12"
HANDLER="lambda_chatbot.handler"
TIMEOUT=60
MEMORY=256

echo "📦 Packaging lambda_chatbot.py ..."
cd "$(dirname "$0")"
rm -f chatbot-lambda.zip
zip chatbot-lambda.zip lambda_chatbot.py

PACKAGE_SIZE=$(wc -c < chatbot-lambda.zip)
echo "   Package size: ${PACKAGE_SIZE} bytes"

# Lambda 함수 존재 여부 확인
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --no-verify-ssl 2>/dev/null; then
    echo "🔄 Updating existing function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://chatbot-lambda.zip \
        --region $REGION \
        --no-verify-ssl

    # 코드 업데이트 완료 대기
    echo "   Waiting for update..."
    aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION --no-verify-ssl 2>/dev/null

    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --timeout $TIMEOUT \
        --memory-size $MEMORY \
        --region $REGION \
        --no-verify-ssl
else
    echo "🆕 Creating new function..."
    # IAM Role 확인 (기존 Lambda 실행 역할 재사용)
    ROLE_ARN=$(aws iam get-role --role-name playground-chatbot-role --query 'Role.Arn' --output text --no-verify-ssl 2>/dev/null)

    if [ -z "$ROLE_ARN" ] || [ "$ROLE_ARN" = "None" ]; then
        echo "   Creating IAM role..."
        aws iam create-role \
            --role-name playground-chatbot-role \
            --assume-role-policy-document '{
                "Version": "2012-10-17",
                "Statement": [{
                    "Effect": "Allow",
                    "Principal": {"Service": "lambda.amazonaws.com"},
                    "Action": "sts:AssumeRole"
                }]
            }' \
            --no-verify-ssl

        aws iam attach-role-policy \
            --role-name playground-chatbot-role \
            --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
            --no-verify-ssl

        aws iam attach-role-policy \
            --role-name playground-chatbot-role \
            --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess \
            --no-verify-ssl

        ROLE_ARN=$(aws iam get-role --role-name playground-chatbot-role --query 'Role.Arn' --output text --no-verify-ssl)
        echo "   Waiting for role propagation..."
        sleep 10
    fi

    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --handler $HANDLER \
        --role "$ROLE_ARN" \
        --zip-file fileb://chatbot-lambda.zip \
        --timeout $TIMEOUT \
        --memory-size $MEMORY \
        --region $REGION \
        --no-verify-ssl

    echo "   Waiting for function to be active..."
    aws lambda wait function-active --function-name $FUNCTION_NAME --region $REGION --no-verify-ssl 2>/dev/null

    # Function URL 생성 (API Gateway 없이 직접 호출)
    echo "🌐 Creating Function URL..."
    aws lambda add-permission \
        --function-name $FUNCTION_NAME \
        --statement-id FunctionURLAllowPublicAccess \
        --action lambda:InvokeFunctionUrl \
        --principal "*" \
        --function-url-auth-type NONE \
        --region $REGION \
        --no-verify-ssl 2>/dev/null

    FUNC_URL=$(aws lambda create-function-url-config \
        --function-name $FUNCTION_NAME \
        --auth-type NONE \
        --cors '{"AllowOrigins":["*"],"AllowMethods":["POST","OPTIONS"],"AllowHeaders":["Content-Type"]}' \
        --region $REGION \
        --no-verify-ssl \
        --query 'FunctionUrl' --output text)

    echo ""
    echo "========================================="
    echo "✅ Function URL: $FUNC_URL"
    echo "========================================="
fi

# 최종 Function URL 출력
FUNC_URL=$(aws lambda get-function-url-config \
    --function-name $FUNCTION_NAME \
    --region $REGION \
    --no-verify-ssl \
    --query 'FunctionUrl' --output text 2>/dev/null)

rm -f chatbot-lambda.zip

echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "   Function: $FUNCTION_NAME"
echo "   URL: $FUNC_URL"
echo "   Health: curl ${FUNC_URL}health"
echo "========================================="
