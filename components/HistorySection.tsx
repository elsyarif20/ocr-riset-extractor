import React from 'react';
import { History, Trash2, Camera, GraduationCap } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistorySectionProps {
  history: HistoryItem[];
  onDelete: (id: string) => void;
}

const HistorySection: React.FC<HistorySectionProps> = ({ history, onDelete }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full max-h-[calc(100vh-2rem)] overflow-y-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <History className="w-6 h-6 text-indigo-600" />
        History
      </h2>
      
      {history.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No history yet.</p>
          <p className="text-sm">Processed items will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div key={item.id} className="group bg-gray-50 hover:bg-indigo-50 p-4 rounded-lg border border-gray-100 hover:border-indigo-200 transition-all">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                   {item.type === 'ocr' ? <Camera className="w-4 h-4 text-blue-500" /> : <GraduationCap className="w-4 h-4 text-purple-500" />}
                   <span className="text-xs font-semibold uppercase text-gray-500">{item.type}</span>
                </div>
                <button 
                  onClick={() => onDelete(item.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <h4 className="font-semibold text-gray-800 text-sm mb-1 line-clamp-1" title={item.title}>
                {item.title || 'Untitled'}
              </h4>
              
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                {item.preview}
              </p>
              
              <div className="text-xs text-gray-400">
                {new Date(item.timestamp).toLocaleDateString()} • {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistorySection;
