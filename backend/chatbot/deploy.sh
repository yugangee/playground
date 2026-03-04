#!/bin/bash

# Load environment variables
export $(cat .env | xargs)

# Install serverless if not installed
if ! command -v serverless &> /dev/null; then
    echo "Installing Serverless Framework..."
    npm install -g serverless
fi

# Install serverless plugins
if [ ! -d "node_modules" ]; then
    npm init -y
    npm install --save-dev serverless-python-requirements
fi

# Deploy
echo "Deploying chatbot to AWS Lambda..."
serverless deploy --verbose

echo "Deployment complete!"
echo "API Gateway URL will be shown above"
