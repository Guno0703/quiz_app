'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function QuizPage() {
  const router = useRouter();
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answers, setAnswers] = useState([]);
  const [score, setScore] = useState(0);

  useEffect(() => {
    fetch('http://localhost:4000/quizzes')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then((data) => {
        const selectedQuiz = data.find((q) => q.id === id);
        if (selectedQuiz) {
          setQuiz(selectedQuiz);
          setAnswers(new Array(selectedQuiz.questions.length).fill(null));
        } else {
          router.push('/');
        }
      })
      .catch((error) => {
        console.error('Error fetching quiz:', error);
        router.push('/');
      });
  }, [id, router]);

  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer);
  };

  const handleNext = () => {
    if (!selectedAnswer) return;

    const isCorrect = selectedAnswer === quiz.questions[currentQuestion].correctAnswer;
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = { answer: selectedAnswer, isCorrect };
    setAnswers(newAnswers);
    if (isCorrect) setScore(score + 1);

    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer('');
    } else {
      const scoreEntry = {
        quizTitle: quiz.title,
        score,
        total: quiz.questions.length,
        date: new Date().toISOString(),
      };
      const history = JSON.parse(localStorage.getItem('quizScores') || '[]');
      history.push(scoreEntry);
      localStorage.setItem('quizScores', JSON.stringify(history));

      router.push(`/quiz/${id}/results?score=${score}&total=${quiz.questions.length}`);
    }
  };

  if (!quiz) return <div>Loading...</div>;

  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-6">{quiz.title}</h1>
      <div className="w-full max-w-2xl bg-white p-6 rounded shadow">
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Question {currentQuestion + 1} of {quiz.questions.length}
          </p>
        </div>
        <h2 className="text-xl font-semibold mb-4">
          {quiz.questions[currentQuestion].question}
        </h2>
        <div className="space-y-2">
          {quiz.questions[currentQuestion].options.map((option, index) => (
            <div key={index} className="flex items-center">
              <input
                type="radio"
                id={`option-${index}`}
                name="answer"
                value={option}
                checked={selectedAnswer === option}
                onChange={() => handleAnswerSelect(option)}
                className="mr-2"
              />
              <label htmlFor={`option-${index}`}>{option}</label>
            </div>
          ))}
        </div>
        <button
          onClick={handleNext}
          disabled={!selectedAnswer}
          className={`mt-6 px-4 py-2 rounded ${
            selectedAnswer ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 text-gray-600 cursor-not-allowed'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}