import React, { memo } from "react";

// Memoized to prevent re-renders of all inputs when one answer changes
const QuestionItem = memo(function QuestionItem({
  index,
  question,
  answer,
  onChange,
}) {
  const number = String(index + 1).padStart(2, "0");

  return (
    <div className="space-y-3">
      <label className="block text-sm text-zinc-300 font-medium">
        <span className="text-[var(--color-gold-dim)] font-mono mr-2">
          {number}.
        </span>
        {question}
      </label>
      <textarea
        value={answer || ""}
        onChange={(e) => onChange(index, e.target.value)}
        className="w-full h-28 bg-[var(--color-bg-surface)] border border-[var(--glass-border)] rounded-xl px-5 py-4 text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--color-gold-subtle)] focus:ring-1 focus:ring-[var(--color-gold-subtle)] transition-all resize-none text-sm"
        placeholder="Your answer..."
      />
    </div>
  );
});

export default QuestionItem;
