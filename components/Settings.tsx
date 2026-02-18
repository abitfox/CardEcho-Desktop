
import React from 'react';
import { Language, AIModel } from '../types';
import { t } from '../services/i18n';

interface SettingsProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  model: AIModel;
  onModelChange: (model: AIModel) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

const Settings: React.FC<SettingsProps> = ({ language, onLanguageChange, model, onModelChange, speed, onSpeedChange }) => {
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5];

  return (
    <div className="max-w-6xl mx-auto p-10 md:p-12 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t(language, 'settings.systemPref')}</h1>
        <p className="text-gray-500 text-sm font-medium">{t(language, 'settings.desc')}</p>
      </div>

      <div className="space-y-6">
        {/* System & Language Section */}
        <section className="bg-white border border-gray-100 rounded-[28px] p-8 shadow-sm relative overflow-hidden">
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50/30 rounded-full -mr-24 -mt-24 blur-3xl pointer-events-none"></div>

          <div className="flex items-center gap-3 mb-8 pb-5 border-b border-gray-50 relative z-10">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
               <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
               </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-800">{t(language, 'settings.systemPref')}</h2>
          </div>
          
          <div className="space-y-4 relative z-10">
            {/* Language Setting Item */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-gray-50 gap-6 transition-all hover:bg-white hover:border-blue-100">
              <div className="max-w-sm">
                <p className="font-bold text-gray-800 text-sm mb-0.5">{t(language, 'settings.language')}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{t(language, 'settings.languageDesc')}</p>
              </div>
              <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-100 w-fit">
                 <button 
                  onClick={() => onLanguageChange('zh')}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${language === 'zh' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                 >
                   简体中文
                 </button>
                 <button 
                  onClick={() => onLanguageChange('en')}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${language === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                 >
                   English
                 </button>
              </div>
            </div>

            {/* AI Model Setting Item */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-gray-50 gap-6 transition-all hover:bg-white hover:border-blue-100">
              <div className="max-w-sm">
                <p className="font-bold text-gray-800 text-sm mb-0.5">{t(language, 'settings.modelSelect')}</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {model === 'gemini-3-flash-preview' ? t(language, 'settings.modelFlashDesc') : t(language, 'settings.modelProDesc')}
                </p>
              </div>
              <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-100 w-fit">
                 <button 
                  onClick={() => onModelChange('gemini-3-flash-preview')}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${model === 'gemini-3-flash-preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                 >
                   <span className="text-sm">⚡</span> FLASH
                 </button>
                 <button 
                  onClick={() => onModelChange('gemini-3-pro-preview')}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${model === 'gemini-3-pro-preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                 >
                   <span className="text-sm">✨</span> PRO
                 </button>
              </div>
            </div>

            {/* Playback Speed Setting Item */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-gray-50 gap-6 transition-all hover:bg-white hover:border-blue-100">
              <div className="max-w-sm">
                <p className="font-bold text-gray-800 text-sm mb-0.5">{t(language, 'settings.playbackSpeed')}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{t(language, 'settings.playbackSpeedDesc')}</p>
              </div>
              <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-100 w-fit">
                 {speedOptions.map(opt => (
                   <button 
                    key={opt}
                    onClick={() => onSpeedChange(opt)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${speed === opt ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                     {opt.toFixed(2)}x
                   </button>
                 ))}
              </div>
            </div>

            {/* Cloud Sync Setting Item */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-gray-50 gap-6 transition-all hover:bg-white hover:border-blue-100">
              <div className="max-w-sm">
                <p className="font-bold text-gray-800 text-sm mb-0.5">{t(language, 'settings.cloudSync')}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{t(language, 'settings.cloudSyncDesc')}</p>
              </div>
              <div className="flex items-center gap-3">
                 <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 uppercase tracking-wider">Enabled</span>
                 <button className="w-12 h-6 bg-blue-500 rounded-full relative cursor-pointer transition-transform active:scale-90">
                    <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm ring-1 ring-black/5"></div>
                 </button>
              </div>
            </div>

            {/* Hint Box */}
            <div className="mt-4 p-5 bg-blue-50/40 rounded-2xl border border-blue-100/50 flex items-start gap-3">
              <span className="text-base mt-0.5">✨</span>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest">Storage & Performance</p>
                <p className="text-xs text-blue-700/70 leading-relaxed font-medium">
                  {language === 'zh' 
                    ? '设置实时保存。硬件加速目前已针对您的当前设备自动优化。' 
                    : 'Changes are saved instantly. Hardware acceleration is auto-optimized for your device.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Account Quick Info (Optional Fresh Card) */}
        <section className="bg-gray-50/50 border border-dashed border-gray-200 rounded-[28px] p-8 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-gray-400 font-medium max-w-xs">
              {language === 'zh' 
                ? 'CardEcho 会定期检查系统更新以确保 AI 模型的最佳运行性能。' 
                : 'CardEcho periodically checks for updates to ensure optimal AI model performance.'}
            </p>
        </section>
      </div>
    </div>
  );
};

export default Settings;
