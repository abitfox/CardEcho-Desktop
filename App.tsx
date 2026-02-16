
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
import { Statistics } from './components/Statistics';
import { StudyProgressModal } from './components/StudyProgressModal'; 
import { AppSection, Card, Deck, User, Language } from './types';
import { MOCK_STORE_DECKS } from './constants';
import { cloudService } from './services/cloudService';
import { t } from './services/i18n';

const LAST_DECK_KEY = 'cardecho_last_deck_id';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSection, setCurrentSection] = useState<AppSection>(AppSection.LIBRARY);
  const [libraryTab, setLibraryTab] = useState<'created' | 'subscribed'>('created');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('cardecho_lang') as Language) || 'zh');
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

  const loadUserData = async (user: User) => {
    try {
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
    } catch (err) {
      console.error("Failed to sync cloud user data:", err);
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
    } catch (err) {
      console.error("Failed to log card completion:", err);
    }
  };

  const loadStoreData = async () => {
    try {
      let cloudStoreDecks = await cloudService.fetchStoreDecks();
      if (cloudStoreDecks.length === 0) {
        await cloudService.seedStoreData(MOCK_STORE_DECKS);
        cloudStoreDecks = await cloudService.fetchStoreDecks();
      }
      setStoreDecks(cloudStoreDecks);
    } catch (err) {
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
  };

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('cardecho_lang', newLang);
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
    setCurrentSection(AppSection.LIBRARY);
  };

  const handleLoginSuccess = async (user: User) => {
    localStorage.setItem('cardecho_user_email', user.email);
    setCurrentUser(user);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-12 transition-all duration-1000">
        {/* ENHANCED LOGO LOADING SCREEN */}
        <div className="relative mb-12 animate-in fade-in zoom-in-95 duration-1000">
          {/* Background Ambient Glow */}
          <div className="absolute inset-0 bg-blue-600/20 blur-[100px] rounded-full scale-150 animate-pulse"></div>
          
          {/* Animated Logo Icon */}
          <div className="relative w-28 h-28 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[32px] shadow-[0_24px_48px_rgba(37,99,235,0.3)] flex items-end justify-center gap-[6px] p-7 overflow-hidden active:scale-95 transition-transform">
            <div className="w-3.5 h-1/3 bg-white/40 rounded-full animate-bounce [animation-duration:1.2s] [animation-delay:-0.4s]"></div>
            <div className="w-3.5 h-full bg-white rounded-full animate-bounce [animation-duration:1.2s] [animation-delay:-0.2s]"></div>
            <div className="w-3.5 h-1/2 bg-white/70 rounded-full animate-bounce [animation-duration:1.2s]"></div>
            
            {/* Gloss Effect */}
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/20 to-transparent pointer-events-none"></div>
          </div>
        </div>

        {/* Branding & Status */}
        <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none">CardEcho</h1>
          <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-[0.4em] mt-3 mb-10">Linguistics AI</p>
          
          <div className="flex flex-col items-center gap-2">
            <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 w-1/3 rounded-full animate-[loading_2s_infinite_ease-in-out]"></div>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 animate-pulse">
              Initialising Echo Cloud...
            </p>
          </div>
        </div>

        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); width: 30%; }
            50% { transform: translateX(100%); width: 60%; }
            100% { transform: translateX(300%); width: 30%; }
          }
        `}</style>
      </div>
    );
  }

  if (!currentUser) return <Auth onLogin={handleLoginSuccess} />;

  return (
    <div className="flex h-screen bg-white">
      <Sidebar 
        currentSection={currentSection} 
        onSectionChange={setCurrentSection} 
        user={currentUser} 
        onLogout={handleLogout} 
        language={language} 
        hasDecks={decks.length > 0} 
        studiedCount={studiedCardIds.size} 
        dailyGoal={dailyGoal}
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
                <button onClick={() => setCurrentSection(AppSection.CREATE)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center gap-2"><span className="text-xl">✨</span> {t(language, 'sidebar.create')}</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {decks.filter(d => libraryTab === 'created' ? !d.isSubscribed : d.isSubscribed).map((deck) => (
                  <div key={deck.id} className="group bg-white border border-gray-100 rounded-[32px] p-8 hover:shadow-2xl hover:border-blue-200 transition-all flex flex-col relative overflow-hidden">
                    <div className="text-5xl mb-6 group-hover:scale-110 transition-transform origin-left">{deck.icon}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{deck.title}</h3>
                    <p className="text-gray-500 text-sm mb-8 flex-grow line-clamp-2">{deck.description}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded">{deck.cards.length} {t(language, 'sidebar.cards')}</span>
                      <div className="flex gap-2">
                        <button onClick={() => setDeckToDelete(deck)} className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        <button onClick={() => { setEditingDeck(deck); setCurrentSection(AppSection.EDIT); }} className="p-3 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => { handleSetActiveDeck(deck); setCurrentSection(AppSection.LEARNING); }} className="px-6 py-3 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg">{t(language, 'library.study')}</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {currentSection === AppSection.LEARNING && activeDeck && (
          <div className="flex-1 flex overflow-hidden">
            <CardPlayer cards={activeDeck.cards} deckTitle={activeDeck.title} onActiveCardChange={setActiveCard} onCardComplete={handleCardComplete} language={language} />
            <AnalysisPanel card={activeCard} language={language} />
          </div>
        )}
        {currentSection === AppSection.CREATE && <ContentCreator onSave={(d) => cloudService.saveDeck(d, currentUser.id).then(() => cloudService.fetchUserDecks(currentUser.id).then(setDecks)).then(() => setCurrentSection(AppSection.LIBRARY))} onCancel={() => setCurrentSection(AppSection.LIBRARY)} language={language} />}
        {currentSection === AppSection.STORE && <Store featuredDecks={storeDecks} onSubscribe={(d) => cloudService.saveDeck({ ...d, id: crypto.randomUUID(), isSubscribed: true, createdAt: Date.now() }, currentUser.id).then(() => cloudService.fetchUserDecks(currentUser.id).then(setDecks)).then(() => setCurrentSection(AppSection.LEARNING))} subscribedTitles={decks.map(d => d.title)} language={language} userId={currentUser.id} userRole={currentUser.role} onUpdateStoreMetadata={cloudService.updateStoreDeckMetadata} onDeleteStoreDeck={cloudService.deleteStoreDeck} />}
        {currentSection === AppSection.STATISTICS && <Statistics studiedCardIds={studiedCardIds} allTimeCount={allTimeCount} dailyGoal={dailyGoal} streak={streak} language={language} />}
        {currentSection === AppSection.SETTINGS && <Settings language={language} onLanguageChange={handleLanguageChange} />}
        {currentSection === AppSection.PROFILE && <Profile user={currentUser} onUpdateUser={setCurrentUser} language={language} />}
        {currentSection === AppSection.EDIT && editingDeck && (
          <DeckEditor 
            deck={editingDeck} 
            language={language} 
            onCancel={() => {setEditingDeck(null); setCurrentSection(AppSection.LIBRARY);}} 
            onSave={async (d) => { await cloudService.saveDeck(d, currentUser.id); const updated = await cloudService.fetchUserDecks(currentUser.id); setDecks(updated); }}
            onStartLearning={(d) => { handleSetActiveDeck(d); setCurrentSection(AppSection.LEARNING); }}
            onPublish={async (d) => { await cloudService.publishToStore(d, currentUser.id, currentUser.name); await loadStoreData(); }}
            isPublished={storeDecks.some(sd => sd.originDeckId === editingDeck.id)}
            isPublishing={false}
          />
        )}
      </main>

      {/* 打卡详情全屏弹窗 */}
      {isProgressModalOpen && (
        <StudyProgressModal 
          user={currentUser} 
          onClose={() => setIsProgressModalOpen(false)} 
          language={language} 
          studiedCount={studiedCardIds.size} 
          dailyGoal={dailyGoal} 
          streak={streak} 
        />
      )}
    </div>
  );
};

export default App;
