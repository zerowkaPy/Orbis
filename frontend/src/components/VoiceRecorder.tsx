import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, RefreshCw, Image, X, Plus } from 'lucide-react';
import { NoteGeminiAnswer } from '../types';

type ModeState = 'idle' | 'recording' | 'transcribing' | 'submitting';

interface VoiceRecorderProps {
  onNoteProcessed: (data: NoteGeminiAnswer) => void;
  onError?: (errorMessage: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onNoteProcessed, onError }) => {
  const [status, setStatus] = useState<ModeState>('idle');
  const [textInput, setTextInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Состояние для добавления ссылки на фото
  const [showImageInput, setShowImageInput] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    return () => {
      stopMediaTracks();
      closeWebSocket();
    };
  }, []);

  // Автоматическое изменение высоты textarea при изменении текста
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [textInput]);

  const closeWebSocket = () => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close(1000, 'Finished');
      }
      wsRef.current = null;
    }
  };

  const stopMediaTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleFailure = (msg: string) => {
    setError(msg);
    if (onError) onError(msg);
  };

  // 1. Старт записи аудио
  const startRecording = async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.host; 
      const wsUrl = `${wsProtocol}//${wsHost}/api/v1/note/transcribe`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(event.data);
          }
        };

        mediaRecorder.start(250);
        setStatus('recording');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.status === 'connected') return;

          if (data.status === 'error') {
            handleFailure(data.message || 'Error transcribing audio');
            setStatus('idle');
            closeWebSocket();
            return;
          }

          if (data.status === 'completed' && data.transcript !== undefined) {
            setTextInput((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
            setStatus('idle');
            closeWebSocket();
          }
        } catch (err) {
          console.error('Error processing WebSocket message:', err);
          handleFailure('Error processing server response');
          setStatus('idle');
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        handleFailure('Server connection error during speech recognition');
        stopMediaTracks();
        closeWebSocket();
        setStatus('idle');
      };

      ws.onclose = () => {
        stopMediaTracks();
      };
    } catch (err) {
      console.error('Microphone access error:', err);
      handleFailure('Microphone access denied');
      setStatus('idle');
    }
  };

  // 2. Остановка записи
  const stopRecording = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('finish');
      setStatus('transcribing');
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopMediaTracks();
  };

  // 3. Финальная отправка текста в Gemini через REST API
  const handleSubmitToGemini = async () => {
    if (!textInput.trim() || status !== 'idle') return;

    setStatus('submitting');
    setError(null);

    try {
      const response = await fetch('/api/v1/note/process-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textInput }),
      });

      if (!response.ok) {
        throw new Error('Failed to process text with Gemini');
      }

      const data: NoteGeminiAnswer = await response.json();
      onNoteProcessed(data);
      setTextInput('');
      setStatus('idle');
    } catch (err) {
      console.error(err);
      handleFailure('Failed to generate note via Gemini');
      setStatus('idle');
    }
  };

  // Вставка Markdown картинки в текст
  const handleAddImage = () => {
    if (!imageUrl.trim()) return;
    const markdownImg = `\n![image](${imageUrl.trim()})\n`;
    setTextInput((prev) => prev + markdownImg);
    setImageUrl('');
    setShowImageInput(false);
  };

  // Обработчик нажатий клавиш (Enter — отправка, Shift+Enter — перенос строки)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitToGemini();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center max-w-3xl mx-auto w-full px-4 my-6 space-y-6">
      {/* Кнопка записи микрофона */}
      <div className="relative group">
        {status === 'recording' && (
          <div className="absolute -inset-4 bg-teal-500/20 rounded-full blur-xl animate-pulse" />
        )}

        <button
          onClick={status === 'idle' ? startRecording : stopRecording}
          disabled={status === 'transcribing' || status === 'submitting'}
          className={`relative z-10 flex items-center justify-center w-20 h-20 rounded-full border transition-all duration-500 shadow-2xl backdrop-blur-md ${
            status === 'recording'
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 scale-105 shadow-rose-900/30'
              : status === 'transcribing' || status === 'submitting'
              ? 'bg-slate-800/50 border-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-slate-900/60 border-teal-500/30 text-teal-300 hover:border-teal-400/60 hover:bg-teal-950/40 hover:scale-105 shadow-teal-950/50'
          }`}
        >
          {status === 'idle' && <Mic className="w-8 h-8 stroke-[1.5]" />}
          {status === 'recording' && <Square className="w-7 h-7 fill-current stroke-none" />}
          {(status === 'transcribing' || status === 'submitting') && (
            <Loader2 className="w-7 h-7 animate-spin text-teal-400" />
          )}
        </button>
      </div>

      {/* Основная карточка ввода */}
      <div className="w-full relative bg-slate-900/80 border border-slate-800 focus-within:border-teal-500/50 rounded-2xl p-4 shadow-xl backdrop-blur-md transition-all space-y-3">
        {/* Ряд с полем ввода и кнопкой Send на одном уровне */}
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              status === 'recording'
                ? 'Listening...'
                : status === 'transcribing'
                ? 'Transcribing audio via Whisper...'
                : 'Type or record your note here...'
            }
            disabled={status === 'transcribing' || status === 'submitting'}
            rows={1}
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none resize-none leading-relaxed max-h-48 overflow-y-auto py-1.5"
          />

          <button
            onClick={handleSubmitToGemini}
            disabled={!textInput.trim() || status !== 'idle'}
            className={`self-end px-5 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 shrink-0 ${
              textInput.trim() && status === 'idle'
                ? 'bg-gradient-to-r from-teal-500 to-indigo-600 text-white shadow-lg shadow-teal-950/50 hover:opacity-90 hover:scale-[1.02]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
            }`}
          >
            {status === 'submitting' ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Send
              </span>
            ) : (
              'Send'
            )}
          </button>
        </div>

        {/* Интерактивная плашка ввода ссылки на изображение */}
        {showImageInput && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 animate-fadeIn">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Paste image URL (e.g. Pinterest, Unsplash)..."
              className="flex-1 bg-slate-950/60 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddImage();
                }
              }}
            />
            <button
              onClick={handleAddImage}
              disabled={!imageUrl.trim()}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
            <button
              onClick={() => {
                setShowImageInput(false);
                setImageUrl('');
              }}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Нижняя панель действий (Add Photo, Clear) */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImageInput((prev) => !prev)}
              disabled={status !== 'idle'}
              className="text-slate-400 hover:text-teal-300 flex items-center gap-1.5 transition-colors font-medium"
            >
              <Image className="w-3.5 h-3.5" /> Add Photo
            </button>
          </div>

          <div>
            {textInput && (
              <button
                onClick={() => setTextInput('')}
                disabled={status !== 'idle'}
                className="text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Статусы обработки */}
      <div className="text-center h-4">
        {status === 'recording' && (
          <p className="text-rose-400 text-xs animate-pulse font-medium">Recording audio...</p>
        )}
        {status === 'transcribing' && (
          <p className="text-teal-400 text-xs animate-pulse font-medium">Whisper is converting speech to text...</p>
        )}
        {status === 'submitting' && (
          <p className="text-indigo-400 text-xs animate-pulse font-medium">Gemini is structuring your note...</p>
        )}
        {error && <p className="text-rose-400 text-xs font-medium">{error}</p>}
      </div>
    </div>
  );
};