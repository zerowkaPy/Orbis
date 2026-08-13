import React from 'react';
import { ToastNotification } from '../types';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 space-y-3 max-w-sm w-full">
      {toasts.map((toast) => {
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-xl shadow-2xl backdrop-blur-md animate-slide-up border ${
              isError
                ? 'bg-rose-950/90 border-rose-500/40'
                : 'bg-slate-900/90 border-teal-500/40'
            }`}
          >
            {isError ? (
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              {isError ? (
                <p className="text-xs text-rose-200 font-medium">
                  {toast.message || 'Не вдалося створити нотатку 😢'}
                </p>
              ) : (
                <>
                  <p className="text-xs text-slate-200 font-medium">New note added to category:</p>
                  <span className="inline-block mt-1 text-xs font-semibold text-teal-300 bg-teal-950/60 border border-teal-500/20 px-2 py-0.5 rounded">
                    {toast.category_name}
                  </span>
                </>
              )}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};