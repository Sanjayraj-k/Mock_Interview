import os
import logging
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langgraph.graph import StateGraph, END
from typing import TypedDict

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Configuration
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "your-grok-api-key-here")

# Initialize LLM
try:
    llm = ChatGroq(
        temperature=0.2,
        model_name="meta-llama/llama-4-maverick-17b-128e-instruct",  # Valid Grok model
        groq_api_key=GROQ_API_KEY
    )
except Exception as e:
    logger.error(f"LLM initialization failed: {str(e)}")
    raise

# Define the state
class GraphState(TypedDict):
    input_text: str
    summary: str

# Node 1: Process input
def process_input(state: GraphState) -> GraphState:
    logger.info(f"Processing input: {state['input_text']}")
    return {"input_text": state["input_text"], "summary": ""}

# Node 2: Generate summary
def generate_summary(state: GraphState) -> GraphState:
    try:
        prompt = ChatPromptTemplate.from_template(
            "Summarize the following text in 2-3 sentences:\n\n{input_text}"
        )
        chain = prompt | llm | StrOutputParser()
        summary = chain.invoke({"input_text": state["input_text"]})
        logger.info(f"Generated summary: {summary}")
        return {"input_text": state["input_text"], "summary": summary}
    except Exception as e:
        logger.error(f"Summary generation failed: {str(e)}")
        raise

# Define the graph
def create_simple_graph():
    workflow = StateGraph(GraphState)
    workflow.add_node("process_input", process_input)
    workflow.add_node("generate_summary", generate_summary)
    workflow.add_edge("process_input", "generate_summary")
    workflow.add_edge("generate_summary", END)
    workflow.set_entry_point("process_input")
    return workflow.compile()

if __name__ == "__main__":
    # Test the graph locally
    graph = create_simple_graph()
    result = graph.invoke({"input_text": "The quick brown fox jumps over the lazy dog. This is a test sentence to summarize."})
    print("Result:", result)