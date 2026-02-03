import React, { useState, useEffect, useCallback, memo } from 'react';
import { FileText, ArrowRight, ArrowLeft, SkipForward, Check } from 'lucide-react';
import QuestionItem from './QuestionItem';

const QuestionsStage = memo(function QuestionsStage({ questions, answers, setAnswers, onNext, onBack, loading }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // ⚡ Bolt Optimization: Local state for answers to prevent global re-renders on every keystroke
  const [localAnswers, setLocalAnswers] = useState(answers);

  useEffect(() => {
    setLocalAnswers(answers);
  }, [answers]);

  const handleAnswerChange = useCallback((index, value) => {
    setLocalAnswers(prev => ({ ...prev, [index]: value }));
  }, []);

  const handleBlur = useCallback(() => {
      setAnswers(localAnswers);
  }, [localAnswers, setAnswers]);

  const handleNext = () => {
    // Checkpoint save
    setAnswers(localAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onNext(localAnswers);
    }
  };

  const handleSkip = () => {
    let currentAnswers = localAnswers;
    // Ensure the current answer is empty string if undefined (explicit skip)
    if (!currentAnswers[currentIndex]) {
      const newAnswers = { ...currentAnswers, [currentIndex]: '' };
      setLocalAnswers(newAnswers);
      currentAnswers = newAnswers;
    }
    
    // Checkpoint save
    setAnswers(currentAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onNext(currentAnswers);
    }
  };

  const handleBack = () => {
    // Checkpoint save
    setAnswers(localAnswers);

    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      onBack();
    }
  };

  const currentQuestion = questions[currentIndex];
  // Use local answers for rendering
  const currentAnswer = localAnswers[currentIndex] || '';
  const isLastQuestion = currentIndex === questions.length - 1;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-8">
        <div 
          className="bg-[var(--color-primary)] h-1.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="glass-panel rounded-2xl p-8 min-h-[400px] flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--color-gold-subtle)]">
                  <FileText className="w-5 h-5 text-[var(--color-gold-primary)]" />
                </div>
                <div>
                  <h2 className="text-xl font-serif text-white">Question {currentIndex + 1} of {questions.length}</h2>
                  <p className="text-zinc-500 text-sm font-mono">Refining your blueprint</p>
                </div>
             </div>
             <span className="text-xs font-mono text-zinc-600">
               {Math.round(progress)}% COMPLETE
             </span>
          </div>

          <div className="py-4">
             <QuestionItem
                key={currentIndex}
                question={currentQuestion}
                answer={currentAnswer}
                index={currentIndex}
                onAnswerChange={handleAnswerChange}
                onBlur={handleBlur}
                autoFocus={true}
              />
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between pt-8 border-t border-zinc-800/50 mt-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white transition-colors font-mono text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {currentIndex === 0 ? 'BACK' : 'PREVIOUS'}
          </button>

          <div className="flex items-center gap-3">
             <button
                onClick={handleSkip}
                className="flex items-center gap-2 px-4 py-2 text-zinc-500 hover:text-zinc-300 transition-colors font-mono text-sm"
             >
                <SkipForward className="w-4 h-4" />
                SKIP
             </button>

             <button
                onClick={handleNext}
                disabled={loading}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold font-mono text-sm transition-all shadow-lg
                  ${isLastQuestion 
                    ? 'bg-[var(--color-gold-primary)] text-black hover:bg-[#C5A028] shadow-[0_0_20px_var(--color-gold-subtle)]' 
                    : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
                  }
                `}
             >
                {isLastQuestion ? (
                  <>FINISH <Check className="w-4 h-4" /></>
                ) : (
                  <>NEXT <ArrowRight className="w-4 h-4" /></>
                )}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default QuestionsStage;
