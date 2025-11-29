import React, { useState } from 'react';
import { BookOpen, Send, Loader2, Copy, Download, Save, FileJson, BrainCircuit, FileText } from 'lucide-react';
import { 
  RESEARCH_TYPES, 
  CITATION_STYLES, 
  WRITING_STYLES, 
  CHAPTERS, 
  ResearchConfig,
  ResearchResult
} from '../types';
import { generateResearchContent } from '../services/gemini';
import { clsx } from 'clsx';

interface ResearchSectionProps {
  onSaveToHistory: (item: any) => void;
}

const ResearchSection: React.FC<ResearchSectionProps> = ({ onSaveToHistory }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [showRis, setShowRis] = useState(false);

  const [config, setConfig] = useState<ResearchConfig>({
    type: 'skripsi',
    citationStyle: 'APA',
    writingStyle: 'academic',
    topic: '',
    referencesNational: 5,
    referencesInternational: 5,
    language: 'English',
    yearFrom: 2018,
    yearTo: new Date().getFullYear(),
    chapter: 'introduction',
    length: 'medium (approx 1000 words)'
  });

  const handleGenerate = async () => {
    if (!config.topic) {
      alert("Please enter a research topic.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const generatedContent = await generateResearchContent(config);
      setResult(generatedContent);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to generate content. Please ensure your API key is valid and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (result) {
      onSaveToHistory({
        id: Date.now().toString(),
        timestamp: Date.now(),
        type: 'research',
        title: config.topic,
        preview: result.content.substring(0, 100) + '...',
        data: { ...result, config }
      });
      alert('Saved to history!');
    }
  };

  const downloadContent = () => {
    if (!result) return;
    
    // Clean content for text file as well
    const cleanContent = result.content
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/^#+\s/gm, '');

    const fullText = `${cleanContent}\n\n--- RIS FORMAT ---\n${result.ris}`;
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.topic.substring(0, 20)}_chapter.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportWord = () => {
    if (!result) return;
    
    // Helper function to format markdown to clean HTML for Word
    const formatMarkdownToHtml = (text: string) => {
      const lines = text.split('\n');
      let html = '';
      let inList = false;

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        // Skip empty lines, but ensure paragraphs are separated
        if (!line) continue; 

        // Handle inline formatting (Bold, Italic)
        // Note: Replacing markdown syntax with HTML tags
        line = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code>$1</code>');

        // Headers (### -> h3, ## -> h2, # -> h1)
        if (line.startsWith('### ')) {
           if (inList) { html += '</ul>'; inList = false; }
           html += `<h3>${line.replace(/^### /, '')}</h3>`;
        } else if (line.startsWith('## ')) {
           if (inList) { html += '</ul>'; inList = false; }
           html += `<h2>${line.replace(/^## /, '')}</h2>`;
        } else if (line.startsWith('# ')) {
           if (inList) { html += '</ul>'; inList = false; }
           html += `<h1>${line.replace(/^# /, '')}</h1>`;
        }
        // Lists (Unordered) (- item or * item)
        else if (line.startsWith('- ') || line.startsWith('* ')) {
           if (!inList) { html += '<ul>'; inList = true; }
           html += `<li>${line.replace(/^[-*] /, '')}</li>`;
        }
        // Paragraphs
        else {
           if (inList) { html += '</ul>'; inList = false; }
           html += `<p>${line}</p>`;
        }
      }
      if (inList) html += '</ul>';
      return html;
    };

    const formattedContent = formatMarkdownToHtml(result.content);
    
    // Create HTML content for Word
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${config.topic}</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; color: #000000; }
          h1 { font-size: 16pt; font-weight: bold; text-align: center; margin-bottom: 24px; }
          h2 { font-size: 14pt; font-weight: bold; margin-top: 24px; margin-bottom: 12px; }
          h3 { font-size: 12pt; font-weight: bold; margin-top: 18px; margin-bottom: 8px; }
          p { margin-bottom: 12px; text-align: justify; }
          ul { margin-bottom: 12px; }
          li { margin-bottom: 6px; }
          strong { font-weight: bold; }
          em { font-style: italic; }
          code { font-family: 'Courier New', monospace; background-color: #f0f0f0; padding: 2px 4px; }
          .meta { color: #555; font-size: 10pt; margin-bottom: 30px; text-align: center; }
        </style>
      </head>
      <body>
        <h1>${config.topic}</h1>
        <div class="meta">
          <p><strong>Type:</strong> ${config.type}</p>
          <p><strong>Chapter:</strong> ${config.chapter === 'all' ? 'Full Thesis (Chapters I-V)' : config.chapter}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <!-- Content -->
        <div>
          ${formattedContent}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.topic.substring(0, 30).replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadRIS = () => {
    if (!result || !result.ris) return;
    const blob = new Blob([result.ris], { type: 'application/x-research-info-systems' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.topic.substring(0, 30).replace(/\s+/g, '_')}.ris`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Function to render text cleanly (removing markdown syntax)
  const renderCleanPreview = (text: string) => {
    if (!text) return <p className="text-gray-500 italic">No content generated yet.</p>;

    return text.split('\n').map((line, index) => {
      // Clean the line from markdown syntax for display
      const cleanLine = line
        .replace(/^#+\s/, '') // Remove heading hashes
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers but keep text
        .replace(/\*(.*?)\*/g, '$1') // Remove italic markers but keep text
        .replace(/`(.*?)`/g, '$1') // Remove code markers
        .trim();

      if (!cleanLine) return <br key={index} className="mb-2" />;

      let className = "mb-4 text-gray-800 text-lg leading-relaxed text-justify font-serif";
      
      // Determine style based on original markdown indicators
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-3xl font-bold text-gray-900 mt-8 mb-6 text-center border-b pb-2 font-sans">{cleanLine}</h1>;
      }
      else if (line.startsWith('## ')) {
        return <h2 key={index} className="text-2xl font-bold text-gray-900 mt-6 mb-4 font-sans">{cleanLine}</h2>;
      }
      else if (line.startsWith('### ')) {
        return <h3 key={index} className="text-xl font-bold text-gray-800 mt-5 mb-3 font-sans">{cleanLine}</h3>;
      }
      else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
           <div key={index} className="flex gap-2 mb-2 ml-4">
               <span className="text-gray-800 mt-1.5 text-xs">•</span>
               <p className="text-gray-800 text-lg">{cleanLine.replace(/^[-*]\s/, '')}</p>
           </div>
        );
      }
      
      // Check if it's the "References" header usually generated
      if (cleanLine.toLowerCase() === 'references' || cleanLine.toLowerCase() === 'daftar pustaka') {
          return <h2 key={index} className="text-2xl font-bold text-gray-900 mt-8 mb-4 border-t pt-4 font-sans">{cleanLine}</h2>;
      }

      return <p key={index} className={className}>{cleanLine}</p>;
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
      {/* Banner for Thinking Mode */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 rounded-lg mb-6 border border-indigo-100 flex items-center gap-3">
         <div className="bg-white p-2 rounded-full shadow-sm">
             <BrainCircuit className="w-5 h-5 text-indigo-600" />
         </div>
         <div>
             <h4 className="text-sm font-bold text-indigo-900">Enhanced Thinking Mode Active</h4>
             <p className="text-xs text-indigo-700">Uses Gemini 3 Pro with deep reasoning (32k token thinking budget) for complex academic tasks.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Research Type</label>
          <select 
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            value={config.type}
            onChange={e => setConfig({...config, type: e.target.value})}
          >
            {RESEARCH_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Chapter</label>
          <select 
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            value={config.chapter}
            onChange={e => setConfig({...config, chapter: e.target.value})}
          >
            {CHAPTERS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Citation Style</label>
          <select 
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            value={config.citationStyle}
            onChange={e => setConfig({...config, citationStyle: e.target.value})}
          >
            {CITATION_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Writing Style</label>
          <select 
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            value={config.writingStyle}
            onChange={e => setConfig({...config, writingStyle: e.target.value})}
          >
            {WRITING_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Topic</label>
          <input 
            type="text" 
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., The Impact of AI on Modern Education"
            value={config.topic}
            onChange={e => setConfig({...config, topic: e.target.value})}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4 md:col-span-2">
            <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1">Output Language</label>
                 <select 
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={config.language}
                    onChange={e => setConfig({...config, language: e.target.value})}
                 >
                     <option value="English">English</option>
                     <option value="Indonesian">Indonesian</option>
                     <option value="Japanese">Japanese</option>
                     <option value="Arabic">Arabic</option>
                     <option value="French">French</option>
                 </select>
            </div>
             <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Content Length</label>
                <select 
                   className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                   value={config.length}
                   onChange={e => setConfig({...config, length: e.target.value})}
                >
                    <option value="short (approx 300 words)">Short (~300 words)</option>
                    <option value="medium (approx 1000 words)">Medium (~1000 words)</option>
                    <option value="long (approx 2000 words)">Long (~2000 words)</option>
                </select>
           </div>
        </div>

        <div className="md:col-span-2">
           <label className="block text-sm font-semibold text-gray-700 mb-2">Reference Settings</label>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                  <span className="text-xs text-gray-500">From Year</span>
                  <input type="number" className="w-full p-2 border rounded" value={config.yearFrom} onChange={e => setConfig({...config, yearFrom: parseInt(e.target.value)})} />
              </div>
              <div>
                  <span className="text-xs text-gray-500">To Year</span>
                  <input type="number" className="w-full p-2 border rounded" value={config.yearTo} onChange={e => setConfig({...config, yearTo: parseInt(e.target.value)})} />
              </div>
               <div>
                  <span className="text-xs text-gray-500">National Refs</span>
                  <input type="number" className="w-full p-2 border rounded" value={config.referencesNational} onChange={e => setConfig({...config, referencesNational: parseInt(e.target.value)})} />
              </div>
              <div>
                  <span className="text-xs text-gray-500">Int'l Refs</span>
                  <input type="number" className="w-full p-2 border rounded" value={config.referencesInternational} onChange={e => setConfig({...config, referencesInternational: parseInt(e.target.value)})} />
              </div>
           </div>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className={clsx(
          "w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 mb-8",
          loading 
            ? "bg-purple-400 cursor-not-allowed" 
            : "bg-purple-600 hover:bg-purple-700 hover:shadow-xl active:scale-95"
        )}
      >
        {loading ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Generating Deeply Researched Content...
          </>
        ) : (
          <>
            <Send className="w-6 h-6" />
            Generate Academic Content
          </>
        )}
      </button>

      {result && (
        <div className="animate-fade-in border-t pt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <h3 className="text-xl font-bold text-gray-800">Generated Content</h3>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
               <button onClick={handleExportWord} className="flex-1 md:flex-none p-2 text-gray-700 bg-white border border-gray-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm" title="Export Document (.doc)">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-semibold">Doc Export</span>
               </button>
               {result.ris && (
                 <button onClick={handleDownloadRIS} className="flex-1 md:flex-none p-2 text-gray-700 bg-white border border-gray-300 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm" title="Download Citation (.ris)">
                    <FileJson className="w-4 h-4" />
                    <span className="text-xs font-semibold">RIS Export</span>
                 </button>
               )}
               <div className="h-8 w-px bg-gray-300 hidden md:block mx-1"></div>
               <button onClick={downloadContent} className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Download Text">
                  <Download className="w-5 h-5" />
               </button>
               <button onClick={() => {navigator.clipboard.writeText(result.content); alert("Copied!");}} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Copy Content">
                  <Copy className="w-5 h-5" />
               </button>
               <button onClick={handleSave} className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Save to History">
                  <Save className="w-5 h-5" />
               </button>
            </div>
          </div>
          
          <div className="bg-gray-50 p-8 rounded-xl border border-gray-200 min-h-[400px]">
            {renderCleanPreview(result.content)}
          </div>
          
          <div className="mt-6">
             <button 
               onClick={() => setShowRis(!showRis)}
               className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-purple-600 transition-colors"
             >
                <FileJson className="w-4 h-4" />
                {showRis ? "Hide RIS Format" : "Show RIS Format (for Mendeley/Zotero)"}
             </button>
             
             {showRis && result.ris && (
               <div className="mt-2 bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-x-auto relative">
                 <button 
                   onClick={() => {navigator.clipboard.writeText(result.ris); alert("RIS copied!");}}
                   className="absolute top-2 right-2 p-1 bg-gray-700 rounded hover:bg-gray-600 text-xs"
                 >
                   Copy
                 </button>
                 <pre>{result.ris}</pre>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchSection;