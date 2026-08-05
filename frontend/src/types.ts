export interface Note {
  id: string;
  text: string;
  createdAt: string;
}

export type RecordingState = 'idle' | 'recording' | 'processing';