#!/bin/bash

# API Gateway에 EC2 관리 경로 추가

set -e

API_ID="91iv3etr0h"
REGION="us-east-1"
FUNCTION_ARN="arn:aws:lambda:us-east-1:887078546492:function:playground-ec2-manager"
ACCOUNT_ID="887078546492"

echo "📍 Adding /ec2 routes to API Gateway..."

# 루트 리소스 ID 가져오기
ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query 'items[?path==`/`].id' \
  --output text)

echo "Root resource ID: $ROOT_ID"

# /ec2 리소스 생성 (이미 있으면 ID 가져오기)
EC2_RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query 'items[?path==`/ec2`].id' \
  --output text)

if [ -z "$EC2_RESOURCE_ID" ]; then
  echo "Creating /ec2 resource..."
  EC2_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_ID \
    --path-part ec2 \
    --region $REGION \
    --query 'id' \
    --output text)
  echo "Created /ec2 resource: $EC2_RESOURCE_ID"
else
  echo "Found existing /ec2 resource: $EC2_RESOURCE_ID"
fi

# /ec2/{proxy+} 리소스 생성
PROXY_RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query 'items[?path==`/ec2/{proxy+}`].id' \
  --output text)

if [ -z "$PROXY_RESOURCE_ID" ]; then
  echo "Creating /ec2/{proxy+} resource..."
  PROXY_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $EC2_RESOURCE_ID \
    --path-part '{proxy+}' \
    --region $REGION \
    --query 'id' \
    --output text)
  echo "Created /ec2/{proxy+} resource: $PROXY_RESOURCE_ID"
else
  echo "Found existing /ec2/{proxy+} resource: $PROXY_RESOURCE_ID"
fi

# ANY 메서드 추가
echo "Adding ANY method to /ec2/{proxy+}..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $PROXY_RESOURCE_ID \
  --http-method ANY \
  --authorization-type NONE \
  --region $REGION 2>/dev/null || echo "Method already exists"

# Lambda 통합 설정
echo "Setting up Lambda integration..."
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $PROXY_RESOURCE_ID \
  --http-method ANY \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$FUNCTION_ARN/invocations" \
  --region $REGION

# Lambda 권한 추가
echo "Adding Lambda permission..."
aws lambda add-permission \
  --function-name playground-ec2-manager \
  --statement-id apigateway-ec2-any \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*/ec2/*" \
  --region $REGION 2>/dev/null || echo "Permission already exists"

# OPTIONS 메서드 추가 (CORS)
echo "Adding OPTIONS method for CORS..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $PROXY_RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE \
  --region $REGION 2>/dev/null || echo "OPTIONS method already exists"

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $PROXY_RESOURCE_ID \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
  --region $REGION 2>/dev/null || echo "OPTIONS integration already exists"

aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $PROXY_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers": true, "method.response.header.Access-Control-Allow-Methods": true, "method.response.header.Access-Control-Allow-Origin": true}' \
  --region $REGION 2>/dev/null || echo "OPTIONS method response already exists"

aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $PROXY_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers": "'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'", "method.response.header.Access-Control-Allow-Methods": "'"'"'GET,POST,OPTIONS'"'"'", "method.response.header.Access-Control-Allow-Origin": "'"'"'*'"'"'"}' \
  --region $REGION 2>/dev/null || echo "OPTIONS integration response already exists"

# 배포
echo "Deploying API..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --region $REGION

echo ""
echo "✅ API Gateway routes added!"
echo ""
echo "📍 Endpoints:"
echo "   - POST https://91iv3etr0h.execute-api.us-east-1.amazonaws.com/prod/ec2/ensure"
echo "   - POST https://91iv3etr0h.execute-api.us-east-1.amazonaws.com/prod/ec2/heartbeat"
echo "   - GET  https://91iv3etr0h.execute-api.us-east-1.amazonaws.com/prod/ec2/status"
