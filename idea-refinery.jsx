import React, { useState, useRef, useEffect } from 'react';
import { Download, Sparkles, ArrowRight, FileText, MessageSquare, Send, Check } from 'lucide-react';

export default function IdeaRefinery() {
  const [stage, setStage] = useState('input'); // input, questions, generating, preview, refining, mockup
  const [idea, setIdea] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [blueprint, setBlueprint] = useState('');
  const [masterPrompt, setMasterPrompt] = useState('');
  const [htmlMockup, setHtmlMockup] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [refinementInput, setRefinementInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const generateQuestions = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `I have a project idea: "${idea}"

Generate 3-5 thoughtful, specific questions that would help refine this idea and uncover important requirements, technical considerations, and feature needs. 

Return ONLY a JSON array of strings (the questions), nothing else. Format: ["question 1", "question 2", ...]`
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error('Invalid API response format');
      }
      
      let questionsText = data.content[0].text.trim();
      
      // Remove markdown code fences if present
      questionsText = questionsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const parsedQuestions = JSON.parse(questionsText);
      
      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        throw new Error('Invalid questions format');
      }
      
      setQuestions(parsedQuestions);
      setAnswers(parsedQuestions.reduce((acc, _, i) => ({ ...acc, [i]: '' }), {}));
      setStage('questions');
    } catch (error) {
      console.error('Error generating questions:', error);
      alert(`Error generating questions: ${error.message}\n\nPlease try again or check the console for details.`);
    } finally {
      setLoading(false);
    }
  };

  const generateBlueprint = async () => {
    setLoading(true);
    setStage('generating');
    
    try {
      const qaPairs = questions.map((q, i) => `Q: ${q}\nA: ${answers[i]}`).join('\n\n');
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          messages: [{
            role: "user",
            content: `Based on this project idea and answers, create a comprehensive technical blueprint in markdown format.

PROJECT IDEA: "${idea}"

CLARIFYING Q&A:
${qaPairs}

CRITICAL TECH STACK GUIDELINES:
- Recommend MODERN, SIMPLE solutions that get users up and running quickly
- Prefer: Next.js, Vite + React, Supabase, Resend, n8n, Tailwind CSS, shadcn/ui
- Avoid over-engineering - choose the simplest viable approach
- Focus on aesthetic, eye-catching design with minimal complexity
- This is for "vibe-coders" and non-traditional developers

Generate a complete markdown blueprint with these sections:
# Project Blueprint: [Project Name]

## Overview
Brief description and purpose

## Core Features
Comprehensive list of all necessary features

## Recommended Tech Stack
Modern, simple technologies optimized for rapid development

## Architecture
High-level system architecture (keep simple)

## Data Models
Key entities and relationships

## User Flow
Primary user journeys

## Implementation Phases
Suggested development phases

## Design Principles
Aesthetic and UX considerations

## Considerations
Technical constraints, security, performance, scalability

---

## Master Takeoff Prompt

[Generate a comprehensive, ready-to-use prompt that can be pasted directly into Cursor, Lovable, Bolt, Replit, or similar AI coding tools. This should include:
- Complete project context
- Tech stack specifications
- Core features to implement
- Design requirements
- File structure suggestions
- Any specific implementation details
Make it detailed enough that an AI agent can start building immediately.]

Be specific, thorough, and technical. This should serve as a complete development blueprint.`
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error('Invalid API response format');
      }
      
      const fullContent = data.content[0].text;
      
      // Split blueprint and master prompt
      const sections = fullContent.split('## Master Takeoff Prompt');
      const blueprintText = sections[0].trim();
      const promptText = sections[1] ? sections[1].trim() : '';
      
      setBlueprint(fullContent); // Keep full content for download
      setMasterPrompt(promptText);
      setConversation([{
        role: 'assistant',
        content: fullContent,
        type: 'blueprint'
      }]);
      setStage('preview');
    } catch (error) {
      console.error('Error generating blueprint:', error);
      alert(`Error generating blueprint: ${error.message}\n\nPlease try again.`);
      setStage('questions'); // Go back to questions stage
    } finally {
      setLoading(false);
    }
  };

  const refineBlueprint = async () => {
    if (!refinementInput.trim()) return;

    const userMessage = { role: 'user', content: refinementInput, type: 'text' };
    setConversation(prev => [...prev, userMessage]);
    setRefinementInput('');
    setLoading(true);

    try {
      const conversationHistory = conversation.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          messages: [
            ...conversationHistory,
            { role: 'user', content: refinementInput }
          ],
          system: `You are helping refine a project blueprint for "vibe-coders" and non-traditional developers. The user may ask for changes, additions, clarifications, or complete rewrites. 

ALWAYS respond with the updated COMPLETE blueprint in markdown format, incorporating their feedback.

CRITICAL TECH STACK PRINCIPLES:
- Recommend MODERN, SIMPLE solutions (Next.js, Vite + React, Supabase, Resend, n8n, Tailwind, shadcn/ui)
- Avoid over-engineering - simplest viable approach wins
- Focus on aesthetic, eye-catching design
- Optimize for rapid development and deployment

The blueprint must end with a "## Master Takeoff Prompt" section that's ready to paste into Cursor, Lovable, Bolt, or Replit. Be thorough and technical.`
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error('Invalid API response format');
      }
      
      const refinedBlueprint = data.content[0].text;
      
      // Extract master prompt from refined blueprint
      const sections = refinedBlueprint.split('## Master Takeoff Prompt');
      const promptText = sections[1] ? sections[1].trim() : '';
      
      setBlueprint(refinedBlueprint);
      setMasterPrompt(promptText);
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: refinedBlueprint,
        type: 'blueprint'
      }]);
    } catch (error) {
      console.error('Error refining blueprint:', error);
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message}\n\nPlease try again or rephrase your request.`,
        type: 'error'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const generateMockup = async () => {
    setLoading(true);
    setStage('mockup');

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          messages: [{
            role: "user",
            content: `Based on this project blueprint, create a complete, standalone HTML file that demonstrates the design, key features, and goals of the application.

