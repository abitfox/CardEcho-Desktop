
import React from 'react';
import { AppSection, User, Language } from '../types';
import { t } from '../services/i18n';

interface SidebarProps {
  currentSection: AppSection;
  onSectionChange: (section: AppSection) => void;
  user: User | null;
  onLogout: () => void;
  language: Language;
  hasDecks: boolean;
  studiedCount: number;
  dailyGoal: number;
  onProgressClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentSection, 
  onSectionChange, 
  user, 
  onLogout, 
  language, 
  hasDecks, 
  studiedCount, 
  dailyGoal,
  onProgressClick
}) => {
  const menuItems = [
    { id: AppSection.LIBRARY, label: t(language, 'sidebar.library'), icon: '📚' },
    { id: AppSection.STORE, label: t(language, 'sidebar.store'), icon: '🛒' },
    { id: AppSection.CREATE, label: t(language, 'sidebar.create'), icon: '➕' },
    ...(hasDecks ? [
      { id: AppSection.LEARNING, label: t(language, 'sidebar.learning'), icon: '🎧' },
      { id: AppSection.TRAINING, label: t(language, 'sidebar.training'), icon: '🎯' }
    ] : []),
    { id: AppSection.STATISTICS, label: t(language, 'sidebar.stats'), icon: '📊' },
    { id: AppSection.SETTINGS, label: t(language, 'sidebar.settings'), icon: '⚙️' },
  ];

  const progressPercent = Math.min(100, Math.round((studiedCount / dailyGoal) * 100));

  return (
    <div className="w-64 bg-[#f1f3f4] h-full flex flex-col border-r border-gray-200">
      <div className="p-6">
        {/* NEW REDESIGNED LOGO */}
        <div className="flex items-center gap-3 mb-10 group cursor-pointer" onClick={() => onSectionChange(AppSection.LIBRARY)}>
          <div className="relative w-11 h-11 flex items-center justify-center">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-blue-600/20 blur-xl rounded-full scale-75 group-hover:scale-110 transition-transform duration-500"></div>
            
            {/* Icon Container */}
            <div className="relative w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-[0_8px_16px_rgba(37,99,235,0.25)] flex items-end justify-center gap-[3px] p-2.5 overflow-hidden transition-all duration-300 group-hover:shadow-[0_12px_24px_rgba(37,99,235,0.35)] active:scale-95">
              <div className="w-1.5 h-3 bg-white/40 rounded-full group-hover:h-5 transition-all duration-300"></div>
              <div className="w-1.5 h-6 bg-white rounded-full group-hover:h-4 transition-all duration-300"></div>
              <div className="w-1.5 h-4 bg-white/70 rounded-full group-hover:h-6 transition-all duration-300"></div>
              
              {/* Subtle Card Layer Overlay */}
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/10 to-transparent pointer-events-none"></div>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-gray-900 leading-none">CardEcho</span>
            <span className="text-[10px] font-bold text-blue-600/60 uppercase tracking-widest mt-1">Linguistics AI</span>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                currentSection === item.id
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-100'
                  : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-4 space-y-4">
        {/* Clickable Progress Card */}
        <button 
          onClick={onProgressClick}
          className="w-full text-left bg-white p-4 rounded-xl shadow-sm border border-gray-100 group hover:shadow-md hover:border-blue-200 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors font-bold">{t(language, 'sidebar.progress')}</p>
            <span className="text-[10px] text-gray-300">DETAILS ➔</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold">{studiedCount} / {dailyGoal}</span>
            <span className={`text-xs font-black ${progressPercent >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
              {progressPercent}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-out shadow-sm ${progressPercent >= 100 ? 'bg-green-500' : 'bg-blue-600'}`} 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </button>

        {user && (
          <div className="flex items-center justify-between p-2 hover:bg-gray-200 rounded-xl transition-colors group">
            <button 
              onClick={() => onSectionChange(AppSection.PROFILE)}
              className="flex items-center gap-3 overflow-hidden flex-1 text-left"
            >
              <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`} alt={user.name} className="w-8 h-8 rounded-lg bg-blue-100 object-cover" />
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-gray-900 truncate">
                  {user.name}
                  {user.role === 1 && (
                    <span className="ml-1 text-[10px] text-blue-600 bg-blue-50 px-1 rounded font-bold"> (admin)</span>
                  )}
                  {user.role === 2 && (
                    <span className="ml-1 text-[10px] text-amber-600 bg-amber-50 px-1 rounded font-bold"> (VIP)</span>
                  )}
                </p>
                <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
              </div>
            </button>
            <button 
              onClick={onLogout}
              title={t(language, 'sidebar.logout')}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-6 0v-1m6-11V7a3 3 0 00-6 0v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
