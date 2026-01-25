import React, { useState } from 'react';
import { Download, FileText, Code, ListChecks, Check, X, Shield, Sparkles } from 'lucide-react';

const ExportOption = ({ id, icon: Icon, title, description, isSelected, onClick }) => {
  // eslint-disable-next-line no-unused-vars
  const _ = Icon; // Explicitly use it to satisfy persistent linting issues
  return (
    <button
      onClick={() => onClick(id)}
      className={`
        w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left
        ${isSelected 
          ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] shadow-[var(--color-primary)]/10' 
          : 'bg-white/5 border-white/10 hover:border-white/20 opacity-60'}
      `}
    >
      <div className={`p-3 rounded-lg ${isSelected ? 'bg-[var(--color-primary)] text-black' : 'bg-white/10 text-white'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-sm text-white">{title}</h4>
        <p className="text-xs text-white/50">{description}</p>
      </div>
      <div className={`
        w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
        ${isSelected ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-black' : 'border-white/20'}
      `}>
        {isSelected && <Check className="w-4 h-4" />}
      </div>
    </button>
  );
};

const ExportModal = ({ isOpen, onClose, onExport }) => {
  const [options, setOptions] = useState({
    blueprint: true,
    cursorRules: true,
    implementationPlan: true,
    mockupHtml: false
  });

  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExport(options);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  const toggleOption = (id) => {
    setOptions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 bg-gradient-to-r from-[var(--color-primary)]/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--color-primary)] rounded-lg text-black">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-[var(--font-heading)] font-bold text-white uppercase tracking-tight">Export Flight Deck</h2>
              <p className="text-xs text-[var(--color-primary)] font-mono">READY FOR TAKEOFF</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <ExportOption 
              id="blueprint"
              icon={FileText}
              title="Project Blueprint"
              description="Standard BLUEPRINT.md with full specs and master prompt."
              isSelected={options.blueprint}
              onClick={toggleOption}
            />
            <ExportOption 
              id="cursorRules"
              icon={Code}
              title="Cursor Rules"
              description="Generates .cursorrules file tailored to your tech stack."
              isSelected={options.cursorRules}
              onClick={toggleOption}
            />
            <ExportOption 
              id="implementationPlan"
              icon={ListChecks}
              title="Implementation Plan"
              description="Step-by-step technical plan for LLM execution."
              isSelected={options.implementationPlan}
              onClick={toggleOption}
            />
            <ExportOption 
              id="mockupHtml"
              icon={Sparkles}
              title="Perspective Mockup"
              description="Interactive 3D HTML visualization of your idea."
              isSelected={options.mockupHtml}
              onClick={toggleOption}
            />
          </div>

          <div className="pt-6">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3 mb-6">
              <Shield className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/80 leading-relaxed font-[var(--font-body)]">
                <b>Pro Tip:</b> Use the .cursorrules file in Cursor or Windsurf to ground the AI in your project stack from the first instruction.
              </p>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting || !Object.values(options).some(v => v)}
              className={`
                w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                ${exporting ? 'bg-white/10 text-white/40 cursor-wait' : 'bg-[var(--color-primary)] hover:bg-[#C5A028] text-black shadow-lg shadow-[var(--color-primary)]/20'}
              `}
            >
              {exporting ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  INITIATING EXPORT...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  GENERATE EXPORT PACKAGE
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
