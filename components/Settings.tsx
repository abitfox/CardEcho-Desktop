
import React from 'react';
import { Language, AIModel, AIProvider, VoiceProvider } from '../types';
import { t } from '../services/i18n';

interface SettingsProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  provider: AIProvider;
  onProviderChange: (provider: AIProvider) => void;
  voiceProvider: VoiceProvider;
  onVoiceProviderChange: (provider: VoiceProvider) => void;
  model: AIModel;
  onModelChange: (model: AIModel) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  showDebug: boolean;
  onToggleDebug: (show: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  language, onLanguageChange, 
  provider, onProviderChange,
  voiceProvider, onVoiceProviderChange,
  model, onModelChange, 
  speed, onSpeedChange,
  showDebug, onToggleDebug
}) => {
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5];

  const getModelDescription = () => {
    switch(model) {
      case 'gemini-3-flash-preview': return t(language, 'settings.modelFlashDesc');
      case 'gemini-3-pro-preview': return t(language, 'settings.modelProDesc');
      case 'deepseek-chat': return t(language, 'settings.modelDsChatDesc');
      case 'deepseek-reasoner': return t(language, 'settings.modelDsReasonDesc');
      default: return '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-10 md:p-12 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t(language, 'settings.title')}</h1>
        <p className="text-gray-500 text-sm font-medium">{t(language, 'settings.desc')}</p>
      </div>

      <div className="space-y-6 pb-20">
        {/* System & Language Section */}
        <section className="bg-white border border-gray-100 rounded-[28px] p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50/30 rounded-full -mr-24 -mt-24 blur-3xl pointer-events-none"></div>

          <div className="flex items-center gap-3 mb-8 pb-5 border-b border-gray-50 relative z-10">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-[10px]">⚙️</div>
            <h2 className="text-lg font-bold text-gray-800">{t(language, 'settings.systemPref')}</h2>
          </div>
          
          <div className="space-y-4 relative z-10">
            {/* Language Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-gray-50 gap-6 transition-all hover:bg-white hover:border-blue-100">
              <div className="max-w-sm">
                <p className="font-bold text-gray-800 text-sm mb-0.5">{t(language, 'settings.language')}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{t(language, 'settings.languageDesc')}</p>
              </div>
              <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-100 w-fit">
                 <button 
                  onClick={() => onLanguageChange('zh')}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${language === 'zh' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                 >简体中文</button>
                 <button 
                  onClick={() => onLanguageChange('en')}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${language === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                 >English</button>
              </div>
            </div>

            {/* AI Provider Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-gray-50 gap-6 transition-all hover:bg-white hover:border-blue-100">
              <div className="max-w-sm">
                <p className="font-bold text-gray-800 text-sm mb-0.5">{t(language, 'settings.aiProvider')}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{t(language, 'settings.aiProviderDesc')}</p>
              </div>
              <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-100 w-fit">
                 <button 
                  onClick={() => onProviderChange('google')}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${provider === 'google' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                 >Google</button>
                 <button 
                  onClick={() => onProviderChange('deepseek')}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${provider === 'deepseek' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                 >DeepSeek</button>
              </div>
            </div>

            {/* Voice Provider Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-gray-50 gap-6 transition-all hover:bg-white hover:border-blue-100">
              <div className="max-w-sm">
                <p className="font-bold text-gray-800 text-sm mb-0.5">{t(language, 'settings.voiceProvider')}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{t(language, 'settings.voiceProviderDesc')}</p>
              </div>
              <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-100 w-fit">
                 <button 
                  onClick={() => onVoiceProviderChange('google')}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${voiceProvider === 'google' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                 >Google</button>
                 <button 
                  onClick={() => onVoiceProviderChange('doubao')}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${voiceProvider === 'doubao' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                 >
                   <span className="text-sm">🟣</span> 豆包语音
                 </button>
              </div>
            </div>

            {/* AI Model Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-gray-50 gap-6 transition-all hover:bg-white hover:border-blue-100">
              <div className="max-w-sm">
                <p className="font-bold text-gray-800 text-sm mb-0.5">{t(language, 'settings.modelSelect')}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{getModelDescription()}</p>
              </div>
              <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-100 w-fit flex-wrap">
                 {provider === 'google' ? (
                   <>
                    <button 
                      onClick={() => onModelChange('gemini-3-flash-preview')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${model === 'gemini-3-flash-preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >FLASH</button>
                    <button 
                      onClick={() => onModelChange('gemini-3-pro-preview')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${model === 'gemini-3-pro-preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >PRO</button>
                   </>
                 ) : (
                   <>
                    <button 
                      onClick={() => onModelChange('deepseek-chat')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${model === 'deepseek-chat' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >CHAT</button>
                    <button 
                      onClick={() => onModelChange('deepseek-reasoner')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${model === 'deepseek-reasoner' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >R1</button>
                   </>
                 )}
              </div>
            </div>

            {/* Playback Speed Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-gray-100 gap-6 transition-all hover:bg-white hover:border-blue-100">
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
          </div>
        </section>

        {/* Developer Options */}
        <section className="bg-white border border-gray-100 rounded-[28px] p-8 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/30 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
           
           <div className="flex items-center gap-3 mb-8 pb-5 border-b border-gray-50 relative z-10">
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white text-[10px]">🛠️</div>
              <h2 className="text-lg font-bold text-gray-800">{t(language, 'settings.devOptions')}</h2>
           </div>

           <div className="space-y-4 relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-amber-50/20 rounded-2xl border border-amber-50/50 gap-6 transition-all hover:bg-white hover:border-amber-200">
                <div className="max-w-sm">
                  <p className="font-bold text-amber-900 text-sm mb-0.5">{t(language, 'settings.showDebug')}</p>
                  <p className="text-xs text-amber-600/70 leading-relaxed">{t(language, 'settings.showDebugDesc')}</p>
                </div>
                <div className="flex items-center gap-3">
                   <button 
                    onClick={() => onToggleDebug(!showDebug)}
                    className={`w-12 h-6 rounded-full relative cursor-pointer transition-all duration-300 ${showDebug ? 'bg-amber-500' : 'bg-gray-200'}`}
                   >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm ring-1 ring-black/5 transition-all duration-300 ${showDebug ? 'left-[26px]' : 'left-[2px]'}`}></div>
                   </button>
                </div>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
