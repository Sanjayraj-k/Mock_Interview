from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
import operator
try:
    # Optional: only available in notebook/REPL environments
    from IPython.display import Image, display
except Exception:  # pragma: no cover - IPython may not be present
    Image = None
    display = None

# Define the state schema and nodes (same as your context)
class WorkflowState(TypedDict):
    question_count: int
    memory: list[str]
    response: str

def start_node(state: WorkflowState) -> WorkflowState:
    state["memory"].append("IntroPrompt processed")
    state["question_count"] = 0
    state["response"] = "Initial response from ChatGroq"
    return state

def submit_node(state: WorkflowState) -> WorkflowState:
    state["memory"].append("ProjectPrompt and CoreSubjectPrompt processed")
    state["question_count"] += 1
    state["response"] = "Submit response from ChatGroq"
    return state

def finish_node(state: WorkflowState) -> WorkflowState:
    state["memory"].append("EvaluationPrompt processed")
    state["response"] = "Final response"
    state["question_count"] = 0
    return state

# Initialize and build the graph
graph = StateGraph(WorkflowState)
graph.add_node("start", start_node)
graph.add_node("submit", submit_node)
graph.add_node("finish", finish_node)
graph.add_edge("start", "submit")
graph.add_conditional_edges(
    "submit",
    lambda state: "finish" if state["question_count"] >= 3 else "submit",
    {"submit": "submit", "finish": "finish"}
)
graph.add_edge("finish", END)
graph.set_entry_point("start")
app = graph.compile()

# Render Mermaid PNG directly from LangGraph and optionally display
png_bytes = app.get_graph().draw_mermaid_png()
with open("langraph_workflow.png", "wb") as f:
    f.write(png_bytes)
print("LangGraph workflow saved as langraph_workflow.png (Mermaid PNG)")

# If running in an environment that supports IPython display, show inline
if Image is not None and display is not None:
    display(Image(png_bytes))