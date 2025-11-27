# mcp_server.py
from mcp.server.fastmcp import FastMCP

# Create an MCP server instance
mcp = FastMCP("addition-mcp-server")

# Define an MCP tool
@mcp.tool()
def add_numbers(num1: float, num2: float) -> float:
    """Add two numbers and return the result."""
    return num1 + num2

# Run the MCP server
if __name__ == "__main__":
    mcp.run()
