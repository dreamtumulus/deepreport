export interface AppConfig {
  openRouterApiKey: string;
  tavilyApiKey: string;
  model: string; // e.g., "google/gemini-pro-1.5" or "openai/gpt-4o"
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface ReportSection {
  title: string;
  content: string;
  status: 'pending' | 'researching' | 'writing' | 'completed' | 'error';
}

export interface Reference {
  id: number;
  title: string;
  url: string;
}

export interface GenerationStep {
  message: string;
  type: 'info' | 'search' | 'writing' | 'success' | 'error';
  timestamp: number;
}

export enum ReportStatus {
  IDLE = 'idle',
  PLANNING = 'planning',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
