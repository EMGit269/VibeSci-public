
export interface CodeSnippet {
  id: string;
  version: string;
  purpose: string;
  code: string;
  notesAndTradeoffs: string;
  documentation?: string;
  developerComments?: string;
  createdAt: string;
}

export interface Method {
  id: string;
  name: string;
  description: string;
  // In Firestore these are sub-collections, but often useful to keep as optional array for UI mapping
  codeSnippets?: CodeSnippet[]; 
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  problemDescription: string;
  createdAt: string;
  methods?: Method[];
}

export interface AnalysisItem {
  step: string;
  explanation: string;
}

export interface AnalysisResult {
  errors: AnalysisItem[];
  warnings: AnalysisItem[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  planningMarkdown?: string;
  analysisResult?: AnalysisResult | null;
  ignoredErrorIndices?: number[];
  ignoredWarningIndices?: number[];
  createdAt: string;
  tasks?: Task[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface KnowledgeGraphData {
  nodes: { id: string; label: string; type: string }[];
  edges: { source: string; target: string; label: string }[];
}

export interface KnowledgeSource {
  id: string;
  fileName: string;
  fileType: string;
  totalChunks: number;
  createdAt: string;
  graphData?: KnowledgeGraphData;
}

export interface KnowledgeChunk {
  id: string;
  sourceId: string;
  content: string;
  index: number;
  createdAt: string;
}
