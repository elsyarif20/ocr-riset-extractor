import React, { useState, useEffect, useRef } from 'react';
import { Send, MapPin, Search, Bot, User, Loader2, Info } from 'lucide-react';
import { sendMessage } from '../services/gemini';
import { ChatMessage } from '../types';
import { clsx } from 'clsx';

interface ChatSectionProps {
  onSaveToHistory: (item: any) => void;
}

const ChatSection: React.FC<ChatSectionProps> = ({ onSaveToHistory }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get location for Maps grounding
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => console.log("Geolocation not available", error)
      );
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await sendMessage(
        input, 
        messages, 
        useSearch, 
        useMaps,
        location
      );

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || "I couldn't generate a text response.",
        groundingMetadata: response.groundingMetadata,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMsg]);

      // Save to main history if it's a significant conversation (optional logic)
      if (messages.length > 2) {
          // Could auto-save or provide a button
      }

    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Sorry, I encountered an error processing your request.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle handlers ensuring mutual exclusivity for grounding tools if desired (usually safer)
  const toggleSearch = () => {
    if (!useSearch) setUseMaps(false);
    setUseSearch(!useSearch);
  };

  const toggleMaps = () => {
    if (!useMaps) setUseSearch(false);
    setUseMaps(!useMaps);
  };

  const renderGroundingSource = (metadata: any) => {
    if (!metadata?.groundingChunks) return null;

    return (
      <div className="mt-3 text-xs border-t pt-2 border-gray-200">
        <p className="font-semibold text-gray-500 mb-1 flex items-center gap-1">
          <Info className="w-3 h-3" /> Sources
        </p>
        <div className="flex flex-wrap gap-2">
          {metadata.groundingChunks.map((chunk: any, idx: number) => {
            if (chunk.web) {
              return (
                <a 
                  key={idx} 
                  href={chunk.web.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 truncate max-w-[200px]"
                >
                  {chunk.web.title || chunk.web.uri}
                </a>
              );
            }
            if (chunk.maps) {
               return (
                <a 
                  key={idx} 
                  href={chunk.maps.desktopUri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100 flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3" />
                  {chunk.maps.title}
                </a>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg h-[600px] flex flex-col animate-fade-in">
      {/* Header & Controls */}
      <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50 rounded-t-xl">
        <div className="flex items-center gap-2">
           <Bot className="w-6 h-6 text-indigo-600" />
           <h3 className="font-bold text-gray-800">AI Assistant</h3>
        </div>
        
        <div className="flex gap-2 text-sm">
          <button
            onClick={toggleSearch}
            className={clsx(
              "px-3 py-1.5 rounded-full flex items-center gap-1 transition-all border",
              useSearch 
                ? "bg-blue-100 text-blue-700 border-blue-200 shadow-inner" 
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
            )}
          >
            <Search className="w-3 h-3" />
            Google Search
          </button>
          <button
            onClick={toggleMaps}
            className={clsx(
              "px-3 py-1.5 rounded-full flex items-center gap-1 transition-all border",
              useMaps 
                ? "bg-green-100 text-green-700 border-green-200 shadow-inner" 
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
            )}
          >
            <MapPin className="w-3 h-3" />
            Google Maps
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
            <Bot className="w-12 h-12 opacity-20" />
            <p>Ask me anything! Enable Search for web info or Maps for locations.</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={clsx(
              "flex gap-3 max-w-[85%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            <div className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              msg.role === 'user' ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-indigo-600"
            )}>
              {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            
            <div className={clsx(
              "p-3 rounded-2xl shadow-sm",
              msg.role === 'user' 
                ? "bg-indigo-600 text-white rounded-tr-none" 
                : "bg-white border border-gray-100 text-gray-800 rounded-tl-none"
            )}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
              {msg.role === 'model' && renderGroundingSource(msg.groundingMetadata)}
            </div>
          </div>
        ))}
        {loading && (
           <div className="flex gap-3 max-w-[85%] mr-auto">
              <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                 <Bot className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center">
                 <Loader2 className="w-4 h-4 animate-spin text-indigo-500 mr-2" />
                 <span className="text-sm text-gray-500">Thinking...</span>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t rounded-b-xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={
              useSearch ? "Ask with Google Search..." : 
              useMaps ? "Ask for places with Maps..." : 
              "Type a message..."
            }
            className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-gray-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className={clsx(
              "p-3 rounded-xl transition-all",
              !input.trim() || loading
                ? "bg-gray-100 text-gray-400"
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-2 text-xs text-center text-gray-400">
           {useSearch || useMaps ? "Using Gemini Flash 2.5 (Fast + Grounded)" : "Using Gemini 3 Pro (High Intelligence)"}
        </div>
      </div>
    </div>
  );
};

export default ChatSection;
