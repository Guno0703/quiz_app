'use client';

import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ResultPage() {
  const searchParams = useSearchParams();
  const { id } = useParams();
  const router = useRouter();

  const score = parseInt(searchParams.get('score') || '0', 10);
  const total = parseInt(searchParams.get('total') || '0', 10);

  const [quizTitle, setQuizTitle] = useState('');

  useEffect(() => {
    fetch('http://localhost:4000/quizzes')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch quizzes');
        return response.json();
      })
      .then((data) => {
        const quiz = data.find((q) => q.id === id);
        if (quiz) {
          setQuizTitle(quiz.title);
        } else {
          router.push('/');
        }
      })
      .catch((error) => {
        console.error('Error fetching quiz data:', error);
        router.push('/');
      });
  }, [id, router]);

  const percentage = ((score / total) * 100).toFixed(0);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">{quizTitle} - Results</h1>
        <p className="text-lg mb-2">
          You scored <span className="font-semibold">{score}</span> out of <span className="font-semibold">{total}</span>
        </p>
        <p className="text-3xl font-bold text-blue-600 my-4">{percentage}%</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Go to Home
        </button>
      </div>
    </div>
  );
}
