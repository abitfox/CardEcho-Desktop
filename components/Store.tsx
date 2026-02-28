
import React, { useState } from 'react';
import { Deck, Language } from '../types';
import { t } from '../services/i18n';

interface StoreProps {
  featuredDecks: Deck[];
  onSubscribe: (deck: Deck) => void;
  subscribedTitles: string[];
  language: Language;
  userId: string;
  userRole?: number;
  onUpdateStoreMetadata: (deckId: string, metadata: any) => Promise<void>;
  onDeleteStoreDeck: (deckId: string) => Promise<void>;
  onRefresh: () => Promise<void>; // 新增刷新回调
}

const Store: React.FC<StoreProps> = ({ 
  featuredDecks, 
  onSubscribe, 
  subscribedTitles, 
  language, 
  userId, 
  userRole,
  onUpdateStoreMetadata,
  onDeleteStoreDeck,
  onRefresh
}) => {
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [editingStoreDeck, setEditingStoreDeck] = useState<Deck | null>(null);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [storeDeckToDelete, setStoreDeckToDelete] = useState<Deck | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAdmin = userRole === 1;

  const handleSubscribeClick = async (deck: Deck) => {
    setSubscribingId(deck.id);
    try {
      await onSubscribe(deck);
    } finally {
      setSubscribingId(null);
    }
  };

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStoreDeck) return;
    setIsSavingMetadata(true);
    try {
      await onUpdateStoreMetadata(editingStoreDeck.id, {
        title: editingStoreDeck.title,
        description: editingStoreDeck.description,
        icon: editingStoreDeck.icon,
        tags: editingStoreDeck.tags || []
      });
      setEditingStoreDeck(null);
    } catch (err) {
      alert("Failed to update store deck info.");
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const confirmStoreDelete = async () => {
    if (!storeDeckToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteStoreDeck(storeDeckToDelete.id);
      setStoreDeckToDelete(null);
    } catch (err: any) {
      console.error("Delete from store failed:", err);
      alert(err.message || "Failed to delete store listing.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-12 overflow-y-auto h-full bg-white custom-scrollbar relative">
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t(language, 'store.title')}</h1>
          <p className="text-gray-500">{t(language, 'store.desc')}</p>
        </div>
        {/* 刷新按钮 */}
        <button 
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-5 py-3 bg-gray-50 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-100 transition-all border border-gray-100 disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t(language, 'store.refresh')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {featuredDecks.map((deck) => {
          const isOwner = deck.createdBy === userId;
          const isSubscribed = subscribedTitles.includes(deck.title);
          
          return (
            <div 
              key={deck.id} 
              onClick={() => setSelectedDeck(deck)}
              className="group bg-white border border-gray-100 rounded-3xl p-8 hover:shadow-2xl hover:border-blue-200 transition-all flex flex-col cursor-pointer relative"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="text-5xl group-hover:scale-110 transition-transform">{deck.icon}</div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{deck.title}</h3>
              <p className="text-gray-500 text-sm mb-6 flex-grow line-clamp-2">{deck.description}</p>
              
              <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                <span className="bg-gray-50 px-2 py-1 rounded border border-gray-100 uppercase">BY {deck.author || 'ECHO'}</span>
                <span>•</span>
                <span>{deck.cards.length} {t(language, 'sidebar.cards').toUpperCase()}</span>
              </div>

              {/* Status Badge - Top Right */}
              {isOwner ? (
                <div className="absolute top-6 right-6 bg-blue-100 text-blue-600 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 border border-blue-200 shadow-sm">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                  {t(language, 'store.myPublished').toUpperCase()}
                </div>
              ) : isSubscribed ? (
                <div className="absolute top-6 right-6 bg-green-100 text-green-600 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 border border-green-200 shadow-sm">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  {t(language, 'store.subscribed').toUpperCase()}
                </div>
              ) : null}

              {/* Action Buttons Container - Bottom Right */}
              <div className="absolute bottom-6 right-6 flex gap-2">
                {isOwner && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingStoreDeck({...deck}); }}
                    className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm border border-gray-100"
                    title={language === 'zh' ? '管理商城信息' : 'Manage Store Info'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                )}
                {(isAdmin || isOwner) && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setStoreDeckToDelete(deck); }}
                    className="p-2.5 bg-red-50 text-red-300 rounded-xl hover:text-red-600 hover:bg-red-100 transition-all shadow-sm border border-red-50"
                    title={t(language, 'store.deleteFromStore')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal (Admin or Owner) */}
      {storeDeckToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => setStoreDeckToDelete(null)}></div>
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl relative z-10 p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t(language, 'store.deleteConfirmTitle')}</h2>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              {t(language, 'store.deleteConfirmMsg')}
              <br/><br/>
              <span className="font-bold text-gray-800">"{storeDeckToDelete.title}"</span>
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setStoreDeckToDelete(null)}
                className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors"
              >
                {t(language, 'library.deleteCancel')}
              </button>
              <button 
                onClick={confirmStoreDelete}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-600 text-white text-sm font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                {isDeleting ? t(language, 'settings.syncing') : t(language, 'library.deleteAction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Store Metadata Modal */}
      {editingStoreDeck && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setEditingStoreDeck(null)}></div>
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl relative z-10 p-10 flex flex-col animate-in zoom-in-95 duration-300">
             <h2 className="text-2xl font-bold mb-6">{t(language, 'store.listingSettings')}</h2>
             <form onSubmit={handleUpdateMetadata} className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                   <div className="col-span-1 space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t(language, 'editor.coverIcon')}</label>
                      <input 
                        type="text" 
                        value={editingStoreDeck.icon} 
                        onChange={(e) => setEditingStoreDeck({...editingStoreDeck, icon: e.target.value})}
                        className="w-full text-3xl p-3 bg-gray-50 border border-gray-100 rounded-2xl text-center outline-none focus:ring-4 focus:ring-blue-50"
                      />
                   </div>
                   <div className="col-span-3 space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t(language, 'editor.deckTitle')}</label>
                      <input 
                        type="text" 
                        value={editingStoreDeck.title} 
                        onChange={(e) => setEditingStoreDeck({...editingStoreDeck, title: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 font-bold"
                      />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t(language, 'editor.deckDescription')}</label>
                   <textarea 
                     value={editingStoreDeck.description} 
                     onChange={(e) => setEditingStoreDeck({...editingStoreDeck, description: e.target.value})}
                     className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 h-32 resize-none text-sm text-gray-600"
                   />
                </div>
                <div className="flex justify-end gap-4 mt-8">
                   <button type="button" onClick={() => setEditingStoreDeck(null)} className="px-6 py-3 text-gray-400 font-bold">{t(language, 'create.cancel')}</button>
                   <button 
                     type="submit" 
                     disabled={isSavingMetadata}
                     className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                   >
                     {isSavingMetadata ? t(language, 'settings.syncing') : t(language, 'settings.save')}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Deck Detail Modal */}
      {selectedDeck && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={() => setSelectedDeck(null)}
          ></div>
          
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-10 pb-6 border-b border-gray-50">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-6">
                   <span className="text-6xl">{selectedDeck.icon}</span>
                   <div>
                      <h2 className="text-3xl font-bold text-gray-900">{selectedDeck.title}</h2>
                      <p className="text-gray-500 mt-1">{selectedDeck.description}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                          {selectedDeck.cards.length} {t(language, 'sidebar.cards').toUpperCase()}
                        </span>
                        <span className="text-xs font-medium text-gray-400 italic">Created by {selectedDeck.author || 'CardEcho Academy'}</span>
                      </div>
                   </div>
                </div>
                <button 
                  onClick={() => setSelectedDeck(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            {/* Modal Content - Card Preview List */}
            <div className="flex-1 overflow-y-auto p-10 pt-6 space-y-6 custom-scrollbar bg-gray-50/30">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">{t(language, 'store.preview')}</h3>
              <div className="space-y-4">
                {selectedDeck.cards.map((card, i) => (
                  <div key={card.id} className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-2">
                       <p className="text-lg font-bold text-gray-800 flex-1">{card.text}</p>
                       <span className="text-[10px] font-mono text-gray-300 group-hover:text-blue-400 transition-colors">#{i + 1}</span>
                    </div>
                    <p className="text-sm text-gray-500 italic mb-4">{card.translation}</p>
                    <div className="flex flex-wrap gap-2">
                      {card.breakdown && card.breakdown.map((b, j) => (
                        <div key={j} className="flex flex-col bg-gray-50/50 px-2.5 py-1.5 rounded-lg border border-gray-100/50">
                           <span className="text-[11px] font-bold text-gray-700">{b.word}</span>
                           <span className="text-[9px] text-gray-400">{b.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-gray-50 flex items-center justify-between bg-white">
              <button 
                onClick={() => setSelectedDeck(null)}
                className="px-8 py-3 text-gray-400 font-bold hover:text-gray-600 transition-colors"
              >
                {t(language, 'create.cancel')}
              </button>
              
              <div className="flex items-center gap-4">
                {subscribingId === selectedDeck.id ? (
                  <div className="flex items-center gap-3 text-blue-600 font-bold text-sm">
                    <div className="w-5 h-5 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    {t(language, 'store.subscribing')}
                  </div>
                ) : selectedDeck.createdBy === userId ? (
                  <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-8 py-3 rounded-2xl border border-blue-100 font-bold">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                    {t(language, 'store.myPublished').toUpperCase()}
                  </div>
                ) : subscribedTitles.includes(selectedDeck.title) ? (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 px-8 py-3 rounded-2xl border border-green-100 font-bold">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                    {t(language, 'store.subscribed')}
                  </div>
                ) : (
                  <button 
                    onClick={() => handleSubscribeClick(selectedDeck)}
                    className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
                  >
                    {t(language, 'store.subscribeFree')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Store;
