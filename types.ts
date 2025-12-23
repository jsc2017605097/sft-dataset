
export type FileStatus = 'Pending' | 'Processing' | 'Completed' | 'Error';

export interface Document {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  totalSamples: number;
  reviewedSamples: number;
  status: 'Ready' | 'Processing' | 'Failed';
}

export type QAStatus = 'Pending' | 'Reviewed' | 'Edited';

export interface QAPair {
  id: string;
  docId: string;
  question: string;
  answer: string;
  status: QAStatus;
  originalQuestion?: string;
  originalAnswer?: string;
}

export type ViewState = 'dashboard' | 'upload' | 'review' | 'remote-files';

export interface AppState {
  view: ViewState;
  selectedDocId: string | null;
  documents: Document[];
  qaPairs: Record<string, QAPair[]>;
}
