import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * PreviousQuestion component – displays a list of previously asked interview questions.
 * It fetches data from the backend endpoint that uses `previousquestion.py`.
 * The UI follows the premium glassmorphism style used throughout the app.
 */
export default function PreviousQuestion() {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Simulated fetch – replace with real API call when backend is ready
    useEffect(() => {
        // Mock data for demonstration purposes
        const mock = [
            "Explain the concept of closures in JavaScript.",
            "What is the difference between TCP and UDP?",
            "How would you optimize a React application for performance?",
            "Describe the SOLID principles in OOP.",
        ];
        const timer = setTimeout(() => {
            setQuestions(mock);
            setLoading(false);
        }, 1200);
        return () => clearTimeout(timer);
    }, []);

    return (
        <section className="my-12 px-4 py-8 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                Previously Asked Questions
            </h2>
            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="animate-spin w-8 h-8 text-indigo-600" />
                </div>
            ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {questions.map((q, idx) => (
                        <li
                            key={idx}
                            className="p-6 bg-white/30 backdrop-blur-sm rounded-xl border border-white/30 hover:shadow-lg transition-shadow"
                        >
                            <p className="text-gray-800">{q}</p>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
