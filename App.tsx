
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CardPlayer from './components/CardPlayer';
import AnalysisPanel from './components/AnalysisPanel';
import Auth from './components/Auth';
import ContentCreator from './components/ContentCreator';
import Store from './components/Store';
import Library from './components/Library';
import DeckEditor from './components/DeckEditor';
import Settings from './components/Settings';
import Profile from './components/Profile';
import ChallengeMode from './components/ChallengeMode';
import { Statistics } from './components/Statistics';
import { StudyProgressModal } from './components/StudyProgressModal'; 
import { DebugWindow } from './components/DebugWindow';
import UserManagement from './components/UserManagement';
import { AppSection, Card, Deck, User, Language, AIModel, AIProvider, VoiceProvider, ADMIN_USERS } from './types';
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
  
  const [aiProvider, setAiProvider] = useState<AIProvider>(() => {
    const saved = localStorage.getItem('cardecho_provider');
    // 只允许 deepseek，忽略其他 provider
    if (saved === 'deepseek') return 'deepseek';
    localStorage.setItem('cardecho_provider', 'deepseek');
    return 'deepseek';
  });
  
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>(() => 'doubao');
  
  const [selectedModel, setSelectedModel] = useState<AIModel>(() => {
    const saved = localStorage.getItem('cardecho_model');
    // 只允许 deepseek-chat
    if (saved === 'deepseek-chat' || saved === 'deepseek-reasoner') return saved as AIModel;
    // 强制使用 deepseek-chat
    localStorage.setItem('cardecho_model', 'deepseek-chat');
    return 'deepseek-chat';
  });

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => Number(localStorage.getItem('cardecho_speed')) || 1.0);
  const [showDebug, setShowDebug] = useState<boolean>(() => localStorage.getItem('cardecho_debug') === 'true');

  // 判断是否为管理员
  const isAdmin = currentUser ? ADMIN_USERS.includes(currentUser.name?.toLowerCase() || '') : false;

  const [decks, setDecks] = useState<Deck[]>([]);
  const [storeDecks, setStoreDecks] = useState<Deck[]>([]);
  const [subscribedStoreDeckIds, setSubscribedStoreDeckIds] = useState<string[]>([]);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [isPublishing, setIsPublishing] = useState<string | null>(null);
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  const [studiedCardIds, setStudiedCardIds] = useState<Set<string>>(new Set());
  const [allTimeCount, setAllTimeCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const dailyGoal = currentUser?.dailyGoal || 20;

  // 卡组最近学习/编辑时间
  const [deckTimestamps, setDeckTimestamps] = useState<Record<string, { lastStudied: number; lastEdited: number }>>({});

  // 加载卡组时间戳
  useEffect(() => {
    if (currentUser) {
      const saved = localStorage.getItem(`cardecho_deck_timestamps_${currentUser.id}`);
      if (saved) {
        setDeckTimestamps(JSON.parse(saved));
      }
    }
  }, [currentUser]);

  // 保存卡组时间戳
  const updateDeckTimestamp = (deckId: string, type: 'lastStudied' | 'lastEdited') => {
    const key = `cardecho_deck_timestamps_${currentUser?.id}`;
    const timestamps = { ...deckTimestamps };
    if (!timestamps[deckId]) {
      timestamps[deckId] = { lastStudied: 0, lastEdited: 0 };
    }
    timestamps[deckId][type] = Date.now();
    setDeckTimestamps(timestamps);
    localStorage.setItem(key, JSON.stringify(timestamps));
  };

  useEffect(() => {
    const handleStartChallenge = (e: any) => {
      if (e.detail?.card) {
        setActiveCard(e.detail.card);
        setCurrentSection(AppSection.TRAINING);
      }
    };
    window.addEventListener('start-challenge', handleStartChallenge);
    return () => window.removeEventListener('start-challenge', handleStartChallenge);
  }, [activeDeck]);

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
      
      // 获取用户订阅列表
      if (currentUser?.id) {
        const subscriptions = await cloudService.getUserSubscriptions(currentUser.id);
        setSubscribedStoreDeckIds(subscriptions);
      }
      
      debugService.log(`Store sync complete: ${cloudStoreDecks.length} items available`, 'info');
    } catch (err) {
      setStoreDecks(MOCK_STORE_DECKS);
      debugService.log(`Store sync failed, falling back to local mocks: ${err}`, 'error');
    }
  };

  useEffect(() => {
    // 清理旧的 localStorage 配置，强制使用 deepseek
    const cleanupOldConfig = () => {
      const savedProvider = localStorage.getItem('cardecho_provider');
      if (savedProvider && savedProvider !== 'deepseek') {
        localStorage.setItem('cardecho_provider', 'deepseek');
      }
      const savedModel = localStorage.getItem('cardecho_model');
      if (savedModel && !savedModel.startsWith('deepseek')) {
        localStorage.setItem('cardecho_model', 'deepseek-chat');
      }
    };
    cleanupOldConfig();

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
    updateDeckTimestamp(deck.id, 'lastStudied');
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
          <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-[0.4em] mt-3 mb-10">AI卡片复读机</p>
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

  // 处理删除卡组
  const handleDeleteDeck = async () => {
    if (!deckToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await cloudService.deleteDeck(deckToDelete.id, currentUser.id);
      setDecks(prev => prev.filter(d => d.id !== deckToDelete.id));
      if (activeDeck?.id === deckToDelete.id) {
        setActiveDeck(null);
      }
      setDeckToDelete(null);
      // 显示成功提示
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 3000);
    } catch (err) {
      console.error('Delete deck failed:', err);
      alert(language === 'zh' ? '删除失败，请重试' : 'Delete failed, please try again');
    } finally {
      setIsDeleting(false);
    }
  };

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

  const isTrainingFullScreen = currentSection === AppSection.LEARNING;

  return (
    <div className="flex h-screen bg-white">
      {isAdmin && showDebug && <DebugWindow />}
      
      {!isTrainingFullScreen && (
        <Sidebar 
          currentSection={currentSection} onSectionChange={handleSectionChange} 
          user={currentUser} onLogout={handleLogout} 
          language={language} hasDecks={decks.length > 0}
          studiedCount={studiedCardIds.size} dailyGoal={dailyGoal}
          onProgressClick={() => setIsProgressModalOpen(true)}
          isAdmin={isAdmin}
        />
      )}
      <main className={`flex-1 flex flex-col overflow-hidden relative ${isTrainingFullScreen ? 'm-0 p-0' : ''}`}>
        {currentSection === AppSection.LIBRARY && (
          <Library 
            decks={decks}
            storeDecks={storeDecks}
            libraryTab={libraryTab}
            setLibraryTab={setLibraryTab}
            language={language}
            hasReviewCards={hasReviewCards}
            onSectionChange={handleSectionChange}
            onSetActiveDeck={handleSetActiveDeck}
            onSetEditingDeck={setEditingDeck}
            onSetDeckToDelete={setDeckToDelete}
            onStartReviewSession={startReviewSession}
            deckTimestamps={deckTimestamps}
          />
        )}
        {currentSection === AppSection.LEARNING && activeDeck && (
          <div className="fixed inset-0 z-[200] bg-white flex">
            <CardPlayer 
              cards={activeDeck.cards} 
              deckTitle={activeDeck.title} 
              onActiveCardChange={setActiveCard} 
              onCardComplete={handleCardComplete} 
              language={language} 
              globalSpeed={playbackSpeed} 
              onSpeedChange={handleSpeedChange}
              onExit={() => handleSectionChange(AppSection.LIBRARY)} 
            />
            <AnalysisPanel card={activeCard} language={language} onToggleReview={handleToggleReview} />
          </div>
        )}
        {currentSection === AppSection.CREATE && <ContentCreator onSave={(d) => cloudService.saveDeck(d, currentUser.id).then(() => cloudService.fetchUserDecks(currentUser.id).then(setDecks)).then(() => handleSectionChange(AppSection.LIBRARY))} onCancel={() => handleSectionChange(AppSection.LIBRARY)} language={language} provider={aiProvider} selectedModel={selectedModel} />}
        {currentSection === AppSection.STORE && (
          <Store 
            featuredDecks={storeDecks} 
            onSubscribe={async (d) => {
              try {
                // 1. 创建订阅关系（触发 subscriber_count +1）
                await cloudService.subscribeToStoreDeck(d.id, currentUser.id);
                // 2. 复制卡组到用户账户
                const newDeckId = crypto.randomUUID();
                await cloudService.saveDeck({ ...d, id: newDeckId, isSubscribed: true, createdAt: Date.now() }, currentUser.id);
                // 3. 刷新用户数据并获取最新卡组
                const updatedDecks = await cloudService.fetchUserDecks(currentUser.id);
                setDecks(updatedDecks);
                // 4. 找到新订阅的卡组并设置为当前学习卡组
                const newDeck = updatedDecks.find(deck => deck.id === newDeckId);
                if (newDeck) {
                  setActiveDeck(newDeck);
                }
                // 5. 刷新商城数据
                await loadStoreData();
                handleSectionChange(AppSection.LEARNING);
              } catch (err) {
                console.error('订阅失败:', err);
              }
            }}
            subscribedTitles={decks.map(d => d.title)}
            subscribedStoreDeckIds={subscribedStoreDeckIds}
            language={language} userId={currentUser.id} userRole={currentUser.role} userName={currentUser.name}
            onUpdateStoreMetadata={cloudService.updateStoreDeckMetadata} onDeleteStoreDeck={cloudService.deleteStoreDeck} onRefresh={loadStoreData}
          />
        )}
        {currentSection === AppSection.STATISTICS && <Statistics studiedCardIds={studiedCardIds} allTimeCount={allTimeCount} dailyGoal={dailyGoal} streak={streak} language={language} userId={currentUser.id} onStoreNavigate={() => handleSectionChange(AppSection.STORE)} />}
        {currentSection === AppSection.SETTINGS && (
          <Settings 
            language={language} onLanguageChange={handleLanguageChange} 
            provider={aiProvider} onProviderChange={handleProviderChange} 
            voiceProvider={voiceProvider} onVoiceProviderChange={handleVoiceProviderChange}
            model={selectedModel} onModelChange={handleModelChange} 
            speed={playbackSpeed} onSpeedChange={handleSpeedChange} 
            showDebug={showDebug} onToggleDebug={handleToggleDebug}
            isAdmin={isAdmin}
            userId={currentUser.id}
          />
        )}
        {currentSection === AppSection.PROFILE && <Profile user={currentUser} onUpdateUser={setCurrentUser} language={language} />}
        {currentSection === AppSection.USER_MANAGEMENT && isAdmin && <UserManagement language={language} onRefreshUsers={async () => {}} />}
        {currentSection === AppSection.TRAINING && activeCard && activeDeck && (
          <ChallengeMode 
            card={activeCard} 
            deck={activeDeck}
            language={language} 
            voiceProvider={voiceProvider} 
            userId={currentUser.id}
            onExit={() => handleSectionChange(AppSection.LEARNING)} 
          />
        )}
        {currentSection === AppSection.EDIT && editingDeck && (
          <DeckEditor 
            deck={editingDeck} language={language} provider={aiProvider} model={selectedModel}
            voiceProvider={voiceProvider}
            onCancel={() => {setEditingDeck(null); handleSectionChange(AppSection.LIBRARY);}} 
            onSave={async (d) => { await cloudService.saveDeck(d, currentUser.id); updateDeckTimestamp(d.id, 'lastEdited'); const updated = await cloudService.fetchUserDecks(currentUser.id); setDecks(updated); const freshDeck = updated.find(item => item.id === d.id); if (freshDeck) setEditingDeck(freshDeck); }}
            onStartLearning={(d) => { handleSetActiveDeck(d); handleSectionChange(AppSection.LEARNING); }}
            onPublish={async (d) => { setIsPublishing(d.id); try { await cloudService.publishToStore(d, currentUser.id, currentUser.name); await loadStoreData(); } finally { setIsPublishing(null); } }}
            isPublished={storeDecks.some(sd => sd.originDeckId === editingDeck.id)} isPublishing={isPublishing === editingDeck.id}
          />
        )}
      </main>
      {isProgressModalOpen && <StudyProgressModal user={currentUser} onClose={() => setIsProgressModalOpen(false)} language={language} studiedCount={studiedCardIds.size} dailyGoal={dailyGoal} streak={streak} />}
      
      {/* 删除确认模态框 */}
      {deckToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => !isDeleting && setDeckToDelete(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {isDeleting ? (
                  <div className="w-8 h-8 border-4 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {isDeleting 
                  ? (language === 'zh' ? '正在删除...' : 'Deleting...') 
                  : (language === 'zh' ? '确认删除' : 'Confirm Delete')
                }
              </h3>
              <p className="text-gray-500 mb-6">
                {language === 'zh' 
                  ? `确定要删除卡组 "${deckToDelete.title}" 吗？此操作不可恢复。`
                  : `Are you sure you want to delete "${deckToDelete.title}"? This action cannot be undone.`
                }
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeckToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {language === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button 
                  onClick={handleDeleteDeck}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:bg-red-400 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {language === 'zh' ? '删除中' : 'Deleting'}
                    </>
                  ) : (
                    language === 'zh' ? '删除' : 'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除成功提示 - 顶部往下弹出 */}
      {deleteSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span className="font-bold">
              {language === 'zh' ? '删除成功' : 'Deleted successfully'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
