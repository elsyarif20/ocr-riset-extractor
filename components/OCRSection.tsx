import React, { useState, useRef, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import { Upload, Camera, FileText, Download, Copy, Languages, Save, RefreshCw } from 'lucide-react';
import { LANGUAGES, OCRResult } from '../types';
import TranslationModal from './TranslationModal';
import { clsx } from 'clsx';

interface OCRSectionProps {
  onSaveToHistory: (item: any) => void;
}

const OCRSection: React.FC<OCRSectionProps> = ({ onSaveToHistory }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState<OCRResult | null>(null);
  const [selectedLang, setSelectedLang] = useState('eng');
  const [isTranslating, setIsTranslating] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target?.result as string);
        setResult(null); // Reset previous result
      };
      reader.readAsDataURL(file);
    }
  };

  const processOCR = async () => {
    if (!image) return;

    setLoading(true);
    setProgress(0);
    setResult(null);

    try {
      const worker = await Tesseract.createWorker(selectedLang, 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
            setStatusText(`Recognizing text... ${Math.round(m.progress * 100)}%`);
          } else {
            setStatusText(m.status);
          }
        }
      });

      const { data } = await worker.recognize(image);
      await worker.terminate();

      const text = data.text.trim();
      const newResult: OCRResult = {
        text: text,
        confidence: data.confidence,
        wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
        detectedLanguage: LANGUAGES.find(l => l.code === selectedLang)?.label || 'Unknown',
      };

      setResult(newResult);
    } catch (err) {
      console.error(err);
      alert("Failed to process image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.text) {
      navigator.clipboard.writeText(result.text);
      alert('Text copied to clipboard!');
    }
  };

  const handleDownload = () => {
    if (result?.text) {
      const blob = new Blob([result.text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ocr-result.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleSave = () => {
    if (result && image) {
      onSaveToHistory({
        id: Date.now().toString(),
        timestamp: Date.now(),
        type: 'ocr',
        title: `OCR Scan - ${new Date().toLocaleString()}`,
        preview: result.text.substring(0, 100) + '...',
        data: result
      });
      alert('Saved to history!');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
      <div className="mb-6">
        <label className="block text-lg font-semibold mb-2 text-gray-700">1. Upload Image</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-indigo-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-400 transition-all text-indigo-600 font-medium"
          >
            <Upload className="w-6 h-6" />
            Upload from Gallery
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-purple-200 rounded-xl hover:bg-purple-50 hover:border-purple-400 transition-all text-purple-600 font-medium"
          >
            <Camera className="w-6 h-6" />
            Take Photo
          </button>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleImageUpload} 
        />
        <input 
          type="file" 
          ref={cameraInputRef} 
          className="hidden" 
          accept="image/*" 
          capture="environment" 
          onChange={handleImageUpload} 
        />
      </div>

      {image && (
        <div className="mb-6 animate-fade-in">
          <div className="relative w-full h-64 bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
            <img src={image} alt="Preview" className="w-full h-full object-contain" />
          </div>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-lg font-semibold mb-2 text-gray-700">2. Settings</label>
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.label}</option>
            ))}
          </select>
          <button
            onClick={processOCR}
            disabled={!image || loading}
            className={clsx(
              "flex-1 py-3 px-6 rounded-lg font-bold text-white shadow-md transition-all flex items-center justify-center gap-2",
              !image || loading 
                ? "bg-gray-400 cursor-not-allowed" 
                : "bg-indigo-600 hover:bg-indigo-700 active:scale-95"
            )}
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Extract Text
              </>
            )}
          </button>
        </div>
        
        {loading && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{statusText}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="animate-slide-up">
          <div className="bg-indigo-50 p-4 rounded-xl mb-6">
            <h3 className="font-semibold text-indigo-900 mb-2">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <span className="block text-gray-500 text-xs">Words</span>
                <span className="font-bold text-gray-800 text-lg">{result.wordCount}</span>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <span className="block text-gray-500 text-xs">Confidence</span>
                <span className={clsx(
                  "font-bold text-lg",
                  result.confidence > 80 ? "text-green-600" : result.confidence > 50 ? "text-yellow-600" : "text-red-600"
                )}>{Math.round(result.confidence)}%</span>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <span className="block text-gray-500 text-xs">Language</span>
                <span className="font-bold text-gray-800 text-lg">{result.detectedLanguage}</span>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-700">Extracted Text</h3>
              <div className="flex gap-2">
                <button onClick={handleCopy} className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Copy">
                  <Copy className="w-5 h-5" />
                </button>
                <button onClick={handleDownload} className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Download">
                  <Download className="w-5 h-5" />
                </button>
                <button onClick={handleSave} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Save">
                  <Save className="w-5 h-5" />
                </button>
                <button onClick={() => setIsTranslating(true)} className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Translate">
                  <Languages className="w-5 h-5" />
                </button>
              </div>
            </div>
            <textarea 
              readOnly 
              value={result.text} 
              className="w-full h-64 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-sm resize-y"
            />
          </div>
        </div>
      )}
      
      {isTranslating && result && (
        <TranslationModal 
          isOpen={isTranslating} 
          onClose={() => setIsTranslating(false)} 
          textToTranslate={result.text}
          sourceLang={result.detectedLanguage}
        />
      )}
    </div>
  );
};

export default OCRSection;
