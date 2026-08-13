import React, { useState, useEffect } from 'react';
import { BackgroundAnimation } from './components/BackgroundAnimation';
import { VoiceRecorder } from './components/VoiceRecorder';
import { CategoryManager } from './components/CategoryManager';
import { InteractiveNodeCanvas } from './components/InteractiveNodeCanvas';
import { ToastContainer } from './components/Toast';
import { NoteGeminiAnswer, ToastNotification } from './types';
import { Layers, Mic, Network } from 'lucide-react';

// Импорт логотипа и текстового бренда
import orbisLogo from './assets/icons/orbis_logo.png';
import orbisText from './assets/icons/orbis_text.png';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'recorder' | 'categories' | 'canvas'>('recorder');
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Установка логотипа Orbis во вкладку браузера (favicon)
  useEffect(() => {
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = orbisLogo;
  }, []);

  const handleNoteProcessed = (data: NoteGeminiAnswer) => {
    const id = crypto.randomUUID();

    // Fallback if category name wasn't provided
    const categoryName = data.category_name || `Category #${data.category_id}` || 'Uncategorized';

    const newToast: ToastNotification = {
      id,
      category_id: data.category_id,
      category_name: categoryName,
      message: data.note_text_in_markdown_format,
      type: 'success',
    };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const handleNoteError = (message?: string) => {
    const id = crypto.randomUUID();

    const errorToast: ToastNotification = {
      id,
      type: 'error',
      message: message || 'Не вдалося створити нотатку 😢',
    };

    setToasts((prev) => [...prev, errorToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
      <BackgroundAnimation />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <header className="max-w-4xl mx-auto w-full text-center space-y-4 pt-4 z-10">
        {/* Логотип + название бренда по центру */}
        <div className="flex flex-col items-center justify-center gap-1">
          <img
            src={orbisLogo}
            alt="Orbis Logo"
            className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-md"
          />
          <img
            src={orbisText}
            alt="Orbis"
            className="w-28 h-28 md:w-36 md:h-36 object-contain drop-shadow-lg"
          />
        </div>

        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-slate-100">
          Your{' '}
          <span className="font-normal text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-violet-300 to-purple-400">
            most attentive listener. Probably.
          </span>
        </h1>

        {/* Navigation Tabs */}
        <div className="flex justify-center flex-wrap gap-2 pt-2">
          <button
            onClick={() => setActiveTab('recorder')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all duration-300 ${
              activeTab === 'recorder'
                ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 shadow-lg backdrop-blur-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Mic className="w-4 h-4" /> Record
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all duration-300 ${
              activeTab === 'categories'
                ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40 shadow-lg backdrop-blur-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Layers className="w-4 h-4" /> Library
          </button>

          {/* Новая вкладка интерактивной карты */}
          <button
            onClick={() => setActiveTab('canvas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all duration-300 ${
              activeTab === 'canvas'
                ? 'bg-teal-500/20 text-teal-200 border border-teal-500/40 shadow-lg backdrop-blur-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Network className="w-4 h-4" /> Interactive Map
          </button>
        </div>
      </header>

      {/* Вывод соответствующего компонента */}
      <main className="max-w-5xl mx-auto w-full my-auto py-6 z-10">
        {activeTab === 'recorder' && (
          <VoiceRecorder
            onNoteProcessed={handleNoteProcessed}
            onError={handleNoteError}
          />
        )}
        {activeTab === 'categories' && <CategoryManager onError={handleNoteError} />}
        {activeTab === 'canvas' && (
          <div className="fixed inset-0 top-0 left-0 w-screen h-screen z-20">
            <InteractiveNodeCanvas
              onNavigate={(view) => {
                if (view === 'recorder' || view === 'categories' || view === 'canvas') {
                  setActiveTab(view);
                }
              }}
              onClose={() => setActiveTab('recorder')}
            />
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-slate-600 py-4 z-10">
        Orbis &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;