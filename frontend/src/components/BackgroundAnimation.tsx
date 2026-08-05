import React from 'react';

export const BackgroundAnimation: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-slate-950">
      {/* Мягкие размытые градиентные сферы */}
      <div className="absolute -top-[20%] -left-[10%] w-[500px] h-[500px] rounded-full bg-teal-900/20 blur-[120px] animate-spin-slow" />
      <div className="absolute top-[40%] -right-[10%] w-[600px] h-[600px] rounded-full bg-indigo-900/15 blur-[150px] animate-reverse-spin" />
      <div className="absolute -bottom-[20%] left-[20%] w-[550px] h-[550px] rounded-full bg-emerald-950/25 blur-[130px] animate-slow-pulse" />
      
      {/* Едва заметная сетка для глубины */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      />
    </div>
  );
};