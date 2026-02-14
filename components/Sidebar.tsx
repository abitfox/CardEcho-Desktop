
import React from 'react';
import { AppSection, User, Language } from '../types';
import { t } from '../services/i18n';

interface SidebarProps {
  currentSection: AppSection;
  onSectionChange: (section: AppSection) => void;
  user: User | null;
  onLogout: () => void;
  language: Language;
}

const Sidebar: React.FC<SidebarProps> = ({ currentSection, onSectionChange, user, onLogout, language }) => {
  const menuItems = [
    { id: AppSection.LIBRARY, label: t(language, 'sidebar.library'), icon: '📚' },
    { id: AppSection.STORE, label: t(language, 'sidebar.store'), icon: '🛒' },
    { id: AppSection.CREATE, label: t(language, 'sidebar.create'), icon: '➕' },
    { id: AppSection.LEARNING, label: t(language, 'sidebar.learning'), icon: '🎧' },
    { id: AppSection.STATISTICS, label: t(language, 'sidebar.stats'), icon: '📊' },
    { id: AppSection.SETTINGS, label: t(language, 'sidebar.settings'), icon: '⚙️' },
  ];

  return (
    <div className="w-64 bg-[#f1f3f4] h-full flex flex-col border-r border-gray-200">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white text-xl font-bold italic">CE</span>
          </div>
          <span className="text-xl font-semibold tracking-tight text-gray-800">CardEcho</span>
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
        {/* Progress Card */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">{t(language, 'sidebar.progress')}</p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold">12 / 50 {t(language, 'sidebar.cards')}</span>
            <span className="text-xs font-semibold text-blue-600">24%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '24%' }}></div>
          </div>
        </div>

        {/* User Profile Area - Acts as Account Settings Entry */}
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
