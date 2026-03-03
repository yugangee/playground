#!/bin/bash

# EC2 Manager Lambda 배포 스크립트

set -e

FUNCTION_NAME="playground-ec2-manager"
REGION="us-east-1"
ROLE_ARN="arn:aws:iam::887078546492:role/playground-auth-lambda-role"
TABLE_NAME="playground-table"

echo "📦 Installing dependencies..."
npm install

echo "🗜️  Creating deployment package..."
zip -r function.zip index.mjs node_modules/ package.json

echo "🚀 Deploying Lambda function..."

# Lambda 함수가 존재하는지 확인
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
  echo "Updating existing function..."
  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://function.zip \
    --region $REGION
  
  aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment "Variables={TABLE_NAME=$TABLE_NAME}" \
    --timeout 30 \
    --region $REGION
else
  echo "Creating new function..."
  aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime nodejs20.x \
    --role $ROLE_ARN \
    --handler index.handler \
    --zip-file fileb://function.zip \
    --timeout 30 \
    --environment "Variables={TABLE_NAME=$TABLE_NAME}" \
    --region $REGION
fi

echo ""
echo "✅ Lambda function deployed: $FUNCTION_NAME"
echo ""
echo "📝 Next steps:"
echo "   1. API Gateway에 /ec2/ensure, /ec2/heartbeat, /ec2/status 경로 추가"
echo "   2. EventBridge 규칙 생성 (5분마다 autoStopHandler 호출)"
echo ""
echo "EventBridge 규칙 생성:"
echo "aws events put-rule --name ec2-auto-stop --schedule-expression 'rate(5 minutes)' --region $REGION"
echo "aws lambda add-permission --function-name $FUNCTION_NAME --statement-id EventBridgeInvoke --action lambda:InvokeFunction --principal events.amazonaws.com --source-arn arn:aws:events:$REGION:887078546492:rule/ec2-auto-stop --region $REGION"
echo "aws events put-targets --rule ec2-auto-stop --targets 'Id=1,Arn=arn:aws:lambda:$REGION:887078546492:function:$FUNCTION_NAME,Input={\"handler\":\"autoStopHandler\"}' --region $REGION"

rm function.zip
