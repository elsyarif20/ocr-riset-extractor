import React, { useState, useEffect } from 'react';
import { Camera, GraduationCap, History as HistoryIcon, MessageSquare, Radio } from 'lucide-react';
import OCRSection from './components/OCRSection';
import ResearchSection from './components/ResearchSection';
import HistorySection from './components/HistorySection';
import LiveSection from './components/LiveSection';
import ChatSection from './components/ChatSection';
import { HistoryItem } from './types';
import { clsx } from 'clsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<'ocr' | 'research' | 'chat' | 'live'>('ocr');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('ocr_research_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const addToHistory = (item: HistoryItem) => {
    const newHistory = [item, ...history].slice(0, 50); // Keep last 50 items
    setHistory(newHistory);
    localStorage.setItem('ocr_research_history', JSON.stringify(newHistory));
  };

  const removeFromHistory = (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem('ocr_research_history', JSON.stringify(newHistory));
  };

  const renderTabButton = (id: 'ocr' | 'research' | 'chat' | 'live', label: string, Icon: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={clsx(
        "flex-1 py-3 px-2 md:px-4 rounded-lg transition-all duration-200 font-semibold flex items-center justify-center gap-2 text-sm md:text-base",
        activeTab === id
          ? "bg-indigo-600 text-white shadow-md transform scale-[1.02]"
          : "text-gray-600 hover:bg-gray-100"
      )}
    >
      <Icon className="w-4 h-4 md:w-5 md:h-5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="w-full min-h-screen gradient-bg p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 text-white">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">OCR & Research Assistant</h1>
          <p className="text-lg opacity-90">AI-Powered Text Extraction, Writing, and Conversation</p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white/95 backdrop-blur rounded-xl p-2 shadow-xl mb-6 flex gap-1 md:gap-2">
          {renderTabButton('ocr', 'OCR Scanner', Camera)}
          {renderTabButton('research', 'Research', GraduationCap)}
          {renderTabButton('chat', 'Assistant', MessageSquare)}
          {renderTabButton('live', 'Live', Radio)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className={activeTab === 'ocr' ? 'block' : 'hidden'}>
              <OCRSection onSaveToHistory={addToHistory} />
            </div>
            <div className={activeTab === 'research' ? 'block' : 'hidden'}>
              <ResearchSection onSaveToHistory={addToHistory} />
            </div>
            <div className={activeTab === 'chat' ? 'block' : 'hidden'}>
              <ChatSection onSaveToHistory={addToHistory} />
            </div>
            <div className={activeTab === 'live' ? 'block' : 'hidden'}>
              <LiveSection />
            </div>
          </div>

          {/* History Sidebar */}
          <div className="lg:col-span-1 hidden lg:block">
            <HistorySection history={history} onDelete={removeFromHistory} />
          </div>
          
          {/* Mobile History (Collapsible or just hidden for now to save space, but let's keep it consistent) */}
          <div className="lg:hidden block">
             <HistorySection history={history} onDelete={removeFromHistory} />
          </div>
        </div>
      </div>
    </div>
  );
}