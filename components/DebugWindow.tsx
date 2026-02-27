
import React, { useState, useEffect, useRef } from 'react';
import { debugService, LogEntry } from '../services/debugService';

export const DebugWindow: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return debugService.subscribe(setLogs);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      };
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStartPos.current.x,
          y: e.clientY - dragStartPos.current.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const levelStyles = {
    ai: 'text-blue-400',
    error: 'text-red-400',
    warn: 'text-amber-400',
    info: 'text-gray-400'
  };

  if (isMinimized) {
    return (
      <div 
        style={{ left: position.x, top: position.y }}
        className="fixed z-[9999] drag-handle cursor-move bg-slate-900/90 text-white p-3 rounded-full shadow-2xl backdrop-blur-md border border-white/10 flex items-center gap-2 hover:bg-blue-600 transition-colors"
        onMouseDown={handleMouseDown}
        onClick={() => setIsMinimized(false)}
      >
        <span className="text-xs font-black">DEBUG</span>
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
      </div>
    );
  }

  return (
    <div 
      ref={windowRef}
      style={{ left: position.x, top: position.y }}
      className="fixed z-[9999] w-[400px] max-h-[500px] bg-slate-900/95 text-gray-300 rounded-3xl shadow-2xl backdrop-blur-xl border border-white/10 flex flex-col overflow-hidden font-mono text-[11px]"
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="drag-handle cursor-move bg-white/5 p-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span className="font-black text-[10px] tracking-widest text-white/70 uppercase">Console Echo</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => debugService.clear()} className="hover:text-white transition-colors" title="Clear">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
          <button onClick={() => setIsMinimized(true)} className="hover:text-white transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 12H6" /></svg>
          </button>
        </div>
      </div>

      {/* Log Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar min-h-[200px]">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center opacity-20 italic">
            Waiting for activity...
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="border-b border-white/5 pb-2 animate-in fade-in slide-in-from-left-1 duration-300">
              <div className="flex items-start gap-2">
                <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
                <span className={`font-bold uppercase text-[9px] shrink-0 ${levelStyles[log.level]}`}>
                  {log.level}
                </span>
                <span className="break-words text-gray-200">{log.message}</span>
              </div>
              {log.data && (
                <pre className="mt-1 p-2 bg-black/30 rounded-lg text-[9px] text-gray-400 overflow-x-auto custom-scrollbar">
                  {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Footer */}
      <div className="p-2 bg-black/20 text-[9px] text-center text-gray-600 font-bold uppercase tracking-widest border-t border-white/5">
        Live Stream Active
      </div>
    </div>
  );
};
