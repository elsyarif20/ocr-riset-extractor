import React, { useState } from 'react';
import { X, Languages, Loader2, Copy } from 'lucide-react';
import { translateText } from '../services/gemini';
import { LANGUAGES } from '../types';
import { clsx } from 'clsx';

interface TranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  textToTranslate: string;
  sourceLang: string;
}

const TranslationModal: React.FC<TranslationModalProps> = ({ isOpen, onClose, textToTranslate, sourceLang }) => {
  const [targetLang, setTargetLang] = useState('eng');
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleTranslate = async () => {
    setLoading(true);
    try {
      const targetLangLabel = LANGUAGES.find(l => l.code === targetLang)?.label || 'English';
      const result = await translateText(textToTranslate, targetLangLabel, sourceLang);
      setTranslatedText(result);
    } catch (err) {
      setTranslatedText("Error during translation. Please check your network and API key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Languages className="w-6 h-6 text-indigo-600" />
            AI Translator
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Translate to:</label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleTranslate}
            disabled={loading}
            className={clsx(
              "w-full py-3 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2 mb-6",
              loading ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"
            )}
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Translate Now"}
          </button>

          {translatedText && (
            <div className="bg-gray-50 rounded-lg p-4 border relative">
              <button 
                onClick={() => {navigator.clipboard.writeText(translatedText); alert("Copied");}}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-indigo-600"
              >
                <Copy className="w-4 h-4" />
              </button>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Result</h4>
              <p className="whitespace-pre-wrap text-gray-800">{translatedText}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranslationModal;
