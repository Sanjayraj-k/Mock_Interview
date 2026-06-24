import os
from dotenv import load_dotenv
from pinecone import Pinecone
from langchain_pinecone import PineconeVectorStore

import chat1

load_dotenv()

def update_only():
    PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
    INDEX_NAME = "portfolio-chatbot"
    
    pc = Pinecone(api_key=PINECONE_API_KEY)
    
    existing_indexes = [i.name for i in pc.list_indexes()]
    if INDEX_NAME not in existing_indexes:
        print(f"Index {INDEX_NAME} does not exist. Please run the app first to create it.")
        return

    print("Loading new data from JSON...")
    texts, metadatas = chat1.load_portfolio_data("chatbot_training_data.json")
    print(f"Loaded {len(texts)} sections.")

    print(f"Connecting to existing index: {INDEX_NAME}...")
    index = pc.Index(INDEX_NAME)
    
    print("Clearing old records from the index...")
    try:
        index.delete(delete_all=True)
    except Exception as e:
        print(f"Note on clearing: {e}")

    print("Ingesting new data...")
    vectorstore = PineconeVectorStore(index=index, embedding=chat1.embeddings)
    vectorstore.add_texts(texts=texts, metadatas=metadatas)
    
    print("Pinecone DB successfully updated without deleting the index!")

if __name__ == "__main__":
    update_only()
