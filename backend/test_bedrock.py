import boto3
import os

try:
    client = boto3.client(
        'bedrock-runtime',
        region_name=os.getenv('AWS_REGION', 'us-east-1'),
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    )
    # Test embedding
    import json
    response = client.invoke_model(
        modelId='amazon.titan-embed-text-v2:0',
        body=json.dumps({"inputText": "test"}),
        contentType='application/json',
    )
    print("BEDROCK OK:", response['ResponseMetadata']['HTTPStatusCode'])
except Exception as e:
    print(f"BEDROCK ERROR: {e}")
