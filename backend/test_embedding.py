import os
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

try:
    embeddings = OpenAIEmbeddings(
        model="sentence-transformers/all-minilm-l12-v2",
        openai_api_base="https://openrouter.ai/api/v1",
        openai_api_key=OPENROUTER_API_KEY
    )
    
    print("Testing embedding...")
    res = embeddings.embed_query("Hello world")
    print(f"Embedding successful. Dimension: {len(res)}")
except Exception as e:
    print(f"Embedding failed: {e}")
