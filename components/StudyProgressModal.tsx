
import React, { useEffect, useState } from 'react';
import { User, Language } from '../types';
import { t } from '../services/i18n';
import { cloudService } from '../services/cloudService';

interface StudyProgressModalProps {
  user: User;
  onClose: () => void;
  language: Language;
  studiedCount: number;
  dailyGoal: number;
  streak: number;
}

// Fixed: Adding named export 'StudyProgressModal' to resolve import error in App.tsx
export const StudyProgressModal: React.FC<StudyProgressModalProps> = ({
  user,
  onClose,
  language,
  studiedCount,
  dailyGoal,
  streak
}) => {
  const [logs, setLogs] = useState<{ card_id: string, studied_at: string, card_text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const progressPercent = Math.min(100, Math.round((studiedCount / dailyGoal) * 100));

  // 定义环形进度条常量
  const radius = 42;
  const circumference = 2 * Math.PI * radius; // 约 263.89

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const result = await cloudService.getDetailedTodayLogs(user.id);
        setLogs(result);
      } catch (err) {
        console.error("Failed to fetch activity logs", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [user.id]);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
        onClick={onClose}
      ></div>

      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[48px] shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
        {/* Modal Header */}
        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
             </div>
             <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t(language, 'progressModal.title')}</h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{new Date().toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-2xl transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 flex flex-col lg:flex-row gap-12 bg-slate-50/30">
          {/* Left Column: Stats & Rules */}
          <div className="flex-1 space-y-10">
            {/* Main Stats Card */}
            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/40 rounded-full -mr-32 -mt-32 blur-3xl"></div>
               <div className="relative z-10 flex flex-col items-center">
                  <div className="relative w-44 h-44 flex items-center justify-center mb-8">
                     <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 100 100">
                        {/* Background Track */}
                        <circle 
                          cx="50" cy="50" r={radius} 
                          stroke="#f1f3f4" 
                          strokeWidth="8" 
                          fill="transparent" 
                        />
                        {/* Progress Bar */}
                        <circle 
                          cx="50" cy="50" r={radius} 
                          stroke="currentColor" 
                          strokeWidth="8" 
                          fill="transparent" 
                          strokeDasharray={circumference} 
                          strokeDashoffset={circumference - (circumference * progressPercent) / 100}
                          strokeLinecap="round"
                          className="text-blue-600 transition-all duration-1000 ease-out"
                        />
                     </svg>
                     <div className="absolute flex flex-col items-center">
                        <span className="text-4xl font-black text-gray-900">{progressPercent}%</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t(language, 'sidebar.progress')}</span>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8 w-full">
                     <div className="text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Today</p>
                        <p className="text-2xl font-black text-gray-900">{studiedCount} <span className="text-sm font-medium text-gray-400">/ {dailyGoal}</span></p>
                     </div>
                     <div className="text-center border-l border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Streak</p>
                        <p className="text-2xl font-black text-orange-500">🔥 {streak} <span className="text-xs font-bold text-gray-400">DAYS</span></p>
                     </div>
                  </div>
                  {progressPercent >= 100 && (
                    <div className="mt-8 bg-green-50 text-green-600 px-6 py-2 rounded-full text-xs font-black border border-green-100 animate-bounce">
                      ✨ {t(language, 'progressModal.goalReached')}
                    </div>
                  )}
               </div>
            </div>

            {/* Rules Section */}
            <div className="bg-gray-900 rounded-[40px] p-10 text-white relative overflow-hidden">
               <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full -mr-16 -mb-16 blur-2xl"></div>
               <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-6 text-blue-400">{t(language, 'progressModal.rules')}</h3>
               <div className="space-y-4">
                  <p className="text-sm text-gray-300 leading-relaxed">{t(language, 'progressModal.rule1')}</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{t(language, 'progressModal.rule2')}</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{t(language, 'progressModal.rule3')}</p>
               </div>
               <div className="mt-8 pt-8 border-t border-white/5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl">💡</div>
                  <p className="text-xs text-gray-400 font-medium">CardEcho uses a "Distributed Persistence" model. Every card you finish is synced to the cloud immediately.</p>
               </div>
            </div>
          </div>

          {/* Right Column: Activity Log */}
          <div className="w-full lg:w-[400px] flex flex-col">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 text-gray-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              {t(language, 'progressModal.activityLog')}
            </h3>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4 py-20">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">Fetching Footprints...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="bg-white border border-dashed border-gray-200 rounded-[32px] p-12 text-center">
                  <p className="text-4xl mb-4 opacity-20">🚀</p>
                  <p className="text-sm text-gray-400 font-medium">{t(language, 'progressModal.noActivity')}</p>
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:border-blue-200 transition-all group">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-tighter">SUCCESS</span>
                        <span className="text-[10px] font-mono text-gray-300 group-hover:text-blue-400 transition-colors">
                          {formatTime(log.studied_at)}
                        </span>
                     </div>
                     <p className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug">
                       {log.card_text}
                     </p>
                     <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Type: </span>
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Mastery Repeat</span>
                     </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Footer Area */}
        <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-center shrink-0">
           <p className="text-xs text-gray-400 font-medium italic">"Every ripple on CardEcho creates an echo in your memory."</p>
        </div>
      </div>
    </div>
  );
};

export default StudyProgressModal;
