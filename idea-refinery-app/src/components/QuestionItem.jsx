import React, { memo } from 'react';

const QuestionItem = memo(function QuestionItem({ question, answer, index, onAnswerChange, onBlur }) {
  return (
    <div className="space-y-3">
      <label className="block text-sm text-zinc-300 font-medium">
        <span className="text-[#d4af37]/60 font-mono mr-2">{String(index + 1).padStart(2, '0')}.</span>
        {question}
      </label>
      <textarea
        value={answer}
        onChange={(e) => onAnswerChange(index, e.target.value)}
        onBlur={onBlur}
        className="w-full h-28 bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-zinc-600 focus:outline-none focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 transition-all resize-none text-sm"
        placeholder="Your answer..."
      />
    </div>
  );
});

QuestionItem.displayName = 'QuestionItem';

export default QuestionItem;
