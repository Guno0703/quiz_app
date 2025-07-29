'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [quizzes, setQuizzes] = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);

  useEffect(() => {
    // Fetch quiz data from API
    fetch('http://localhost:4000')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then((data) => setQuizzes(data))
      .catch((error) => {
        console.error('Error fetching quizzes:', error);
        setQuizzes([]);
      });

    // Load score history from localStorage
    const history = JSON.parse(localStorage.getItem('quizScores') || '[]');
    setScoreHistory(history);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-6">Quiz App</h1>
      <div className="w-full max-w-2xl">
        <h2 className="text-2xl font-semibold mb-4">Available Quizzes</h2>
        {quizzes.length === 0 ? (
          <p>Loading quizzes...</p>
        ) : (
          <ul className="space-y-4">
            {quizzes.map((quiz) => (
              <li key={quiz.id} className="bg-white p-4 rounded shadow">
                <h3 className="text-xl font-medium">{quiz.title}</h3>
                <p>Category: {quiz.category}</p>
                <p>Questions: {quiz.questions.length}</p>
                <Link href={`/quiz/${quiz.id}`}>
                  <button className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                    Start Quiz
                  </button>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {scoreHistory.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">Score History</h2>
            <ul className="space-y-2">
              {scoreHistory.map((score, index) => (
                <li key={index} className="bg-white p-2 rounded shadow">
                  {score.quizTitle} - Score: {score.score}/{score.total} (
                  {((score.score / score.total) * 100).toFixed(2)}%) -{' '}
                  {new Date(score.date).toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}