
import React, { useState } from 'react';
import { User, Language } from '../types';
import { cloudService } from '../services/cloudService';
import { t } from '../services/i18n';

interface ProfileProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  language: Language;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser, language }) => {
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      // Note: Here we use a generic update or re-signup logic to sync profile.
      // In a real Supabase setup, you'd use supabase.auth.updateUser or a specific profiles table update.
      // Based on cloudService.ts, we use the signUp method which handles the upsert logic.
      const updatedProfile = await cloudService.signUp({
        ...user,
        name,
        avatar
      }, 'dummy_pass_not_needed_for_upsert'); // In actual usage, cloudService would need refinement for profile-only updates

      if (updatedProfile) {
        onUpdateUser(updatedProfile);
        setMessage({ type: 'success', text: language === 'zh' ? '资料更新成功！' : 'Profile updated successfully!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || (language === 'zh' ? '更新失败，请重试。' : 'Failed to update profile. Please try again.') });
    } finally {
      setIsSaving(false);
    }
  };

  const generateRandomAvatar = () => {
    const newAvatar = `https://picsum.photos/seed/${Math.random()}/200`;
    setAvatar(newAvatar);
  };

  return (
    <div className="max-w-5xl mx-auto p-8 md:p-16 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-gray-900 mb-3">{t(language, 'settings.title')}</h1>
        <p className="text-gray-500 text-lg">{t(language, 'settings.desc')}</p>
      </div>

      <div className="space-y-10">
        <section className="bg-white border border-gray-100 rounded-[40px] p-10 md:p-14 shadow-sm relative overflow-hidden">
          {/* Decorative Background Element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full -mr-32 -mt-32 blur-3xl"></div>

          <div className="flex items-center gap-3 mb-10 border-b border-gray-50 pb-6 relative z-10">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
               <span className="text-xl">👤</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">{t(language, 'settings.personalInfo')}</h2>
          </div>

          <form onSubmit={handleSave} className="space-y-10 relative z-10">
            <div className="flex flex-col lg:flex-row gap-16 items-start">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-6">
                <div className="relative group">
                  <div className="absolute inset-0 bg-blue-600 rounded-[48px] blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                  <img 
                    src={avatar || `https://ui-avatars.com/api/?name=${name}&background=random&size=200`} 
                    alt="Avatar" 
                    className="w-48 h-48 rounded-[48px] object-cover bg-blue-50 border-[6px] border-white shadow-2xl relative z-10 transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <button 
                    type="button" 
                    onClick={generateRandomAvatar} 
                    className="absolute -bottom-2 -right-2 z-20 bg-blue-600 text-white p-3 rounded-2xl shadow-xl hover:bg-blue-700 hover:scale-110 active:scale-95 transition-all border-4 border-white"
                    title="Change Avatar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </button>
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Profile Picture</p>
              </div>

              {/* Form Fields Section */}
              <div className="flex-1 space-y-8 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{t(language, 'settings.displayName')}</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="Enter your name"
                      className="w-full px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all text-gray-800 font-bold text-lg shadow-sm" 
                      required 
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{t(language, 'settings.email')}</label>
                    <div className="flex items-center gap-3 w-full px-6 py-4 rounded-2xl border border-gray-100 bg-gray-100/50 text-gray-400 cursor-not-allowed shadow-inner">
                      <svg className="w-5 h-5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                      <span className="text-sm font-medium">{user.email}</span>
                      <span className="ml-auto text-[10px] font-bold uppercase bg-gray-200 px-2 py-0.5 rounded text-gray-500">Locked</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{t(language, 'settings.avatarUrl')}</label>
                  <div className="relative">
                    <input 
                      type="url" 
                      value={avatar} 
                      onChange={(e) => setAvatar(e.target.value)} 
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-gray-500 text-sm font-mono shadow-sm" 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-blue-50/50 rounded-[32px] border border-blue-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm">💡</div>
                  <p className="text-xs text-blue-800 leading-relaxed font-medium">
                    {language === 'zh' 
                      ? '您的头像和名称将在内容商城发布资源时公开展示。建议使用辨识度高的名称。' 
                      : 'Your avatar and name will be publicly visible when you publish decks to the store. Choose a recognizable name.'}
                  </p>
                </div>
              </div>
            </div>

            {message && (
              <div className={`p-5 rounded-2xl text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {message.type === 'success' ? '✅' : '❌'}
                {message.text}
              </div>
            )}

            <div className="pt-8 border-t border-gray-50 flex justify-end items-center gap-6">
              <p className="text-xs text-gray-400 italic">
                {isSaving ? 'Syncing securely...' : 'Changes are synced to Echo Cloud.'}
              </p>
              <button 
                type="submit" 
                disabled={isSaving || (name === user.name && avatar === user.avatar)} 
                className="px-10 py-4 bg-blue-600 text-white rounded-[20px] font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-30 disabled:shadow-none active:scale-95 flex items-center gap-3 group"
              >
                {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                {isSaving ? t(language, 'settings.syncing') : t(language, 'settings.save')}
                {!isSaving && <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Profile;
