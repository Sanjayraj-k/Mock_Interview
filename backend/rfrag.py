    import os
    from dotenv import load_dotenv
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_openai import OpenAIEmbeddings
    from langchain_community.vectorstores import Chroma
    from langchain_groq import ChatGroq
    from langchain.chains import RetrievalQA
    from langchain.retrievers.multi_query import MultiQueryRetriever
    from langchain.prompts import PromptTemplate
    from langchain_community.document_loaders import PyPDFLoader

    # --------------------------------------------------
    # ENV SETUP
    # --------------------------------------------------
    load_dotenv()

    os.environ["OPENAI_API_KEY"] = os.getenv("OPENROUTER_API_KEY")
    os.environ["OPENAI_API_BASE"] = "https://openrouter.ai/api/v1"

    # --------------------------------------------------
    # STEP 1: LOAD DOCUMENTS
    loader = PyPDFLoader("text.pdf")
    documents = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    docs = splitter.split_documents(documents)

    # --------------------------------------------------
    # STEP 2: EMBEDDINGS (OpenAI via OpenRouter)
    # --------------------------------------------------
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-large"
    )

    # --------------------------------------------------
    # STEP 3: CHROMA VECTOR STORE
    # --------------------------------------------------
    vectorstore = Chroma.from_documents(
        documents=docs,
        embedding=embeddings,
        persist_directory="./chroma_db"
    )
    vectorstore.persist()

    base_retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

    # --------------------------------------------------
    # STEP 4: GROQ LLaMA LLM
    # --------------------------------------------------
    llm = ChatGroq(
        model_name="llama3-70b-8192",
        temperature=0.1
    )

    # --------------------------------------------------
    # STEP 5: RF-RAG (MultiQuery + RRF)
    # --------------------------------------------------
    retriever = MultiQueryRetriever.from_llm(
        retriever=base_retriever,
        llm=llm
    )
    retriever.verbose = True  # IMPORTANT

    # --------------------------------------------------
    # STEP 6: PROMPT
    # --------------------------------------------------
    prompt = PromptTemplate(
        template="""
    Use the following context to answer the question.
    If the answer is not in the context, say "I don't know".

    Context:
    {context}

    Question:
    {question}

    Answer:
    """,
        input_variables=["context", "question"]
    )

    # --------------------------------------------------
    # STEP 7: RETRIEVAL QA CHAIN
    # --------------------------------------------------
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        chain_type_kwargs={"prompt": prompt},
        return_source_documents=True
    )

    # --------------------------------------------------
    # STEP 8: QUERY
    # --------------------------------------------------
    query = "Problems Solved By Machine Learning"
    result = qa_chain.invoke({"query": query})

    print("\nANSWER:\n", result["result"])
    print("\nSOURCES:")
    for doc in result["source_documents"]:
        print("-", doc.metadata)
