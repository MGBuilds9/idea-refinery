import React from 'react';
import { FileText, ArrowRight } from 'lucide-react';

export default function QuestionsStage({ questions, answers, setAnswers, onNext, onBack, loading }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4 text-amber-400">
          <FileText className="w-5 h-5" />
          <h2 className="text-lg font-serif">
            Refinement Questions
          </h2>
        </div>
        <p className="text-slate-400 text-sm mb-6 font-mono">
          Answer these to generate your comprehensive blueprint
        </p>

        <div className="space-y-5">
          {questions.map((question, i) => (
            <div key={i} className="space-y-2">
              <label className="block text-sm text-slate-300 font-sans">
                {i + 1}. {question}
              </label>
              <textarea
                value={answers[i] || ''}
                onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
                className="w-full h-24 bg-slate-900/50 border border-slate-600 rounded px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none text-sm font-sans"
                placeholder="Your answer..."
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-lg transition-all font-mono"
        >
          START OVER
        </button>
        <button
          onClick={onNext}
          disabled={Object.values(answers).some(a => !a.trim()) || loading}
          className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-medium py-4 rounded-lg transition-all flex items-center justify-center gap-2 group font-mono"
        >
          GENERATE BLUEPRINT
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
