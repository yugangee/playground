import pickle
import os
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
import boto3
import json

# Bedrock 클라이언트 설정
bedrock = boto3.client("bedrock-runtime", region_name=os.getenv("AWS_REGION", "us-east-1"))
COMMENTARY_MODEL_ID = os.getenv("COMMENTARY_MODEL_ID", "us.anthropic.claude-opus-4-5-20251101-v1:0")

def search_similar_commentary(query, vector_store_path, top_k=3):
    with open(vector_store_path, "rb") as f:
        index, docs, model = pickle.load(f)
    query_embedding = model.encode([query])
    query_embedding = np.array(query_embedding).astype("float32")
    distances, indices = index.search(query_embedding, top_k)
    top_sentences = [docs[i] for i in indices[0]]
    return top_sentences

def generate_commentary(query, vector_store_path):
    similar_sentences = search_similar_commentary(query, vector_store_path)
    context = "\n".join(similar_sentences[:3])
    
    try:
        system_prompt = (
            "당신은 축구 경기 실시간 해설가입니다. "
            "주어진 경기 상황 데이터를 바탕으로 자연스럽고 생동감 있는 한국어 해설을 1~2문장으로 작성하세요. "
            "참고 해설 예시를 톤 참고용으로 활용하되, 그대로 복사하지 마세요. "
            "해설은 간결하고 흥미롭게 작성하세요."
        )
        
        user_message = f"경기 상황:\n{query}\n\n참고 해설 예시:\n{context}"
        
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 200,
            "temperature": 0.8,
            "system": system_prompt,
            "messages": [
                {
                    "role": "user",
                    "content": user_message
                }
            ]
        }
        
        response = bedrock.invoke_model(
            modelId=COMMENTARY_MODEL_ID,
            body=json.dumps(request_body)
        )
        
        response_body = json.loads(response["body"].read())
        return response_body["content"][0]["text"].strip()
        
    except Exception as e:
        print(f"[BEDROCK ERROR] {e}")
        if similar_sentences:
            return similar_sentences[0]
        return "해설을 생성할 수 없습니다."
