#!/bin/bash

FUNCTION_NAME="playground-chatbot-api"
API_NAME="playground-chatbot-api"
REGION="us-east-1"

echo "Creating API Gateway..."

# HTTP API 생성
API_ID=$(aws apigatewayv2 create-api \
    --name $API_NAME \
    --protocol-type HTTP \
    --target arn:aws:lambda:$REGION:$(aws sts get-caller-identity --query Account --output text):function:$FUNCTION_NAME \
    --region $REGION \
    --query 'ApiId' \
    --output text)

echo "API ID: $API_ID"

# Lambda 권한 추가
aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$(aws sts get-caller-identity --query Account --output text):$API_ID/*" \
    --region $REGION

# API URL 가져오기
API_URL=$(aws apigatewayv2 get-api --api-id $API_ID --region $REGION --query 'ApiEndpoint' --output text)

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo "API Gateway URL: $API_URL"
echo "Health Check: $API_URL/health"
echo "Chat Endpoint: $API_URL/api/chat"
echo "========================================="
