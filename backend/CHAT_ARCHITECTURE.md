# Chat.py Architecture - 4-Stage Agent System

## Overview
The chatbot now uses a **4-stage agent pipeline** to provide exact, precise answers while filtering out irrelevant questions.

## Architecture Flow

```
User Question
     ↓
[Stage 0: Validate Query Relevance]
     ↓
  Relevant? ──NO──→ [Decline Node] → Return polite message
     ↓ YES
[Stage 1: Restructure Query]
     ↓
[Stage 2: Retrieve Documents]
     ↓
[Stage 3: Generate Answer]
     ↓
  Return exact answer
```

## Stage Details

### Stage 0: Validation (`validate_query_relevance`)
**Purpose**: Filter out questions unrelated to Sanjay K's portfolio

**How it works**:
- Uses LLM to check if question is about Sanjay K's:
  - Projects
  - Skills
  - Education & CGPA
  - Internships/Experience
  - Achievements
  - Personal/Professional details

**Output**:
- If **IRRELEVANT**: Routes to decline node → Returns: *"I'm here to help with questions about Sanjay K's portfolio..."*
- If **RELEVANT**: Continues to Stage 1

**Examples**:
- ✅ "sanjay any done internship" → RELEVANT
- ✅ "what is cgpa" → RELEVANT
- ❌ "what is the capital of France" → IRRELEVANT
- ❌ "how to learn Python" → IRRELEVANT

---

### Stage 1: Query Restructuring (`restructure_query`)
**Purpose**: Convert casual/unclear questions into structured, precise queries

**How it works**:
- Takes original user question
- Uses LLM to parse intent and create a clear, structured query
- Identifies:
  - Information type (count, existence, details, list)
  - Target section (projects, skills, etc.)
  - Specific constraints

**Examples**:
- Input: "sanjay any done internship"
  - Output: "Check if Sanjay K has completed any internships. If yes, provide company name, duration, and key highlights."

- Input: "how many project is done"
  - Output: "Count the total number of projects completed by Sanjay K."

- Input: "what is cgpa"
  - Output: "What is Sanjay K's CGPA score?"

---

### Stage 2: Document Retrieval (`retrieve_docs`)
**Purpose**: Fetch relevant information from vector database

**How it works**:
- Uses the **restructured query** (not original) for better search accuracy
- Retrieves from Pinecone vector store
- Applies section filters when appropriate
- Fetches 50 docs for specific sections, 20 for general queries

**Prompt Engineering**:
- Provides context from retrieved documents
- Includes original question + structured query
- Gives clear instructions for concise responses:
  - Yes/No questions → Start with Yes/No + 1 sentence
  - "What is" questions → Exact value in 1-2 sentences
  - Count questions → Number + 2-3 highlights
  - Existence questions → Yes/No + name + 1-line description
  - **Target**: Under 100 words unless full list requested

---

### Stage 3: Answer Generation (`create_llm_chain`)
**Purpose**: Generate the final, exact answer

**System Prompt**:
```
"You are a concise portfolio assistant. 
Provide exact answers without unnecessary elaboration. 
Be direct and precise."
```

**Configuration**:
- Model: `llama-3.1-8b-instant`
- Temperature: `0.1` (low for consistency)

---

## Benefits of This Architecture

1. **Relevance Filtering**: Rejects off-topic questions immediately
2. **Query Clarity**: Restructuring ensures LLM understands exact intent
3. **Precise Retrieval**: Structured queries improve vector search accuracy
4. **Exact Answers**: Clear prompts prevent verbose/rambling responses
5. **User Experience**: Fast rejection of irrelevant queries saves API calls

---

## Example Flows

### Example 1: Relevant Question
```
User: "sanjay any done internship"
  ↓
Validate: RELEVANT ✓
  ↓
Restructure: "Check if Sanjay K completed any internships. 
              If yes, provide company, duration, key highlights."
  ↓
Retrieve: [Documents about internship at Aerele Technologies]
  ↓
Generate: "Yes, Sanjay K completed a Software Developer Internship 
           at Aerele Technologies from August to October 2025."
```

### Example 2: Irrelevant Question
```
User: "what is the capital of France"
  ↓
Validate: IRRELEVANT ✗
  ↓
Decline: "I'm here to help with questions about Sanjay K's portfolio. 
          I can answer questions about his projects, skills, education, 
          internships, achievements, and professional background. 
          Please ask something related to his portfolio!"
```

### Example 3: Count Question
```
User: "how many project is done"
  ↓
Validate: RELEVANT ✓
  ↓
Restructure: "Count total number of projects completed by Sanjay K."
  ↓
Retrieve: [All project documents - 9 projects]
  ↓
Generate: "Sanjay K has completed 9 projects, including:
           • Event Management System (MERN Stack)
           • AI Mock Interview Platform
           • Museum Ticket Booking Chatbot"
```

---

## Configuration

### API Keys Required
- `GROQ_API_KEY` - For LLM inference
- `OPENROUTER_API_KEY` - For embeddings
- `PINECONE_API_KEY` - For vector store

### Model Settings
- **LLM**: Groq's `llama-3.1-8b-instant`
- **Embeddings**: `openai/text-embedding-3-small` (1536 dim)
- **Vector DB**: Pinecone index `portfolio-chatbot`

---

## Testing the System

### To Run:
```bash
cd d:\mockai\backend
python chat.py
```

### Test Cases:

**Relevant Questions:**
- "sanjay any done internship" → Should return YES + details
- "what is cgpa" → Should return "8.35/10"
- "how many project is done" → Should return "9 projects"
- "list all skills" → Should list technical skills

**Irrelevant Questions:**
- "what is python" → Should decline
- "who is elon musk" → Should decline
- "best AI frameworks" → Should decline

---

## Notes
- All stages use temperature `0.0` or `0.1` for consistency
- Conditional routing prevents wasteful API calls on irrelevant questions
- Messages are tagged (RELEVANT/NOT_RELEVANT/RESTRUCTURED) for routing logic
