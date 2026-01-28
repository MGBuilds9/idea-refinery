import React, { useMemo, memo } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';

const DiffViewer = memo(function DiffViewer({ oldSpec, newSpec, onAccept, onReject }) {
  // ⚡ Bolt Optimization: Memoize the diff calculation to avoid O(N) work on every render
  // Must be called before any early returns to satisfy Rules of Hooks
  const featureChanges = useMemo(() => {
    if (!oldSpec || !newSpec) return [];

    const changes = [];
    const oldFeatures = oldSpec.features || [];
    const newFeatures = newSpec.features || [];

    // Find new and changed features
    newFeatures.forEach((newF) => {
      const oldF = oldFeatures.find((f) => f.id === newF.id);
      if (!oldF) {
        changes.push({ type: 'added', feature: newF });
      } else if (JSON.stringify(oldF) !== JSON.stringify(newF)) {
        changes.push({ type: 'changed', old: oldF, new: newF });
      }
    });

    // Find removed features
    oldFeatures.forEach((oldF) => {
      if (!newFeatures.find((f) => f.id === oldF.id)) {
        changes.push({ type: 'removed', feature: oldF });
      }
    });

    return changes;
  }, [oldSpec, newSpec]);

  if (!oldSpec || !newSpec) return null;

  const renderDiffLine = (label, oldValue, newValue) => {
    const isChanged = oldValue !== newValue;
    if (!isChanged) return null;

    return (
      <div className="py-3 border-b border-[var(--color-border)] last:border-0">
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-mono mb-1">
          {label}
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-sm line-through text-red-400 bg-red-400/5 px-2 py-1 rounded">
            {oldValue || '(Empty)'}
          </div>
          <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/5 px-2 py-1 rounded">
            <ArrowRight className="w-3 h-3" />
            {newValue || '(Empty)'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[var(--color-card)] border border-[var(--color-primary)]/30 rounded-xl overflow-hidden shadow-2xl animate-slide-up">
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-primary)]/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
          <h3 className="font-[var(--font-heading)] font-bold text-[var(--color-primary)]">Proposed Refinements</h3>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onReject}
            className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
            title="Reject Changes"
          >
            <X className="w-5 h-5" />
          </button>
          <button 
            onClick={onAccept}
            className="p-2 hover:bg-green-500/10 text-green-400 rounded-lg transition-colors font-bold flex items-center gap-2 px-4 bg-green-500/10"
          >
            <Check className="w-5 h-5" />
            ACCEPT
          </button>
        </div>
      </div>

      <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
        {/* Meta Changes */}
        <section>
          <h4 className="text-xs font-mono text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
            <span className="w-1 h-1 bg-[var(--color-primary)] rounded-full" />
            METADATA
          </h4>
          <div className="space-y-1">
            {renderDiffLine('Project Name', oldSpec.meta?.name, newSpec.meta?.name)}
            {renderDiffLine('Tagline', oldSpec.meta?.tagline, newSpec.meta?.tagline)}
          </div>
        </section>

        {/* Feature Changes */}
        {featureChanges.length > 0 && (
          <section>
            <h4 className="text-xs font-mono text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
              <span className="w-1 h-1 bg-[var(--color-primary)] rounded-full" />
              FEATURES
            </h4>
            <div className="space-y-4">
              {featureChanges.map((change, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/50">
                  {change.type === 'added' && (
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-[10px] uppercase font-bold">New</span>
                      <span className="font-bold">{change.feature.title}</span>
                    </div>
                  )}
                  {change.type === 'removed' && (
                    <div className="flex items-center gap-2 text-red-400 text-sm opacity-60">
                      <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-[10px] uppercase font-bold">Removed</span>
                      <span className="line-through">{change.feature.title}</span>
                    </div>
                  )}
                  {change.type === 'changed' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-400 text-sm">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px] uppercase font-bold">Modified</span>
                        <span className="font-bold">{change.new.title}</span>
                      </div>
                      <div className="pl-4 space-y-2 text-xs border-l border-[var(--color-border)] ml-2">
                        {renderDiffLine('User Story', change.old.user_story, change.new.user_story)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
});

export default DiffViewer;
