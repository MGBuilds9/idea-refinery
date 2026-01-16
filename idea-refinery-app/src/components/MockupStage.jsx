import React from 'react';
import { Download, Sparkles, Check, Copy } from 'lucide-react';

export default function MockupStage({ 
  masterPrompt, 
  htmlMockup, 
  onStartOver, 
  onDownloadMarkdown,
  onDownloadHTML,
  onDownloadBoth,
  loading 
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <Sparkles className="w-12 h-12 text-amber-400 mb-4" />
          <p className="text-slate-300 font-mono">
            Generating HTML mockup...
          </p>
        </div>
      ) : (
        <>
          {/* Master Takeoff Prompt */}
          {masterPrompt && (
            <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur border border-purple-500/30 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-purple-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-300">
                  <Sparkles className="w-5 h-5" />
                  <h2 className="text-lg font-serif">
                    Master Takeoff Prompt
                  </h2>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(masterPrompt);
                    alert('Master prompt copied! Paste into Cursor, Lovable, Bolt, or Replit.');
                  }}
                  className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded text-sm transition-all font-mono"
                >
                  <Copy className="w-4 h-4" />
                  COPY PROMPT
                </button>
              </div>
              <div className="p-6 max-h-64 overflow-y-auto bg-slate-900/50">
                <p className="text-xs text-purple-200 mb-3 font-mono">
                  Paste this into Cursor, Antigravity, Lovable, Replit, or Bolt to start building:
                </p>
                <pre className="whitespace-pre-wrap text-xs text-purple-100 font-mono">
                  {masterPrompt}
                </pre>
              </div>
            </div>
          )}

          {/* HTML Mockup */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-5 h-5" />
                <h2 className="text-lg font-serif">
                  Design Mockup Preview
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onDownloadMarkdown}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm transition-all font-mono"
                >
                  <Download className="w-4 h-4" />
                  BLUEPRINT.MD
                </button>
                <button
                  onClick={onDownloadHTML}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm transition-all font-mono"
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
              />
            </div>
            
            <div className="p-4 bg-slate-900/50 border-t border-slate-700">
              <p className="text-xs text-slate-400 text-center font-mono">
                Scroll to bottom of HTML for embedded blueprint copy button
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onStartOver}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-lg transition-all font-mono"
            >
              CREATE NEW PROJECT
            </button>
            <button
              onClick={onDownloadBoth}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium py-4 rounded-lg transition-all flex items-center justify-center gap-2 font-mono"
            >
              <Download className="w-4 h-4" />
              DOWNLOAD BOTH FILES
            </button>
          </div>
        </>
      )}
    </div>
  );
}
