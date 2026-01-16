import React, { useState, useEffect } from 'react';
import { FileText, Eye, Clock, ArrowLeft, Copy, Check } from 'lucide-react';

/**
 * PublicBlueprintView - Read-only view for publicly shared blueprints
 * Rendered at /public/:id route
 */
export default function PublicBlueprintView({ blueprintId }) {
  const [blueprint, setBlueprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchBlueprint = async () => {
      try {
        const serverUrl = localStorage.getItem('server_url') || 
          (import.meta.env.VITE_API_URL) || 
          (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin);
        
        const response = await fetch(`${serverUrl}/api/public/${blueprintId}`);
        
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Blueprint not found');
        }

        const data = await response.json();
        setBlueprint(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBlueprint();
  }, [blueprintId]);

  const handleCopy = async () => {
    if (blueprint?.content) {
      await navigator.clipboard.writeText(blueprint.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-[#D4AF37] animate-pulse mx-auto mb-4" />
          <p className="text-gray-400 font-mono text-sm">Loading blueprint...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl text-white font-serif mb-2">Blueprint Not Found</h1>
          <p className="text-gray-500 font-mono text-sm mb-6">{error}</p>
          <a 
            href="/"
            className="inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#C5A028] transition-colors font-mono text-sm"
          >
            <ArrowLeft size={16} />
            Go to Idea Refinery
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Header */}
      <header className="border-b border-[#333] bg-[#1A1A1A]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a 
              href="/"
              className="text-[#D4AF37] hover:text-[#C5A028] transition-colors"
              title="Idea Refinery"
            >
              <FileText size={24} />
            </a>
            <div>
              <h1 className="text-lg font-serif text-white line-clamp-1">
                {blueprint.title}
              </h1>
              <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
                <span className="flex items-center gap-1">
                  <Eye size={12} />
                  {blueprint.viewCount} views
                </span>
                {blueprint.expiresAt && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Expires {new Date(blueprint.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all
              ${copied 
                ? 'bg-green-900/30 text-green-400 border border-green-500/30' 
                : 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20'
              }
            `}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-8">
          <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono leading-relaxed">
            {blueprint.content}
          </pre>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#333] py-8 mt-12">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-gray-600 text-sm font-mono">
            Made with{' '}
            <a 
              href="/"
              className="text-[#D4AF37] hover:text-[#C5A028] transition-colors"
            >
              Idea Refinery
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
