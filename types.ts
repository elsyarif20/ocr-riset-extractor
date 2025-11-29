export interface OCRResult {
  text: string;
  confidence: number;
  wordCount: number;
  detectedLanguage: string;
}

export interface ResearchConfig {
  type: string;
  citationStyle: string;
  writingStyle: string;
  topic: string;
  referencesNational: number;
  referencesInternational: number;
  language: string;
  yearFrom: number;
  yearTo: number;
  chapter: string;
  length: string;
}

export interface ResearchResult {
  content: string;
  references: string[];
  ris: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  type: 'ocr' | 'research' | 'chat';
  title: string;
  preview: string;
  data: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  groundingMetadata?: any;
  timestamp: number;
}

export const LANGUAGES = [
  { code: 'ind', label: 'Indonesia' },
  { code: 'eng', label: 'English' },
  { code: 'jpn', label: 'Japanese' },
  { code: 'chi_sim', label: 'Chinese (Simplified)' },
  { code: 'ara', label: 'Arabic' },
  { code: 'fra', label: 'French' },
  { code: 'deu', label: 'German' },
  { code: 'spa', label: 'Spanish' },
];

export const RESEARCH_TYPES = [
  { value: 'skripsi', label: 'Skripsi (Undergraduate)' },
  { value: 'tesis', label: 'Tesis (Masters)' },
  { value: 'disertasi', label: 'Disertasi (PhD)' },
  { value: 'paper', label: 'Academic Paper' },
];

export const CITATION_STYLES = ['APA', 'IEEE', 'Chicago', 'Harvard', 'Vancouver'];

export const WRITING_STYLES = [
  { value: 'academic', label: 'Academic (Formal & Structured)' },
  { value: 'professional', label: 'Professional (Practical)' },
  { value: 'educational', label: 'Educational (Detailed Explanation)' },
  { value: 'simple', label: 'General (Simple Language)' },
];

export const CHAPTERS = [
  { value: 'all', label: 'Full Thesis (Chapters I-V)' },
  { value: 'introduction', label: 'Chapter I - Introduction' },
  { value: 'literature', label: 'Chapter II - Literature Review' },
  { value: 'methodology', label: 'Chapter III - Methodology' },
  { value: 'results', label: 'Chapter IV - Results & Discussion' },
  { value: 'conclusion', label: 'Chapter V - Conclusion' },
  { value: 'abstract', label: 'Abstract' },
];