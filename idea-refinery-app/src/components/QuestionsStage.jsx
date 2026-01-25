import React, { useCallback } from 'react';
import { FileText, ArrowRight, ArrowLeft } from 'lucide-react';
import QuestionItem from './QuestionItem';

export default function QuestionsStage({ questions, answers, setAnswers, onNext, onBack, loading }) {
  const handleAnswerChange = useCallback((index, value) => {
    setAnswers(prev => ({ ...prev, [index]: value }));
  }, [setAnswers]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="glass-panel rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-[var(--color-gold-subtle)]">
            <FileText className="w-5 h-5 text-[var(--color-gold-primary)]" />
          </div>
          <div>
            <h2 className="text-xl font-serif text-white">Refinement Questions</h2>
            <p className="text-zinc-500 text-sm font-mono">Answer these to generate your blueprint</p>
          </div>
        </div>

        <div className="space-y-6">
          {questions.map((question, i) => (
            <QuestionItem
              key={i}
            <QuestionItem
              key={i}
              index={i}
              question={question}
              answer={answers[i]}
              onChange={handleAnswerChange}
            />
            />
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-4 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 rounded-xl transition-all font-mono text-sm border border-zinc-700/50"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK
        </button>
        <button
          onClick={onNext}
          disabled={Object.values(answers).some(a => !a.trim()) || loading}
          className="flex-1 bg-[var(--color-gold-primary)] hover:bg-[#C5A028] disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 group font-mono text-sm shadow-[0_0_20px_var(--color-gold-subtle)] disabled:shadow-none"
        >
          GENERATE BLUEPRINT
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
