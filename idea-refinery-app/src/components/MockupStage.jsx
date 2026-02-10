import React, { memo } from 'react';
import { Download, Sparkles, Check, Copy, Package, FileCode, FileText, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { ExportService } from '../services/ExportService';

const MockupStage = memo(function MockupStage({
  masterPrompt,
  htmlMockup,
  onStartOver,
  loading,
  ideaSpec,
  blueprint
}) {
  const handleExportAll = () => {
    if (ideaSpec) {
      ExportService.exportAll(ideaSpec, blueprint);
    }
  };

  const handleExportCursorRules = () => {
    const content = ExportService.toCursorRules(ideaSpec);
    ExportService.downloadFile('.cursorrules', content);
  };

  const handleExportPlan = () => {
    const content = ExportService.toImplementationPlan(ideaSpec);
    const name = (ideaSpec.meta?.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    ExportService.downloadFile(`${name}-implementation_plan.md`, content);
  };

  const handleExportPrompt = () => {
    const content = ExportService.toPromptMd(ideaSpec, blueprint);
    const name = (ideaSpec.meta?.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    ExportService.downloadFile(`${name}-prompt.md`, content);
  };

  const handleDownloadMarkdown = () => {
    ExportService.downloadFile('blueprint.md', blueprint);
  };

  const handleDownloadHTML = () => {
    ExportService.downloadFile('mockup.html', htmlMockup);
  };

  const handleDownloadBoth = () => {
    ExportService.downloadFile('blueprint.md', blueprint);
    setTimeout(() => ExportService.downloadFile('mockup.html', htmlMockup), 100);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <Sparkles className="w-12 h-12 text-[#d4af37] mb-4" />
          <p className="text-zinc-300 font-mono">
            Generating HTML mockup...
          </p>
        </div>
      ) : (
        <>
          {/* Master Takeoff Prompt */}
          {masterPrompt && (
            <div className="bg-gradient-to-br from-[#d4af37]/10 to-[#d4af37]/5 backdrop-blur border border-[#d4af37]/20 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-[#d4af37]/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#d4af37]">
                  <Sparkles className="w-5 h-5" />
                  <h2 className="text-lg font-sans font-semibold">
                    Master Takeoff Prompt
                  </h2>
                </div>
                <button
                  onClick={() => {
                  navigator.clipboard.writeText(masterPrompt);
                  toast.success('Master prompt copied! Paste into Cursor, OpenCode, Lovable, Bolt, or Replit.');
                }}
                className="flex items-center gap-2 bg-[#d4af37] hover:bg-[#c5a028] text-black px-4 py-2 rounded text-sm transition-all font-mono"
                >
                  <Copy className="w-4 h-4" />
                  COPY PROMPT
                </button>
              </div>
              <div className="p-6 max-h-64 overflow-y-auto bg-[#09090b]/50">
                <p className="text-xs text-[#d4af37]/80 mb-3 font-mono">
                  Paste this into Cursor, OpenCode, Lovable, Replit, or Bolt to start building:
                </p>
                <pre className="whitespace-pre-wrap text-xs text-zinc-300 font-mono">
                  {masterPrompt}
                </pre>
              </div>
            </div>
          )}

          {/* HTML Mockup */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="w-5 h-5" />
                <h2 className="text-lg font-sans font-semibold">
                  Design Mockup Preview
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadMarkdown}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded text-sm transition-all font-mono"
                >
                  <Download className="w-4 h-4" />
                  BLUEPRINT.MD
                </button>
                <button
                  onClick={handleDownloadHTML}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded text-sm transition-all font-mono"
                >
                  <Download className="w-4 h-4" />
                  MOCKUP.HTML
                </button>
              </div>
            </div>

            {/* HTML Preview */}
            <div className="bg-white">
              <iframe
                srcDoc={htmlMockup}
                className="w-full h-[600px] border-0"
                title="HTML Mockup Preview"
                sandbox="allow-scripts"
              />
            </div>

            <div className="p-4 bg-[#09090b]/50 border-t border-white/10">
              <p className="text-xs text-zinc-500 text-center font-mono">
                Scroll to bottom of HTML for embedded blueprint copy button
              </p>
            </div>
          </div>

          {/* v1.5 Export Flight Deck */}
          {ideaSpec && (
            <div className="bg-[#131316] border border-white/10 rounded-lg p-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-4 text-[#d4af37]">
                <Package className="w-5 h-5" />
                <h3 className="text-lg font-sans font-semibold">Export Flight Deck (v1.5)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <button
                  onClick={handleExportCursorRules}
                  className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/10 rounded hover:bg-white/10 hover:border-[#d4af37]/50 transition-all group"
                >
                  <Terminal className="w-6 h-6 text-zinc-400 group-hover:text-[#d4af37] mb-2" />
                  <span className="text-sm font-mono text-zinc-300">.cursorrules</span>
                  <span className="text-xs text-zinc-500 mt-1">Cursor AI Config</span>
                </button>

                <button
                  onClick={handleExportPlan}
                  className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/10 rounded hover:bg-white/10 hover:border-[#d4af37]/50 transition-all group"
                >
                  <FileText className="w-6 h-6 text-zinc-400 group-hover:text-[#d4af37] mb-2" />
                  <span className="text-sm font-mono text-zinc-300">implementation.md</span>
                  <span className="text-xs text-zinc-500 mt-1">Step-by-step Plan</span>
                </button>

                <button
                  onClick={handleExportPrompt}
                  className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/10 rounded hover:bg-white/10 hover:border-[#d4af37]/50 transition-all group"
                >
                  <FileCode className="w-6 h-6 text-zinc-400 group-hover:text-[#d4af37] mb-2" />
                  <span className="text-sm font-mono text-zinc-300">prompt.md</span>
                  <span className="text-xs text-zinc-500 mt-1">Full Context Dump</span>
                </button>

                <button
                  onClick={() => {
                    const content = ExportService.toOpenCodePrompt(ideaSpec);
                    const name = (ideaSpec.meta?.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    ExportService.downloadFile(`${name}-opencode.md`, content);
                  }}
                  className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/10 rounded hover:bg-white/10 hover:border-[#d4af37]/50 transition-all group"
                >
                  <Terminal className="w-6 h-6 text-zinc-400 group-hover:text-[#d4af37] mb-2" />
                  <span className="text-sm font-mono text-zinc-300">opencode.md</span>
                  <span className="text-xs text-zinc-500 mt-1">OpenCode Agent</span>
                </button>
              </div>

              <button
                onClick={handleExportAll}
                className="w-full bg-[#d4af37] hover:bg-[#c5a028] text-black font-medium py-3 rounded transition-all flex items-center justify-center gap-2 font-mono"
              >
                <Download className="w-4 h-4" />
                EXPORT ALL v1.5 FILES
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onStartOver}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-lg transition-all font-mono"
            >
              CREATE NEW PROJECT
            </button>
            <button
              onClick={handleDownloadBoth}
              className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-[#d4af37]/30 text-[#d4af37] font-medium py-4 rounded-lg transition-all flex items-center justify-center gap-2 font-mono"
            >
              <Download className="w-4 h-4" />
              DOWNLOAD LEGACY FORMATS
            </button>
          </div>
        </>
      )}
    </div>
  );
});

export default MockupStage;
