import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { FileText, ArrowLeft, Check, SkipForward } from 'lucide-react';
import QuestionItem from './QuestionItem';

const QuestionsStage = memo(function QuestionsStage({ questions, answers, setAnswers, onNext, onBack, loading }) {
  const [localAnswers, setLocalAnswers] = useState(answers);
  const localAnswersRef = useRef(localAnswers);
  const firstUnansweredRef = useRef(null);

  useEffect(() => {
    setLocalAnswers(answers);
  }, [answers]);

  useEffect(() => {
    localAnswersRef.current = localAnswers;
  }, [localAnswers]);

  useEffect(() => {
    return () => {
      setAnswers(localAnswersRef.current);
    };
  }, [setAnswers]);

  // Auto-focus the first unanswered question
  useEffect(() => {
    if (firstUnansweredRef.current) {
      firstUnansweredRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleAnswerChange = useCallback((index, value) => {
    setLocalAnswers(prev => ({ ...prev, [index]: value }));
  }, []);

  const handleBlur = useCallback(() => {
  }, []);

  const handleFinish = () => {
    setAnswers(localAnswers);
    onNext(localAnswers);
  };

  const handleAnswerAllLater = () => {
    setAnswers(localAnswers);
    onNext(localAnswers);
  };

  // Count answered questions (non-empty)
  const answeredCount = questions.filter((_, i) => localAnswers[i] && localAnswers[i].trim().length > 0).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  // Find first unanswered index for auto-focus
  const firstUnansweredIndex = questions.findIndex((_, i) => !localAnswers[i] || localAnswers[i].trim().length === 0);

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-4">
        <div
          className="bg-[#d4af37] h-1.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="glass-panel rounded-2xl p-8 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#d4af37]/10">
              <FileText className="w-5 h-5 text-[#d4af37]" />
            </div>
            <div>
              <h2 className="text-xl font-sans font-semibold text-white">Refine Your Blueprint</h2>
              <p className="text-zinc-500 text-sm font-mono">Answer these to fill in the gaps</p>
            </div>
          </div>
          <span className="text-xs font-mono text-zinc-600">
            {answeredCount} of {questions.length} ANSWERED
          </span>
        </div>

        {/* Scrollable question list */}
        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {questions.map((question, index) => (
            <div
              key={index}
              ref={index === firstUnansweredIndex ? firstUnansweredRef : null}
            >
              <QuestionItem
                question={question}
                answer={localAnswers[index] || ''}
                index={index}
                onAnswerChange={handleAnswerChange}
                onBlur={handleBlur}
                autoFocus={index === firstUnansweredIndex}
              />
            </div>
          ))}
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between pt-8 border-t border-white/10 mt-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white transition-colors font-mono text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK
          </button>

          <div className="flex items-center gap-3">
            {answeredCount < questions.length && (
              <button
                onClick={handleAnswerAllLater}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-zinc-500 hover:text-zinc-300 transition-colors font-mono text-sm"
              >
                <SkipForward className="w-4 h-4" />
                ANSWER ALL LATER
              </button>
            )}

            <button
              onClick={handleFinish}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold font-mono text-sm transition-all shadow-lg bg-[#d4af37] text-black hover:bg-[#c5a028] shadow-[0_0_20px_rgba(212,175,55,0.15)]"
            >
              FINISH <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default QuestionsStage;
