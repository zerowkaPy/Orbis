import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { RecordingState } from '../types';

interface VoiceRecorderProps {
  onNoteAdded: (text: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onNoteAdded }) => {
  const [status, setStatus] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Вспомогательная функция для закрытия и очистки WebSocket
  const closeWebSocket = () => {
    if (wsRef.current) {
      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close(1000, 'Recording finished');
      }
      wsRef.current = null;
    }
  };

  // Вспомогательная функция для остановки всех треков микрофона
  const stopMediaTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname;
      const wsUrl = `${wsProtocol}//${wsHost}:8000/api/v1/note/add`;

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

        mediaRecorder.start(250); // Отправка кусочков аудио каждые 250 мс
        setStatus('recording');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status === 'completed' && data.text) {
            onNoteAdded(data.text);
            setStatus('idle');
            closeWebSocket(); // Завершаем соединение сразу после получения результата
          }
        } catch (err) {
          console.error('Ошибка парсинга WebSocket сообщения:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket ошибка:', err);
        setError('Не удалось подключиться к серверу распознавания');
        stopMediaTracks();
        closeWebSocket();
        setStatus('idle');
      };

      ws.onclose = () => {
        // Если сервер сам закрыл соединение во время транскрибации
        stopMediaTracks();
        setStatus('idle');
      };

    } catch (err) {
      console.error('Доступ к микрофону отклонен:', err);
      setError('Необходимо предоставить доступ к микрофону');
      setStatus('idle');
    }
  };

  const stopRecording = () => {
    // 1. Оправляем 'finish' на бэкенд для начала транскрибации
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('finish');
      setStatus('processing');
    }

    // 2. Останавливаем MediaRecorder и отключаем микрофон
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopMediaTracks();
  };

  const handleClick = () => {
    if (status === 'idle') {
      startRecording();
    } else if (status === 'recording') {
      stopRecording();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center my-12">
      <div className="relative group">
        {status === 'recording' && (
          <div className="absolute -inset-4 bg-teal-500/20 rounded-full blur-xl animate-pulse" />
        )}
        
        <button
          onClick={handleClick}
          disabled={status === 'processing'}
          className={`relative z-10 flex items-center justify-center w-32 h-32 rounded-full border transition-all duration-500 shadow-2xl backdrop-blur-md ${
            status === 'recording'
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 scale-105 shadow-rose-900/30'
              : status === 'processing'
              ? 'bg-slate-800/50 border-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-slate-900/60 border-teal-500/30 text-teal-300 hover:border-teal-400/60 hover:bg-teal-950/40 hover:scale-105 shadow-teal-950/50'
          }`}
        >
          {status === 'idle' && <Mic className="w-12 h-12 stroke-[1.5]" />}
          {status === 'recording' && <Square className="w-10 h-10 fill-current stroke-none" />}
          {status === 'processing' && <Loader2 className="w-10 h-10 animate-spin text-teal-400" />}
        </button>
      </div>

      <div className="mt-6 text-center h-8">
        {status === 'idle' && (
          <p className="text-slate-400 text-sm tracking-wide">
            Нажмите, чтобы начать запись
          </p>
        )}
        {status === 'recording' && (
          <p className="text-rose-400 text-sm tracking-wide animate-pulse font-medium">
            Идет запись... Нажмите еще раз, чтобы закончить
          </p>
        )}
        {status === 'processing' && (
          <p className="text-teal-400 text-sm tracking-wide animate-pulse">
            Обработка и структурирование заметки...
          </p>
        )}
        {error && <p className="text-rose-400/90 text-sm mt-1">{error}</p>}
      </div>
    </div>
  );
};