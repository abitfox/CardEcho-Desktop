
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
import TrainingMode from './components/TrainingMode';
import { Statistics } from './components/Statistics';
import { StudyProgressModal } from './components/StudyProgressModal'; 
import { DebugWindow } from './components/DebugWindow';
import { AppSection, Card, Deck, User, Language, AIModel, AIProvider, VoiceProvider } from './types';
import { MOCK_STORE_DECKS } from './constants';
import { cloudService } from './services/cloudService';
import { debugService } from './services/debugService';
import { t } from './services/i18n';

const LAST_DECK_KEY = 'cardecho_last_deck_id';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSection, setCurrentSection] = useState<AppSection>(AppSection.LIBRARY);
  const [libraryTab, setLibraryTab] = useState<'created' | 'subscribed'>('created');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('cardecho_lang') as Language) || 'zh');
  
  const [aiProvider, setAiProvider] = useState<AIProvider>(() => (localStorage.getItem('cardecho_provider') as AIProvider) || 'google');
  // 修改此处：默认语音提供商改为 'doubao'
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>(() => (localStorage.getItem('cardecho_voice_provider') as VoiceProvider) || 'doubao');
  
  const [selectedModel, setSelectedModel] = useState<AIModel>(() => {
    const saved = localStorage.getItem('cardecho_model');
    if (saved) return saved as AIModel;
    return (localStorage.getItem('cardecho_provider') === 'deepseek' ? 'deepseek-chat' : 'gemini-3-flash-preview') as AIModel;
  });

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => Number(localStorage.getItem('cardecho_speed')) || 1.0);
  const [showDebug, setShowDebug] = useState<boolean>(() => localStorage.getItem('cardecho_debug') === 'true');

  const [decks, setDecks] = useState<Deck[]>([]);
  const [storeDecks, setStoreDecks] = useState<Deck[]>([]);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [isPublishing, setIsPublishing] = useState<string | null>(null);
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);
  
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  const [studiedCardIds, setStudiedCardIds] = useState<Set<string>>(new Set());
  const [allTimeCount, setAllTimeCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const dailyGoal = currentUser?.dailyGoal || 20;

  useEffect(() => {
    const handleStartTraining = (e: any) => {
      if (e.detail?.card) {
        setActiveCard(e.detail.card);
        setCurrentSection(AppSection.TRAINING);
      }
    };
    window.addEventListener('start-training', handleStartTraining);
    return () => window.removeEventListener('start-training', handleStartTraining);
  }, []);

  const loadUserData = async (user: User) => {
    try {
      debugService.log(`Loading cloud data for user: ${user.email}`, 'info');
      const [userDecks, stats] = await Promise.all([
        cloudService.fetchUserDecks(user.id),
        cloudService.getStudyStats(user.id)
      ]);
      setDecks(userDecks);
      setStudiedCardIds(new Set(stats.todayCardIds));
      setAllTimeCount(stats.allTimeCount);
      setStreak(stats.streak);
      
      const lastDeckId = localStorage.getItem(LAST_DECK_KEY);
      const selected = (lastDeckId && userDecks.find(d => d.id === lastDeckId)) || userDecks[0];
      if (selected) setActiveDeck(selected);
      debugService.log(`Loaded ${userDecks.length} decks from cloud`, 'info');
    } catch (err) {
      debugService.log(`Failed to sync cloud data: ${err}`, 'error');
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadUserData(currentUser);
    }
  }, [currentUser]);

  const handleCardComplete = async (cardId: string) => {
    if (!currentUser || !activeDeck) return;
    
    try {
      const result = await cloudService.logCardCompletion(currentUser.id, cardId, activeDeck.id);
      setStudiedCardIds(prev => {
        const next = new Set(prev);
        next.add(cardId);
        return next;
      });
      setStreak(result.currentStreak);
      if (!studiedCardIds.has(cardId)) {
        setAllTimeCount(prev => prev + 1);
      }
      debugService.log(`Card completed: ${cardId}`, 'info');
    } catch (err) {
      debugService.log(`Failed to log card completion: ${err}`, 'error');
    }
  };

  const loadStoreData = async () => {
    try {
      let cloudStoreDecks = await cloudService.fetchStoreDecks();
      if (cloudStoreDecks.length === 0) {
        debugService.log("Store empty, seeding mock data...", 'warn');
        await cloudService.seedStoreData(MOCK_STORE_DECKS);
        cloudStoreDecks = await cloudService.fetchStoreDecks();
      }
      setStoreDecks(cloudStoreDecks);
      debugService.log(`Store sync complete: ${cloudStoreDecks.length} items available`, 'info');
    } catch (err) {
      setStoreDecks(MOCK_STORE_DECKS);
      debugService.log(`Store sync failed, falling back to local mocks: ${err}`, 'error');
    }
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        debugService.log("Initializing CardEcho Desktop Application...", 'info');
        await loadStoreData();
        const savedUserEmail = localStorage.getItem('cardecho_user_email');
        if (savedUserEmail) {
          const profile = await cloudService.getUserProfile(savedUserEmail);
          if (profile) setCurrentUser(profile);
        }
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  const handleSetActiveDeck = (deck: Deck) => {
    setActiveDeck(deck);
    localStorage.setItem(LAST_DECK_KEY, deck.id);
    debugService.log(`Switched to deck: ${deck.title}`, 'info');
  };

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('cardecho_lang', newLang);
  };

  const handleProviderChange = (provider: AIProvider) => {
    setAiProvider(provider);
    localStorage.setItem('cardecho_provider', provider);
    const defaultModel = provider === 'google' ? 'gemini-3-flash-preview' : 'deepseek-chat';
    handleModelChange(defaultModel as AIModel);
    debugService.log(`Switched AI provider to: ${provider}`, 'warn');
  };

  const handleVoiceProviderChange = (provider: VoiceProvider) => {
    setVoiceProvider(provider);
    localStorage.setItem('cardecho_voice_provider', provider);
    debugService.log(`Switched Voice provider to: ${provider}`, 'warn');
  };

  const handleModelChange = (model: AIModel) => {
    setSelectedModel(model);
    localStorage.setItem('cardecho_model', model);
    debugService.log(`Switched AI brain to: ${model}`, 'info');
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    localStorage.setItem('cardecho_speed', String(speed));
  };

  const handleToggleDebug = (show: boolean) => {
    setShowDebug(show);
    localStorage.setItem('cardecho_debug', String(show));
    debugService.log(`Debug window visibility toggled: ${show}`, 'info');
  };

  const handleToggleReview = async (cardId: string, isForReview: boolean) => {
    if (!currentUser) return;
    try {
      await cloudService.toggleReviewCard(cardId, isForReview);
      setDecks(prev => prev.map(deck => ({
        ...deck,
        cards: deck.cards.map(card => card.id === cardId ? { ...card, isForReview } : card)
      })));
      if (activeCard && activeCard.id === cardId) {
        setActiveCard(prev => prev ? { ...prev, isForReview } : null);
      }
      if (activeDeck?.id === 'virtual-review-deck') {
        setActiveDeck(prev => prev ? {
          ...prev,
          cards: prev.cards.map(card => card.id === cardId ? { ...card, isForReview } : card)
        } : null);
      }
      debugService.log(`Card review status updated: ${cardId} -> ${isForReview}`, 'info');
    } catch (err) {
      debugService.log(`Toggle review state failed: ${err}`, 'error');
    }
  };

  const getReviewCards = () => decks.flatMap(d => d.cards).filter(c => c.isForReview);

  const startReviewSession = () => {
    const reviewCards = getReviewCards();
    if (reviewCards.length === 0) return;
    const virtualReviewDeck: Deck = {
      id: 'virtual-review-deck',
      title: language === 'zh' ? '我的复习清单' : 'My Review List',
      description: language === 'zh' ? '针对所有标记为 ❤️ 的卡片进行强化复习' : 'Intensive review for all cards marked with ❤️',
      icon: '❤️',
      cards: reviewCards,
      createdAt: Date.now()
    };
    setActiveDeck(virtualReviewDeck);
    handleSectionChange(AppSection.LEARNING);
    debugService.log("Starting intensive review session with marked cards", 'ai');
  };

  const handleLogout = () => {
    localStorage.removeItem('cardecho_user_email');
    localStorage.removeItem(LAST_DECK_KEY);
    setCurrentUser(null);
    setDecks([]);
    setActiveDeck(null);
    setStudiedCardIds(new Set());
    setStreak(0);
    setAllTimeCount(0);
    handleSectionChange(AppSection.LIBRARY);
    debugService.log("User logged out, local cache cleared", 'warn');
  };

  const handleLoginSuccess = async (user: User) => {
    localStorage.setItem('cardecho_user_email', user.email);
    setCurrentUser(user);
    debugService.log(`Authentication successful: ${user.name}`, 'info');
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-12 transition-all duration-1000">
        <div className="relative mb-12 animate-in fade-in zoom-in-95 duration-1000">
          <div className="absolute inset-0 bg-blue-600/20 blur-[100px] rounded-full scale-150 animate-pulse"></div>
          <div className="relative w-28 h-28 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[32px] shadow-[0_24px_48px_rgba(37,99,235,0.3)] flex items-end justify-center gap-[6px] p-7 overflow-hidden active:scale-95 transition-transform">
            <div className="w-3.5 h-1/3 bg-white/40 rounded-full animate-bounce [animation-duration:1.2s] [animation-delay:-0.4s]"></div>
            <div className="w-3.5 h-full bg-white rounded-full animate-bounce [animation-duration:1.2s] [animation-delay:-0.2s]"></div>
            <div className="w-3.5 h-1/2 bg-white/70 rounded-full animate-bounce [animation-duration:1.2s]"></div>
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/20 to-transparent pointer-events-none"></div>
          </div>
        </div>
        <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none">CardEcho</h1>
          <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-[0.4em] mt-3 mb-10">Linguistics AI</p>
          <div className="flex flex-col items-center gap-2">
            <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 w-1/3 rounded-full animate-[loading_2s_infinite_ease-in-out]"></div>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 animate-pulse">Initialising Echo Cloud...</p>
          </div>
        </div>
        <style>{`@keyframes loading {0% { transform: translateX(-100%); width: 30%; }50% { transform: translateX(100%); width: 60%; }100% { transform: translateX(300%); width: 30%; }}`}</style>
      </div>
    );
  }

  if (!currentUser) return <Auth onLogin={handleLoginSuccess} />;

  const hasReviewCards = getReviewCards().length > 0;

  const handleSectionChange = (section: AppSection) => {
    if (section === AppSection.TRAINING) {
      if (!activeCard && activeDeck && activeDeck.cards.length > 0) {
        setActiveCard(activeDeck.cards[0]);
      } else if (!activeCard && !activeDeck) {
        // If no deck, maybe go to library instead
        setCurrentSection(AppSection.LIBRARY);
        return;
      }
    }
    setCurrentSection(section);
  };

  return (
    <div className="flex h-screen bg-white">
      {showDebug && <DebugWindow />}
      
      <Sidebar 
        currentSection={currentSection} onSectionChange={handleSectionChange} 
        user={currentUser} onLogout={handleLogout} 
        language={language} hasDecks={decks.length > 0} 
        studiedCount={studiedCardIds.size} dailyGoal={dailyGoal}
        onProgressClick={() => setIsProgressModalOpen(true)}
      />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {currentSection === AppSection.LIBRARY && (
          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-end mb-12">
                <div>
                  <h1 className="text-4xl font-black text-gray-900 mb-2">{t(language, 'library.title')}</h1>
                  <div className="flex gap-6 mt-6">
                    <button onClick={() => setLibraryTab('created')} className={`text-sm font-bold pb-2 border-b-2 transition-all ${libraryTab === 'created' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>{t(language, 'library.tabCreated')}</button>
                    <button onClick={() => setLibraryTab('subscribed')} className={`text-sm font-bold pb-2 border-b-2 transition-all ${libraryTab === 'subscribed' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>{t(language, 'library.tabSubscribed')}</button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {hasReviewCards && (
                    <button onClick={startReviewSession} className="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-bold hover:shadow-xl hover:scale-105 transition-all shadow-lg active:scale-95 animate-in fade-in slide-in-from-right-2 duration-300">
                      <span>❤️</span>{language === 'zh' ? '开始复习' : 'REVIEW'}
                    </button>
                  )}
                  <button onClick={() => handleSectionChange(AppSection.CREATE)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center gap-2"><span className="text-xl">✨</span> {t(language, 'sidebar.create')}</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {decks.filter(d => libraryTab === 'created' ? !d.isSubscribed : d.isSubscribed).map((deck) => {
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
                      <p className="text-gray-500 text-sm mb-8 flex-grow line-clamp-2">{deck.description}</p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded">{deck.cards.length} {t(language, 'sidebar.cards')}</span>
                        <div className="flex gap-2">
                          <button onClick={() => setDeckToDelete(deck)} className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                          <button onClick={() => { setEditingDeck(deck); handleSectionChange(AppSection.EDIT); }} className="p-3 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                          <button onClick={() => { handleSetActiveDeck(deck); handleSectionChange(AppSection.LEARNING); }} className="px-6 py-3 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg">{t(language, 'library.study')}</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {currentSection === AppSection.LEARNING && activeDeck && (
          <div className="flex-1 flex overflow-hidden">
            <CardPlayer cards={activeDeck.cards} deckTitle={activeDeck.title} onActiveCardChange={setActiveCard} onCardComplete={handleCardComplete} language={language} globalSpeed={playbackSpeed} onSpeedChange={handleSpeedChange} />
            <AnalysisPanel card={activeCard} language={language} onToggleReview={handleToggleReview} />
          </div>
        )}
        {currentSection === AppSection.CREATE && <ContentCreator onSave={(d) => cloudService.saveDeck(d, currentUser.id).then(() => cloudService.fetchUserDecks(currentUser.id).then(setDecks)).then(() => handleSectionChange(AppSection.LIBRARY))} onCancel={() => handleSectionChange(AppSection.LIBRARY)} language={language} provider={aiProvider} selectedModel={selectedModel} />}
        {currentSection === AppSection.STORE && (
          <Store 
            featuredDecks={storeDecks} 
            onSubscribe={(d) => cloudService.saveDeck({ ...d, id: crypto.randomUUID(), isSubscribed: true, createdAt: Date.now() }, currentUser.id).then(() => cloudService.fetchUserDecks(currentUser.id).then(setDecks)).then(() => handleSectionChange(AppSection.LEARNING))} 
            subscribedTitles={decks.map(d => d.title)} 
            language={language} userId={currentUser.id} userRole={currentUser.role} 
            onUpdateStoreMetadata={cloudService.updateStoreDeckMetadata} onDeleteStoreDeck={cloudService.deleteStoreDeck} onRefresh={loadStoreData}
          />
        )}
        {currentSection === AppSection.STATISTICS && <Statistics studiedCardIds={studiedCardIds} allTimeCount={allTimeCount} dailyGoal={dailyGoal} streak={streak} language={language} />}
        {currentSection === AppSection.SETTINGS && (
          <Settings 
            language={language} onLanguageChange={handleLanguageChange} 
            provider={aiProvider} onProviderChange={handleProviderChange} 
            voiceProvider={voiceProvider} onVoiceProviderChange={handleVoiceProviderChange}
            model={selectedModel} onModelChange={handleModelChange} 
            speed={playbackSpeed} onSpeedChange={handleSpeedChange} 
            showDebug={showDebug} onToggleDebug={handleToggleDebug}
          />
        )}
        {currentSection === AppSection.PROFILE && <Profile user={currentUser} onUpdateUser={setCurrentUser} language={language} />}
        {currentSection === AppSection.TRAINING && activeCard && (
          <TrainingMode 
            card={activeCard} 
            language={language} 
            voiceProvider={voiceProvider} 
            onExit={() => handleSectionChange(AppSection.LEARNING)} 
          />
        )}
        {currentSection === AppSection.EDIT && editingDeck && (
          <DeckEditor 
            deck={editingDeck} language={language} provider={aiProvider} model={selectedModel}
            voiceProvider={voiceProvider}
            onCancel={() => {setEditingDeck(null); handleSectionChange(AppSection.LIBRARY);}} 
            onSave={async (d) => { await cloudService.saveDeck(d, currentUser.id); const updated = await cloudService.fetchUserDecks(currentUser.id); setDecks(updated); const freshDeck = updated.find(item => item.id === d.id); if (freshDeck) setEditingDeck(freshDeck); }}
            onStartLearning={(d) => { handleSetActiveDeck(d); handleSectionChange(AppSection.LEARNING); }}
            onPublish={async (d) => { setIsPublishing(d.id); try { await cloudService.publishToStore(d, currentUser.id, currentUser.name); await loadStoreData(); } finally { setIsPublishing(null); } }}
            isPublished={storeDecks.some(sd => sd.originDeckId === editingDeck.id)} isPublishing={isPublishing === editingDeck.id}
          />
        )}
      </main>
      {isProgressModalOpen && <StudyProgressModal user={currentUser} onClose={() => setIsProgressModalOpen(false)} language={language} studiedCount={studiedCardIds.size} dailyGoal={dailyGoal} streak={streak} />}
    </div>
  );
};

export default App;
