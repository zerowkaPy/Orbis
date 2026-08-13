export interface Category {
  id: number;
  name: string;
  color: string;
}

export interface Note {
  id: number;
  text: string;
  category_id: number;
  created_at?: string;
}

export type RecordingState = 'idle' | 'recording' | 'processing';

export interface NoteGeminiAnswer {
  status?: string;
  category_id: number;
  category_name: string;
  note_text_in_markdown_format: string;
}

export interface ToastNotification {
  id: string;
  category_id?: number;
  category_name?: string;
  message?: string;
  type?: 'success' | 'error'; // Позволяет отличать успешные тосты от ошибок
}