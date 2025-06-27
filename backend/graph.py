from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
import operator
import pygraphviz as pgv

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

# Get the graph and convert to pygraphviz
langraph_graph = app.get_graph()

# Manually create a pygraphviz graph
G = pgv.AGraph(directed=True)
for node in langraph_graph.nodes:
    G.add_node(node, shape="box")
for edge in langraph_graph.edges:
    G.add_edge(edge[0], edge[1])

# Save the graph as PNG
G.layout(prog="dot")
G.draw("langraph_workflow.png")
print("Langraph workflow saved as langraph_workflow.png")