import React, { useState } from 'react';
import { BackgroundAnimation } from './components/BackgroundAnimation';
import { VoiceRecorder } from './components/VoiceRecorder';
import { Note } from './types';
import { BookOpen, Sparkles, Clock } from 'lucide-react';

export const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);

  const handleNoteAdded = (text: string) => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      text,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setNotes((prev) => [newNote, ...prev]);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
      <BackgroundAnimation />

      <header className="max-w-2xl mx-auto w-full text-center space-y-3 pt-6">
        <div className="inline-flex items-center gap-2 px-3 h-7 rounded-full bg-teal-950/60 border border-teal-500/20 text-teal-300 text-xs tracking-wider uppercase backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ИИ Ассистент Заметок</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-slate-100">
          Освободите мысли, <br />
          <span className="font-normal text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-emerald-300 to-indigo-300">
            превратив их в структурированный дневник
          </span>
        </h1>
      </header>

      <main className="max-w-2xl mx-auto w-full my-auto py-8">
        <VoiceRecorder onNoteAdded={handleNoteAdded} />

        {/* Список заметок */}
        <section className="mt-8 space-y-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm border-b border-slate-800/80 pb-2 px-1">
            <BookOpen className="w-4 h-4 text-teal-400" />
            <h2 className="font-medium tracking-wide">Записи дневника</h2>
            <span className="ml-auto text-xs text-slate-500">{notes.length} заметок</span>
          </div>

          {notes.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800/60 rounded-2xl bg-slate-900/20 backdrop-blur-xs">
              <p className="text-slate-500 text-sm">
                Заметок пока нет. Запишите первую голосовую мысль выше.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <article
                  key={note.id}
                  className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md transition-all duration-300 hover:border-slate-700/80 hover:bg-slate-900/60 shadow-lg"
                >
                  <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                    {note.text}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    <time>{note.createdAt}</time>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="text-center text-xs text-slate-600 py-4">
        Спокойный голосовой дневник заметок &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;