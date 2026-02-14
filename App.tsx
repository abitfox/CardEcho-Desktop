
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CardPlayer from './components/CardPlayer';
import AnalysisPanel from './components/AnalysisPanel';
import Auth from './components/Auth';
import ContentCreator from './components/ContentCreator';
import Store from './components/Store';
import DeckEditor from './components/DeckEditor';
import Settings from './components/Settings';
import Profile from './components/Profile';
import { AppSection, Card, Deck, User, Language } from './types';
import { MOCK_LIBRARY_DECKS, MOCK_STORE_DECKS } from './constants';
import { cloudService } from './services/cloudService';
import { t } from './services/i18n';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSection, setCurrentSection] = useState<AppSection>(AppSection.LIBRARY);
  const [libraryTab, setLibraryTab] = useState<'created' | 'subscribed'>('created');
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('cardecho_lang') as Language) || 'zh';
  });
  const [decks, setDecks] = useState<Deck[]>([]);
  const [storeDecks, setStoreDecks] = useState<Deck[]>([]);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [isPublishing, setIsPublishing] = useState<string | null>(null);
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);
  const [isDeletingDeck, setIsDeletingDeck] = useState(false);

  const loadStoreData = async () => {
    try {
      let cloudStoreDecks = await cloudService.fetchStoreDecks();
      if (cloudStoreDecks.length === 0) {
        await cloudService.seedStoreData(MOCK_STORE_DECKS);
        cloudStoreDecks = await cloudService.fetchStoreDecks();
      }
      setStoreDecks(cloudStoreDecks);
    } catch (err) {
      console.error("Failed to load store data:", err);
      setStoreDecks(MOCK_STORE_DECKS);
    }
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        await loadStoreData();
        const savedUserEmail = localStorage.getItem('cardecho_user_email');
        if (savedUserEmail) {
          const profile = await cloudService.getUserProfile(savedUserEmail);
          if (profile) {
            setCurrentUser(profile);
            const userDecks = await cloudService.fetchUserDecks(profile.id);
            setDecks(userDecks);
          }
        }
      } catch (error) {
        console.error("Cloud initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('cardecho_lang', newLang);
  };

  const handleLogout = () => {
    localStorage.removeItem('cardecho_user_email');
    setCurrentUser(null);
    setDecks([]);
    setActiveDeck(null);
    setCurrentSection(AppSection.LIBRARY);
  };

  const handleLoginSuccess = async (user: User) => {
    localStorage.setItem('cardecho_user_email', user.email);
    setCurrentUser(user);
    setIsLoading(true);
    try {
      const userDecks = await cloudService.fetchUserDecks(user.id);
      setDecks(userDecks);
    } catch (err) {
      console.error("Failed to fetch user decks", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDeck = async (deck: Deck) => {
    if (!currentUser) return;
    try {
      await cloudService.saveDeck(deck, currentUser.id);
      const userDecks = await cloudService.fetchUserDecks(currentUser.id);
      setDecks(userDecks);
      setCurrentSection(AppSection.LIBRARY);
    } catch (err) {
      alert("Failed to save deck to cloud.");
    }
  };

  const handleUpdateDeck = async (updatedDeck: Deck) => {
    if (!currentUser) return;
    try {
      await cloudService.saveDeck(updatedDeck, currentUser.id);
      const userDecks = await cloudService.fetchUserDecks(currentUser.id);
      setDecks(userDecks);
      setEditingDeck(updatedDeck);
      if (activeDeck?.id === updatedDeck.id) setActiveDeck(updatedDeck);
    } catch (err) {
      alert("Failed to sync with cloud.");
    }
  };

  const handleDeleteDeck = async () => {
    if (!deckToDelete) return;
    setIsDeletingDeck(true);
    try {
      await cloudService.deleteDeck(deckToDelete.id);
      if (currentUser) {
        const userDecks = await cloudService.fetchUserDecks(currentUser.id);
        setDecks(userDecks);
      }
      setDeckToDelete(null);
    } catch (err) {
      alert("Delete failed.");
    } finally {
      setIsDeletingDeck(false);
    }
  };

  const handleSubscribe = async (deck: Deck) => {
    if (!currentUser) {
      alert("Please login to subscribe.");
      return;
    }
    try {
      const subscribedDeck: Deck = {
        ...deck,
        id: crypto.randomUUID(),
        isSubscribed: true,
        createdAt: Date.now()
      };
      await cloudService.saveDeck(subscribedDeck, currentUser.id);
      
      // 更新本地状态
      const userDecks = await cloudService.fetchUserDecks(currentUser.id);
      setDecks(userDecks);
      
      // 优化：订阅后直接进入学习
      setActiveDeck(subscribedDeck);
      setCurrentSection(AppSection.LEARNING);
      
    } catch (err) {
      console.error("Subscription flow error:", err);
      alert("Subscription failed.");
    }
  };

  const handlePublishToStore = async (deck: Deck) => {
    if (!currentUser) return;
    setIsPublishing(deck.id);
    try {
      await cloudService.publishToStore(deck, currentUser.id, currentUser.name);
      await loadStoreData();
    } catch (err) {
      console.error("Publish failed", err);
      alert("Failed to publish deck.");
    } finally {
      setIsPublishing(null);
    }
  };

  const handleUpdateStoreMetadata = async (deckId: string, metadata: any) => {
    try {
      await cloudService.updateStoreDeckMetadata(deckId, metadata);
      await loadStoreData();
    } catch (err) {
      alert("Failed to update store information.");
    }
  };

  const handleDeleteStoreDeck = async (deckId: string) => {
    try {
      await cloudService.deleteStoreDeck(deckId);
      await loadStoreData();
    } catch (err) {
      alert("Failed to delete marketplace listing.");
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#f8f9fa] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-blue-600 animate-pulse uppercase tracking-widest">Initialising Echo Cloud...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth onLogin={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar 
        currentSection={currentSection} 
        onSectionChange={setCurrentSection} 
        user={currentUser} 
        onLogout={handleLogout}
        language={language}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {currentSection === AppSection.LIBRARY && (
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
                <button 
                  onClick={() => setCurrentSection(AppSection.CREATE)}
                  className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center gap-2"
                >
                  <span className="text-xl">✨</span> {t(language, 'sidebar.create')}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {decks.filter(d => libraryTab === 'created' ? !d.isSubscribed : d.isSubscribed).map((deck) => {
                  const isPublishedToStore = storeDecks.some(sd => sd.originDeckId === deck.id);

                  return (
                    <div key={deck.id} className="group bg-white border border-gray-100 rounded-[32px] p-8 hover:shadow-2xl hover:border-blue-200 transition-all flex flex-col relative overflow-hidden">
                      {/* Published to Store Indicator */}
                      {libraryTab === 'created' && isPublishedToStore && (
                        <div className="absolute top-6 right-6 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 border border-blue-100 shadow-sm z-10 animate-in fade-in zoom-in duration-500">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                          {language === 'zh' ? '已上架' : 'IN STORE'}
                        </div>
                      )}

                      <div className="text-5xl mb-6 group-hover:scale-110 transition-transform origin-left">{deck.icon}</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{deck.title}</h3>
                      <p className="text-gray-500 text-sm mb-8 flex-grow line-clamp-2">{deck.description}</p>
                      
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded">
                          {deck.cards.length} {t(language, 'sidebar.cards')}
                        </span>
                        <div className="flex gap-2">
                            <button 
                              onClick={() => setDeckToDelete(deck)}
                              className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                            <button 
                              onClick={() => { setEditingDeck(deck); setCurrentSection(AppSection.EDIT); }}
                              className="p-3 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button 
                              onClick={() => { setActiveDeck(deck); setCurrentSection(AppSection.LEARNING); }}
                              className="px-6 py-3 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg"
                            >
                              {t(language, 'library.study')}
                            </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {decks.filter(d => libraryTab === 'created' ? !d.isSubscribed : d.isSubscribed).length === 0 && (
                  <div className="col-span-full py-20 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-3xl mb-4">📭</div>
                    <p className="text-gray-400 font-medium mb-6">{t(language, 'library.empty')}</p>
                    <button 
                      onClick={() => setCurrentSection(AppSection.STORE)}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      {t(language, 'library.explore')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deckToDelete && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
                <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => setDeckToDelete(null)}></div>
                <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl relative z-10 p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                     <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{t(language, 'library.deleteConfirmTitle')}</h2>
                  <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                    {t(language, 'library.deleteConfirmMsg')}
                    <br/><br/>
                    <span className="font-bold text-gray-800">"{deckToDelete.title}"</span>
                  </p>
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => setDeckToDelete(null)}
                      className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors"
                    >
                      {t(language, 'library.deleteCancel')}
                    </button>
                    <button 
                      onClick={handleDeleteDeck}
                      disabled={isDeletingDeck}
                      className="flex-1 py-3 bg-red-600 text-white text-sm font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isDeletingDeck && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                      {isDeletingDeck ? t(language, 'settings.syncing') : t(language, 'library.deleteAction')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentSection === AppSection.LEARNING && activeDeck && (
          <div className="flex-1 flex overflow-hidden">
            <CardPlayer 
              cards={activeDeck.cards} 
              onActiveCardChange={setActiveCard} 
              language={language}
            />
            <AnalysisPanel card={activeCard} language={language} />
          </div>
        )}

        {currentSection === AppSection.CREATE && (
          <ContentCreator 
            onSave={handleSaveDeck} 
            onCancel={() => setCurrentSection(AppSection.LIBRARY)} 
            language={language}
          />
        )}

        {currentSection === AppSection.STORE && (
          <Store 
            featuredDecks={storeDecks} 
            onSubscribe={handleSubscribe}
            subscribedTitles={decks.map(d => d.title)}
            language={language}
            userId={currentUser.id}
            userRole={currentUser.role}
            onUpdateStoreMetadata={handleUpdateStoreMetadata}
            onDeleteStoreDeck={handleDeleteStoreDeck}
          />
        )}

        {currentSection === AppSection.EDIT && editingDeck && (
          <DeckEditor 
            deck={editingDeck} 
            onSave={handleUpdateDeck} 
            onCancel={() => setCurrentSection(AppSection.LIBRARY)}
            onStartLearning={(d) => { setActiveDeck(d); setCurrentSection(AppSection.LEARNING); }}
            onPublish={handlePublishToStore}
            isPublished={storeDecks.some(sd => sd.originDeckId === editingDeck.id)}
            isPublishing={isPublishing === editingDeck.id}
            language={language}
          />
        )}

        {currentSection === AppSection.SETTINGS && (
          <Settings language={language} onLanguageChange={handleLanguageChange} />
        )}

        {currentSection === AppSection.PROFILE && (
          <Profile user={currentUser} onUpdateUser={setCurrentUser} language={language} />
        )}
      </main>
    </div>
  );
};

export default App;
