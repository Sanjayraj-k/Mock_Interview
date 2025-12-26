import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, FileText, Loader2, Search, BookOpen, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PlacementPaperGenerator = () => {
    const [messages, setMessages] = useState([
        {
            type: 'system',
            content: 'Hello! I can generate placement papers for major companies like TCS, Infosys, Wipro, etc. Just ask me for a question paper!',
            timestamp: new Date().toLocaleTimeString()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = {
            type: 'user',
            content: input,
            timestamp: new Date().toLocaleTimeString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:4000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: userMessage.content }),
            });

            const data = await response.json();
            let parsedContent;
            let isJson = false;

            try {
                // Attempt to clean markdown code blocks if present
                // The backend returns the result in 'output' field
                const contentToParse = data.output || data.response;
                const cleanJson = contentToParse.replace(/```json\n?|\n?```/g, '').trim();
                parsedContent = JSON.parse(cleanJson);
                isJson = true;
            } catch (e) {
                console.log("Response is not JSON, falling back to text", e);
                parsedContent = data.output || data.response;
            }

            const botMessage = {
                type: 'assistant',
                content: parsedContent,
                isJson: isJson,
                timestamp: new Date().toLocaleTimeString()
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Error:', error);
            const errorMessage = {
                type: 'assistant',
                content: 'Sorry, I encountered an error while connecting to the server. Please try again later.',
                isError: true,
                timestamp: new Date().toLocaleTimeString()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const QuestionItem = ({ question, index }) => {
        const [showAnswer, setShowAnswer] = useState(false);

        return (
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-4">
                <div className="flex gap-3">
                    <span className="font-bold text-indigo-600 min-w-[24px]">{index + 1}.</span>
                    <div className="flex-1">
                        <p className="text-gray-800 font-medium mb-3">{question.question}</p>

                        {question.options && question.options.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                                {question.options.map((opt, i) => (
                                    <div key={i} className="p-2 bg-gray-50 rounded border border-gray-100 text-sm text-gray-700">
                                        {opt}
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setShowAnswer(!showAnswer)}
                            className="text-sm flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                        >
                            {showAnswer ? (
                                <>
                                    <ChevronUp className="w-4 h-4" /> Hide Answer
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="w-4 h-4" /> Show Answer
                                </>
                            )}
                        </button>

                        <AnimatePresence>
                            {showAnswer && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-lg flex items-start gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-bold text-green-800 text-sm block mb-1">Correct Answer:</span>
                                            <p className="text-green-700 text-sm">{question.answer}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        );
    };

    const PaperRenderer = ({ data }) => {
        if (!data || !data.sections) return <div className="text-red-500">Invalid paper format</div>;

        return (
            <div className="w-full max-w-4xl">
                <div className="bg-indigo-600 text-white p-6 rounded-t-2xl">
                    <h2 className="text-2xl font-bold text-center">{data.title}</h2>
                    <p className="text-center text-indigo-100 text-sm mt-2">Generated by AI Assistant</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-b-2xl border border-gray-200 border-t-0">
                    {data.sections.map((section, sIdx) => (
                        <div key={sIdx} className="mb-8 last:mb-0">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-indigo-600" />
                                {section.section_name}
                            </h3>
                            <div className="space-y-4">
                                {section.questions.map((q, qIdx) => (
                                    <QuestionItem key={qIdx} question={q} index={qIdx} />
                                ))}
                            </div>
                        </div>
                    ))}
                    {
                        data.sources && data.sources.length > 0 && (
                            <div className="mt-6 bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <Search className="w-4 h-4 text-indigo-600" />
                                    Sources & References
                                </h3>
                                <ul className="space-y-2">
                                    {data.sources.map((source, idx) => (
                                        <li key={idx}>
                                            <a
                                                href={source}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 truncate"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                                {source}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )
                    }
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-indigo-100 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                                Placement Paper Generator
                            </h1>
                            <p className="text-xs text-gray-500 font-medium">Powered by AI & Real-time Web Search</p>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full font-medium">
                        <Sparkles className="w-4 h-4" />
                        <span>Generates live questions</span>
                    </div>
                </div>
            </header>

            {/* Chat Area */}
            <div className="flex-1 max-w-5xl mx-auto w-full p-4 overflow-y-auto">
                <div className="space-y-6 pb-4">
                    <AnimatePresence>
                        {messages.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex w-full gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* Avatar */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.type === 'user' ? 'bg-indigo-600' : 'bg-white border border-indigo-100'
                                        }`}>
                                        {msg.type === 'user' ? (
                                            <User className="w-5 h-5 text-white" />
                                        ) : (
                                            <Bot className="w-5 h-5 text-indigo-600" />
                                        )}
                                    </div>

                                    {/* Message Bubble */}
                                    <div className={`rounded-2xl shadow-sm overflow-hidden ${msg.type === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-none p-4 max-w-[85%]'
                                        : msg.isError
                                            ? 'bg-red-50 text-red-800 border border-red-100 rounded-tl-none p-4 max-w-[85%]'
                                            : msg.isJson
                                                ? 'w-full bg-transparent shadow-none'
                                                : 'bg-white border border-indigo-50 text-gray-800 rounded-tl-none p-4 max-w-[85%]'
                                        }`}>
                                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                            {msg.isJson ? (
                                                <PaperRenderer data={msg.content} />
                                            ) : (
                                                msg.content
                                            )}
                                        </div>
                                        {!msg.isJson && (
                                            <div className={`text-[10px] mt-2 ${msg.type === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                                                {msg.timestamp}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="flex gap-3 max-w-[75%]">
                                <div className="w-8 h-8 rounded-full bg-white border border-indigo-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                                </div>
                                <div className="bg-white border border-indigo-50 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                </div>
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-indigo-100 p-4 sticky bottom-0">
                <div className="max-w-5xl mx-auto">
                    <form onSubmit={handleSend} className="relative flex items-center gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask for a placement paper (e.g., 'Generate TCS placement paper')..."
                                className="w-full pl-4 pr-12 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-gray-700 placeholder-gray-400"
                                disabled={isLoading}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <Search className="w-5 h-5" />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="p-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-200"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                    <p className="text-center text-xs text-gray-400 mt-3">
                        AI can make mistakes. Please verify important information.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PlacementPaperGenerator;