BLUEPRINT:
${blueprint}

Requirements:
- Single HTML file with embedded CSS and JavaScript
- Beautiful, MODERN, eye-catching design that reflects the project's purpose
- Showcase 3-5 signature features visually
- Include the project goal/mission prominently
- Make it interactive where appropriate
- Use distinctive design (avoid generic/corporate aesthetics)
- Focus on SIMPLICITY and AESTHETICS over complexity
- Include Google Fonts if needed
- Functional demo elements
- Clean, minimal code

IMPORTANT: At the bottom of the HTML, include a hidden section with the full markdown blueprint embedded in a <pre> tag with id="markdown-content". Add a "Copy Blueprint" button that copies this markdown to clipboard. Style it minimally.

Return ONLY the complete HTML code, nothing else.`
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error('Invalid API response format');
      }
      
      let htmlContent = data.content[0].text;
      
      // Clean up any markdown code fences
      htmlContent = htmlContent.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
      
      // If the HTML doesn't have the embedded markdown (AI didn't follow instructions), add it
      if (!htmlContent.includes('id="markdown-content"')) {
        const insertPoint = htmlContent.lastIndexOf('</body>');
        if (insertPoint !== -1) {
          const markdownSection = `
    <!-- Embedded Blueprint -->
    <div style="margin: 60px auto; max-width: 800px; padding: 20px; border-top: 1px solid #e5e7eb;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 20px; color: #374151;">Project Blueprint</h2>
        <button onclick="copyMarkdown()" style="padding: 10px 20px; background: #0ea5e9; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
          Copy Blueprint
        </button>
      </div>
      <pre id="markdown-content" style="background: #f9fafb; padding: 20px; border-radius: 8px; overflow-x: auto; font-size: 12px; line-height: 1.6; color: #1f2937;">${blueprint.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    </div>
    <script>
      function copyMarkdown() {
        const content = document.getElementById('markdown-content').textContent;
        navigator.clipboard.writeText(content).then(() => {
          alert('Blueprint copied to clipboard!');
        });
      }
    </script>
`;
          htmlContent = htmlContent.slice(0, insertPoint) + markdownSection + htmlContent.slice(insertPoint);
        }
      }
      
      setHtmlMockup(htmlContent);
    } catch (error) {
      console.error('Error generating mockup:', error);
      alert(`Error generating mockup: ${error.message}\n\nPlease try again.`);
      setStage('refining'); // Go back to refining stage
    } finally {
      setLoading(false);
    }
  };

  const downloadMarkdown = () => {
    const blob = new Blob([blueprint], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-blueprint.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadHTML = () => {
    const blob = new Blob([htmlMockup], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-mockup.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadBoth = () => {
    downloadMarkdown();
    setTimeout(() => downloadHTML(), 100);
  };

  const resetFlow = () => {
    setStage('input');
    setIdea('');
    setQuestions([]);
    setAnswers({});
    setBlueprint('');
    setMasterPrompt('');
    setHtmlMockup('');
    setConversation([]);
    setRefinementInput('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 mb-4 text-amber-400">
            <Sparkles className="w-6 h-6" />
            <h1 className="text-4xl font-light tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Idea Refinery
            </h1>
          </div>
          <p className="text-slate-400 text-sm tracking-wide" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            Transform concepts into comprehensive blueprints
          </p>
        </div>

        {/* Stage: Input */}
        {stage === 'input' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-8">
              <label className="block text-sm text-slate-300 mb-3 tracking-wide" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                DESCRIBE YOUR IDEA
              </label>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="e.g., A mobile app that helps remote teams coordinate async meetings..."
                className="w-full h-32 bg-slate-900/50 border border-slate-600 rounded px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
              {/* Debug info */}
              <div className="text-xs text-slate-500 mt-2">
                Characters: {idea.length} | Button {!idea.trim() ? 'disabled (needs text)' : 'enabled'}
              </div>
            </div>

            <button
              onClick={() => {
                console.log('Button clicked!');
                console.log('Idea:', idea);
                console.log('Loading:', loading);
                generateQuestions();
              }}
              disabled={!idea.trim() || loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-medium py-4 rounded-lg transition-all flex items-center justify-center gap-2 group"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {loading ? (
                <>GENERATING QUESTIONS...</>
              ) : (
                <>
                  REFINE IDEA
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Stage: Questions */}
        {stage === 'questions' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4 text-amber-400">
                <FileText className="w-5 h-5" />
                <h2 className="text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Refinement Questions
                </h2>
              </div>
              <p className="text-slate-400 text-sm mb-6" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                Answer these to generate your comprehensive blueprint
              </p>

              <div className="space-y-5">
                {questions.map((question, i) => (
                  <div key={i} className="space-y-2">
                    <label className="block text-sm text-slate-300" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {i + 1}. {question}
                    </label>
                    <textarea
                      value={answers[i]}
                      onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
                      className="w-full h-24 bg-slate-900/50 border border-slate-600 rounded px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none text-sm"
                      placeholder="Your answer..."
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetFlow}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-lg transition-all"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                START OVER
              </button>
              <button
                onClick={generateBlueprint}
                disabled={Object.values(answers).some(a => !a.trim()) || loading}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-medium py-4 rounded-lg transition-all flex items-center justify-center gap-2 group"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                GENERATE BLUEPRINT
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* Stage: Generating */}
        {stage === 'generating' && (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <Sparkles className="w-12 h-12 text-amber-400 mb-4" />
            <p className="text-slate-300" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              Crafting your blueprint...
            </p>
          </div>
        )}

        {/* Stage: Preview */}
        {stage === 'preview' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-slate-700">
                <div className="flex items-center gap-2 text-amber-400">
                  <FileText className="w-5 h-5" />
                  <h2 className="text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Blueprint Preview
                  </h2>
                </div>
                <p className="text-slate-400 text-sm mt-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  Review and choose next step
                </p>
              </div>

              {/* Markdown Preview */}
              <div className="max-h-96 overflow-y-auto p-6 bg-slate-900/30">
                <pre className="whitespace-pre-wrap text-xs text-slate-300" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {blueprint}
                </pre>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={resetFlow}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-lg transition-all"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                START OVER
              </button>
              <button
                onClick={() => setStage('refining')}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium py-4 rounded-lg transition-all flex items-center justify-center gap-2"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                <MessageSquare className="w-4 h-4" />
                REFINE BLUEPRINT
              </button>
              <button
                onClick={generateMockup}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-4 rounded-lg transition-all flex items-center justify-center gap-2"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                <Check className="w-4 h-4" />
                GENERATE MOCKUP
              </button>
            </div>
          </div>
        )}

        {/* Stage: Refining */}
        {stage === 'refining' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-slate-700">
                <div className="flex items-center gap-2 text-amber-400">
                  <MessageSquare className="w-5 h-5" />
                  <h2 className="text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Refine Your Blueprint
                  </h2>
                </div>
                <p className="text-slate-400 text-sm mt-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  Iterate until perfect, then generate mockup
                </p>
              </div>

              {/* Conversation */}
              <div className="h-96 overflow-y-auto p-6 space-y-4 bg-slate-900/30">
                {conversation.map((msg, idx) => (
                  <div key={idx} className={`${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.role === 'user' ? (
                      <div className="inline-block bg-amber-500/20 border border-amber-500/30 rounded-lg px-4 py-2 max-w-[80%]">
                        <p className="text-sm text-amber-100" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {msg.content}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 max-w-full">
                        <pre className="whitespace-pre-wrap text-xs text-slate-300 overflow-x-auto" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                          {msg.content}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="text-left">
                    <div className="inline-block bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3">
                      <p className="text-sm text-slate-400 animate-pulse" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        Refining blueprint...
                      </p>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-slate-700 bg-slate-900/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={refinementInput}
                    onChange={(e) => setRefinementInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !loading && refineBlueprint()}
                    placeholder="Request changes, additions, or clarifications..."
                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors text-sm"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                    disabled={loading}
                  />
                  <button
                    onClick={refineBlueprint}
                    disabled={!refinementInput.trim() || loading}
                    className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 px-6 py-3 rounded transition-all flex items-center gap-2"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={resetFlow}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-lg transition-all"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                START OVER
              </button>
              <button
                onClick={generateMockup}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-4 rounded-lg transition-all flex items-center justify-center gap-2 group"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                <Check className="w-4 h-4" />
                APPROVE & GENERATE MOCKUP
              </button>
            </div>
          </div>
        )}

        {/* Stage: Mockup */}
        {stage === 'mockup' && (
          <div className="space-y-6 animate-fade-in">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <Sparkles className="w-12 h-12 text-amber-400 mb-4" />
                <p className="text-slate-300" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
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
                        <h2 className="text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
                          Master Takeoff Prompt
                        </h2>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(masterPrompt);
                          alert('Master prompt copied! Paste into Cursor, Lovable, Bolt, or Replit.');
                        }}
                        className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded text-sm transition-all"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        <Download className="w-4 h-4" />
                        COPY PROMPT
                      </button>
                    </div>
                    <div className="p-6 max-h-64 overflow-y-auto bg-slate-900/50">
                      <p className="text-xs text-purple-200 mb-3" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        Paste this into Cursor, Antigravity, Lovable, Replit, or Bolt to start building:
                      </p>
                      <pre className="whitespace-pre-wrap text-xs text-purple-100" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
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
                      <h2 className="text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
                        Design Mockup Preview
                      </h2>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={downloadMarkdown}
                        className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm transition-all"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        <Download className="w-4 h-4" />
                        BLUEPRINT.MD
                      </button>
                      <button
                        onClick={downloadHTML}
                        className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm transition-all"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
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
                    <p className="text-xs text-slate-400 text-center" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      Scroll to bottom of HTML for embedded blueprint copy button
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={resetFlow}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-lg transition-all"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    CREATE NEW PROJECT
                  </button>
                  <button
                    onClick={downloadBoth}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium py-4 rounded-lg transition-all flex items-center justify-center gap-2"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    <Download className="w-4 h-4" />
                    DOWNLOAD BOTH FILES
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500&display=swap');
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
