import React from 'react';
import { FileText, ArrowRight, ArrowLeft } from 'lucide-react';

export default function QuestionsStage({ questions, answers, setAnswers, onNext, onBack, loading }) {
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
            <div key={i} className="space-y-3">
              <label className="block text-sm text-zinc-300 font-medium">
                <span className="text-[var(--color-gold-dim)] font-mono mr-2">{String(i + 1).padStart(2, '0')}.</span>
                {question}
              </label>
              <textarea
                value={answers[i] || ''}
                onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
                className="w-full h-28 bg-[var(--color-bg-surface)] border border-[var(--glass-border)] rounded-xl px-5 py-4 text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--color-gold-subtle)] focus:ring-1 focus:ring-[var(--color-gold-subtle)] transition-all resize-none text-sm"
                placeholder="Your answer..."
              />
            </div>
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
