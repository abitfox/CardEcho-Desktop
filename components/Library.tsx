
import React from 'react';
import { Deck, Language } from '../types';
import { t } from '../services/i18n';

/**
 *  decks - 卡组列表
   storeDecks - 商城卡组
   libraryTab - 当前标签页
   setLibraryTab - 切换标签页
   language - 语言
   hasReviewCards - 是否有复习卡片
   onSectionChange - 页面切换回调
   onSetActiveDeck - 设置当前卡组
   onSetEditingDeck - 设置编辑卡组
   onSetDeckToDelete - 设置删除卡组
   onStartReviewSession - 开始复习会话
   deckTimestamps - 卡组最近学习/编辑时间
 */
interface LibraryProps {
  decks: Deck[];
  storeDecks: Deck[];
  libraryTab: 'created' | 'subscribed';
  setLibraryTab: (tab: 'created' | 'subscribed') => void;
  language: Language;
  hasReviewCards: boolean;
  onSectionChange: (section: any) => void;
  onSetActiveDeck: (deck: Deck) => void;
  onSetEditingDeck: (deck: Deck) => void;
  onSetDeckToDelete: (deck: Deck) => void;
  onStartReviewSession: () => void;
  deckTimestamps?: Record<string, { lastStudied: number; lastEdited: number }>;
}

const Library: React.FC<LibraryProps> = ({
  decks,
  storeDecks,
  libraryTab,
  setLibraryTab,
  language,
  hasReviewCards,
  onSectionChange,
  onSetActiveDeck,
  onSetEditingDeck,
  onSetDeckToDelete,
  onStartReviewSession,
  deckTimestamps = {}
}) => {
  // 按最近学习/编辑时间排序，最新的排在前面
  const sortedDecks = [...decks].sort((a, b) => {
    const timestampA = deckTimestamps[a.id] || { lastStudied: 0, lastEdited: 0 };
    const timestampB = deckTimestamps[b.id] || { lastStudied: 0, lastEdited: 0 };
    
    // 优先按最近学习时间排序，其次按编辑时间，最后按创建时间
    const timeA = Math.max(timestampA.lastStudied, timestampA.lastEdited, a.createdAt);
    const timeB = Math.max(timestampB.lastStudied, timestampB.lastEdited, b.createdAt);
    
    return timeB - timeA;
  });
  const AppSection = {
    LEARNING: 'learning' as const,
    CREATE: 'create' as const,
    EDIT: 'edit' as const,
  };

  return (
    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">{t(language, 'library.title')}</h1>
            <div className="flex gap-6 mt-6">
              <button 
                onClick={() => setLibraryTab('created')} 
                className={`text-sm font-bold pb-2 border-b-2 transition-all ${libraryTab === 'created' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                {t(language, 'library.tabCreated')}
              </button>
              <button 
                onClick={() => setLibraryTab('subscribed')} 
                className={`text-sm font-bold pb-2 border-b-2 transition-all ${libraryTab === 'subscribed' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                {t(language, 'library.tabSubscribed')}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {hasReviewCards && (
              <button 
                onClick={onStartReviewSession} 
                className="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-bold hover:shadow-xl hover:scale-105 transition-all shadow-lg active:scale-95 animate-in fade-in slide-in-from-right-2 duration-300"
              >
                <span>❤️</span>{language === 'zh' ? '开始训练' : 'REVIEW'}
              </button>
            )}
            <button 
              onClick={() => onSectionChange(AppSection.CREATE)} 
              className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center gap-2"
            >
              <span className="text-xl">✨</span> {t(language, 'sidebar.create')}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedDecks.filter(d => libraryTab === 'created' ? !d.isSubscribed : d.isSubscribed).map((deck) => {
            const isPublishedToStore = storeDecks.some(sd => sd.originDeckId === deck.id);
            return (
              <div key={deck.id} className="group bg-white border border-gray-100 rounded-[32px] p-8 hover:shadow-2xl hover:border-blue-200 transition-all flex flex-col relative overflow-hidden">
                {libraryTab === 'created' && isPublishedToStore && (
                  <div className="absolute top-4 right-4 bg-indigo-50/80 backdrop-blur-sm text-indigo-600 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 border border-indigo-100 shadow-sm z-10">
                    {language === 'zh' ? '已上架商城' : 'ON MARKET'}
                  </div>
                )}
                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform origin-left">{deck.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{deck.title}</h3>
                <p className="text-gray-500 text-sm mb-4 flex-grow line-clamp-2">{deck.description}</p>
                
                {/* 订阅的卡包显示原始发布者 */}
                {libraryTab === 'subscribed' && deck.author && (
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mb-4">
                    <span className="bg-gray-50 px-2 py-1 rounded border border-gray-100 uppercase">BY {deck.author}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded">{deck.cards.length} {t(language, 'sidebar.cards')}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onSetDeckToDelete(deck)} 
                      className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                    <button 
                      onClick={() => { onSetEditingDeck(deck); onSectionChange(AppSection.EDIT); }} 
                      className="p-3 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button 
                      onClick={() => { onSetActiveDeck(deck); onSectionChange(AppSection.LEARNING); }} 
                      className="px-6 py-3 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg"
                    >
                      {t(language, 'library.study')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Library;
