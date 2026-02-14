
import React, { useState, useEffect } from 'react';
import { Deck, Card, WordBreakdown, Language } from '../types';
import { generateAudio, analyzeSentence, playAudio } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import { t } from '../services/i18n';

interface DeckEditorProps {
  deck: Deck;
  onSave: (deck: Deck) => Promise<void>;
  onCancel: () => void;
  onStartLearning: (deck: Deck) => void;
  onPublish: (deck: Deck) => Promise<void>;
  isPublished: boolean;
  isPublishing: boolean;
  language: Language;
}

const AVAILABLE_VOICES = [
  { id: 'Kore', label: 'Kore', desc: 'Calm & Professional (Female)', icon: '👩‍💼' },
  { id: 'Zephyr', label: 'Zephyr', desc: 'Warm & Friendly (Female)', icon: '👩‍🎨' },
  { id: 'Puck', label: 'Puck', desc: 'Youthful & Energetic (Male)', icon: '👦' },
  { id: 'Charon', label: 'Charon', desc: 'Mature & Steady (Male)', icon: '👨‍💼' },
  { id: 'Fenrir', label: 'Fenrir', desc: 'Deep & Resonant (Male)', icon: '🧔' },
];

const DeckEditor: React.FC<DeckEditorProps> = ({ deck, onSave, onCancel, onStartLearning, onPublish, isPublished, isPublishing, language }) => {
  const [editedDeck, setEditedDeck] = useState<Deck>(JSON.parse(JSON.stringify(deck)));
  const [activeCardIdx, setActiveCardIdx] = useState<number | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hasChanges, setHasChanges] = useState(false);

  const activeCard = activeCardIdx !== null ? editedDeck.cards[activeCardIdx] : null;

  useEffect(() => {
    const isDirty = JSON.stringify(deck) !== JSON.stringify(editedDeck);
    setHasChanges(isDirty);
    
    if (!isDirty && saveStatus === 'saving') {
      setSaveStatus('saved');
      const timer = setTimeout(() => setSaveStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [editedDeck, deck]);

  const handleCardChange = (field: keyof Card, value: any) => {
    if (activeCardIdx === null || !activeCard) return;
    const newCards = [...editedDeck.cards];
    newCards[activeCardIdx] = { ...newCards[activeCardIdx], [field]: value };
    setEditedDeck({ ...editedDeck, cards: newCards });
  };

  const handleAiAnalyze = async () => {
    if (!activeCard || !activeCard.text.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeSentence(activeCard.text);
      if (result) {
        const newCards = [...editedDeck.cards];
        newCards[activeCardIdx!] = {
          ...newCards[activeCardIdx!],
          breakdown: result.breakdown || [],
          grammarNote: result.grammarNote || '',
          context: result.context || '',
          translation: result.translation || newCards[activeCardIdx!].translation
        };
        setEditedDeck({ ...editedDeck, cards: newCards });
      }
    } catch (err) {
      console.error("AI Analysis failed:", err);
      alert("AI Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addCard = () => {
    const newCard: Card = {
      id: crypto.randomUUID(),
      text: '',
      translation: '',
      audioUrl: '#',
      breakdown: [],
      grammarNote: '',
      context: ''
    };
    const newCards = [...editedDeck.cards, newCard];
    setEditedDeck({ ...editedDeck, cards: newCards });
    setActiveCardIdx(newCards.length - 1);
  };

  const deleteCard = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editedDeck.cards.length <= 1) return;
    const newCards = editedDeck.cards.filter((_, i) => i !== idx);
    setEditedDeck({ ...editedDeck, cards: newCards });
    if (activeCardIdx !== null && activeCardIdx >= newCards.length) {
      setActiveCardIdx(newCards.length > 0 ? newCards.length - 1 : null);
    }
  };

  const handleBreakdownChange = (idx: number, field: keyof WordBreakdown, value: string) => {
    if (!activeCard) return;
    const newBreakdown = [...activeCard.breakdown];
    newBreakdown[idx] = { ...newBreakdown[idx], [field]: value };
    handleCardChange('breakdown', newBreakdown);
  };

  const addBreakdownItem = () => {
    if (!activeCard) return;
    const newItem: WordBreakdown = { word: '', phonetic: '', meaning: '', role: '' };
    handleCardChange('breakdown', [...activeCard.breakdown, newItem]);
  };

  const removeBreakdownItem = (idx: number) => {
    if (!activeCard) return;
    const newBreakdown = activeCard.breakdown.filter((_, i) => i !== idx);
    handleCardChange('breakdown', newBreakdown);
  };

  const handleTtsGenerate = async () => {
    if (!activeCard) return;
    setIsGeneratingAudio(true);
    setSaveStatus('saving');
    
    try {
      const base64Mp3 = await generateAudio(activeCard.text, selectedVoice);
      if (base64Mp3) {
        const publicUrl = await cloudService.uploadAudio(activeCard.id, base64Mp3);
        if (publicUrl) {
          const newCards = [...editedDeck.cards];
          newCards[activeCardIdx!] = { ...newCards[activeCardIdx!], audioUrl: publicUrl };
          const updatedDeck = { ...editedDeck, cards: newCards };
          setEditedDeck(updatedDeck);
          await onSave(updatedDeck);
        }
      } else {
        setSaveStatus('idle');
      }
    } catch (err) {
      console.error("Audio generation or auto-save failed", err);
      setSaveStatus('idle');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleBatchTtsGenerate = async () => {
    if (editedDeck.cards.length === 0) return;
    setIsBatchGenerating(true);
    setSaveStatus('saving');
    setBatchProgress({ current: 0, total: editedDeck.cards.length });

    const newCards = [...editedDeck.cards];
    
    try {
      for (let i = 0; i < newCards.length; i++) {
        setBatchProgress({ current: i + 1, total: newCards.length });
        const card = newCards[i];
        if (!card.text.trim()) continue;

        const base64Mp3 = await generateAudio(card.text, selectedVoice);
        if (base64Mp3) {
          const publicUrl = await cloudService.uploadAudio(card.id, base64Mp3);
          if (publicUrl) {
            newCards[i] = { ...newCards[i], audioUrl: publicUrl };
          }
        }
      }
      
      const updatedDeck = { ...editedDeck, cards: newCards };
      setEditedDeck(updatedDeck);
      await onSave(updatedDeck);
      setSaveStatus('saved');
    } catch (err) {
      console.error("Batch audio generation failed", err);
      setSaveStatus('idle');
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const handlePlayAudio = async () => {
    if (!activeCard || activeCard.audioUrl === '#') return;
    await playAudio(activeCard.audioUrl);
  };

  const handleManualSave = async () => {
    if (saveStatus === 'saving' || !hasChanges) return;
    setSaveStatus('saving');
    try {
      await onSave(editedDeck);
    } catch (err) {
      console.error("Manual save failed", err);
      setSaveStatus('idle');
      throw err;
    }
  };

  const handleStartLearning = async () => {
    try {
      if (hasChanges) {
        await handleManualSave();
      }
      onStartLearning(editedDeck);
    } catch (err) {
      alert("Failed to save changes before starting.");
    }
  };

  const handleStorePublish = async () => {
    try {
      if (hasChanges) {
        await handleManualSave();
      }
      await onPublish(editedDeck);
    } catch (err) {
      console.error("Publish from editor failed", err);
    }
  };

  return (
    <div className="flex h-full bg-white overflow-hidden relative">
      {/* Success Notification */}
      {saveStatus === 'saved' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
          <div className="bg-green-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-2 text-sm font-bold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
            {isBatchGenerating ? t(language, 'editor.batchSuccess') : t(language, 'editor.synced')}
          </div>
        </div>
      )}

      {/* Sidebar Deck Structure */}
      <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/30">
        <div className="p-6 border-b border-gray-100 bg-white">
          <button 
            onClick={() => setActiveCardIdx(null)}
            className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${activeCardIdx === null ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span className="text-xl">{editedDeck.icon}</span>
            <div className="overflow-hidden">
               <p className="text-sm font-bold truncate">{editedDeck.title || 'Untitled'}</p>
               <p className="text-[10px] text-gray-400 font-medium">Resource Settings</p>
            </div>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {editedDeck.cards.map((card, idx) => (
            <button
              key={card.id}
              onClick={() => setActiveCardIdx(idx)}
              className={`w-full text-left p-4 transition-all border-b border-gray-50 flex flex-col gap-1 group relative ${
                activeCardIdx === idx ? 'bg-white shadow-sm border-l-4 border-l-blue-600' : 'hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <p className={`text-sm font-semibold truncate flex-1 ${activeCardIdx === idx ? 'text-blue-600' : 'text-gray-800'}`}>
                  {card.text || '(Empty Card)'}
                </p>
                {card.audioUrl !== '#' && (
                   <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">MP3</span>
                )}
                <button 
                  onClick={(e) => deleteCard(idx, e)}
                  className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100 bg-white">
          <button 
            onClick={addCard}
            className="w-full py-2.5 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
            ADD NEW CARD
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div className="flex-1 overflow-y-auto p-12 bg-white custom-scrollbar">
        {/* Persistent Editor Header */}
        <div className="max-w-4xl mx-auto flex justify-between items-center mb-10">
            <div>
               <h2 className="text-2xl font-bold text-gray-800">{activeCardIdx === null ? 'Deck Settings' : t(language, 'editor.title')}</h2>
               <p className="text-xs text-gray-400 mt-1">
                 {activeCardIdx === null ? 'Manage main identity of this resource pack.' : `Editing Card ${activeCardIdx + 1} of ${editedDeck.cards.length}`}
               </p>
            </div>
            <div className="flex gap-3">
               <button onClick={onCancel} className="px-4 py-2 text-gray-400 font-bold hover:text-gray-600 transition-colors">{t(language, 'editor.cancel')}</button>
               
               <button 
                onClick={handleStorePublish}
                disabled={isPublishing}
                title={isPublished ? (language === 'zh' ? '同步更改到商城' : 'Sync changes to store') : (language === 'zh' ? '发布到商城' : 'Publish to store')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border shadow-sm ${
                  isPublished 
                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                    : 'bg-white text-gray-500 border-gray-200 hover:text-blue-600 hover:border-blue-200'
                } disabled:opacity-50`}
               >
                 {isPublishing ? (
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                 ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isPublished 
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      }
                    </svg>
                 )}
                 {isPublished 
                    ? (language === 'zh' ? '更新到商城' : 'UPDATE STORE') 
                    : (language === 'zh' ? '发布到商城' : 'PUBLISH TO STORE')
                 }
               </button>

               <button 
                onClick={handleManualSave} 
                disabled={!hasChanges || saveStatus === 'saving'}
                className={`px-6 py-2 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${
                  !hasChanges 
                    ? 'bg-gray-100 text-gray-400 cursor-default shadow-none' 
                    : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
                }`}
               >
                  {saveStatus === 'saving' ? t(language, 'editor.syncing') : t(language, 'editor.save')}
               </button>
               <button 
                onClick={handleStartLearning}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95 flex items-center gap-2"
               >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  {t(language, 'editor.startLearning')}
               </button>
            </div>
        </div>

        {activeCardIdx === null ? (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <section className="bg-slate-50/50 border border-gray-100 rounded-[32px] p-10">
                <div className="flex flex-col md:flex-row gap-10 items-start">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Icon</label>
                      <input 
                        type="text" 
                        value={editedDeck.icon}
                        onChange={(e) => setEditedDeck({...editedDeck, icon: e.target.value})}
                        className="w-24 h-24 text-4xl bg-white border border-gray-200 rounded-[24px] text-center outline-none focus:border-blue-500 shadow-sm"
                        placeholder="🔥"
                      />
                   </div>
                   <div className="flex-1 space-y-6 w-full">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Deck Title</label>
                         <input 
                            value={editedDeck.title}
                            onChange={(e) => setEditedDeck({ ...editedDeck, title: e.target.value })}
                            className="w-full text-2xl font-black text-gray-900 bg-white border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 shadow-sm"
                            placeholder="e.g. Daily French Expressions"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Introduction / Description</label>
                         <textarea 
                            value={editedDeck.description}
                            onChange={(e) => setEditedDeck({ ...editedDeck, description: e.target.value })}
                            className="w-full text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 shadow-sm h-32 resize-none leading-relaxed"
                            placeholder="Describe what learners will achieve with this pack..."
                         />
                      </div>
                   </div>
                </div>
             </section>

             <div className="p-8 bg-blue-50/40 border border-dashed border-blue-200 rounded-[32px] flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm border border-blue-50">📚</div>
                <div className="flex-1">
                   <p className="text-sm font-bold text-blue-900">Resource Statistics</p>
                   <p className="text-xs text-blue-700/70">This deck currently contains <span className="font-bold text-blue-600">{editedDeck.cards.length} cards</span>. You can manage them from the sidebar on the left.</p>
                </div>
             </div>
          </div>
        ) : activeCard ? (
          <div className="max-w-4xl mx-auto space-y-12 pb-32 animate-in fade-in duration-300">
             {/* AI Deep Dive Feature */}
             <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-900 text-sm">AI Content Enrichment (Deep Dive)</h3>
                    <p className="text-xs text-blue-700/70">Automatically analyze this card for vocabulary, grammar, and context.</p>
                  </div>
                </div>
                <button 
                  onClick={handleAiAnalyze}
                  disabled={isAnalyzing || !activeCard.text.trim()}
                  className="bg-white border border-blue-200 text-blue-600 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isAnalyzing && <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>}
                  {isAnalyzing ? t(language, 'learning.analyzing') : t(language, 'learning.deepDive')}
                </button>
             </div>

             {/* Basic Content Section */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t(language, 'editor.originalText')}</label>
                  <textarea 
                    value={activeCard.text}
                    onChange={(e) => handleCardChange('text', e.target.value)}
                    className="w-full p-4 border border-gray-200 rounded-xl text-lg font-bold focus:border-blue-500 outline-none transition-all shadow-sm"
                    rows={3}
                    placeholder="Enter the foreign language text here..."
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t(language, 'editor.translation')}</label>
                  <textarea 
                    value={activeCard.translation}
                    onChange={(e) => handleCardChange('translation', e.target.value)}
                    className="w-full p-4 border border-gray-200 rounded-xl text-lg text-gray-600 focus:border-blue-500 outline-none transition-all shadow-sm bg-gray-50/50"
                    rows={3}
                    placeholder="Chinese translation..."
                  />
                </div>
             </div>

             {/* Advanced Content Section */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t(language, 'editor.grammarNote')}</label>
                  <textarea 
                    value={activeCard.grammarNote}
                    onChange={(e) => handleCardChange('grammarNote', e.target.value)}
                    className="w-full p-4 border border-gray-200 rounded-xl text-sm leading-relaxed focus:border-blue-500 outline-none transition-all shadow-sm"
                    rows={4}
                    placeholder="Explain tricky grammar points..."
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t(language, 'editor.usageContext')}</label>
                  <textarea 
                    value={activeCard.context}
                    onChange={(e) => handleCardChange('context', e.target.value)}
                    className="w-full p-4 border border-gray-200 rounded-xl text-sm leading-relaxed text-gray-600 italic focus:border-blue-500 outline-none transition-all shadow-sm bg-gray-50/50"
                    rows={4}
                    placeholder="Describe where and when to use this sentence..."
                  />
                </div>
             </div>

             {/* Audio Configuration Section */}
             <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100 space-y-8 mt-8 relative overflow-hidden">
                {/* Batch Progress Overlay */}
                {isBatchGenerating && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-12 animate-in fade-in duration-300">
                    <div className="w-full max-w-md space-y-6">
                       <div className="flex justify-between items-end mb-2">
                          <p className="text-lg font-black text-blue-600 uppercase tracking-tighter">
                            {t(language, 'editor.batchProcessing')
                               .replace('{current}', batchProgress.current.toString())
                               .replace('{total}', batchProgress.total.toString())}
                          </p>
                          <span className="text-xs font-bold text-gray-400 italic">Gemini TTS 2.5</span>
                       </div>
                       <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden shadow-inner border border-gray-50">
                          <div 
                            className="bg-blue-600 h-full transition-all duration-500 ease-out shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                            style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                          ></div>
                       </div>
                       <p className="text-xs text-gray-400 text-center font-medium leading-relaxed">
                          Synchronizing high-fidelity neural audio to Echo Cloud... <br/>
                          Please keep the application open.
                       </p>
                    </div>
                  </div>
                )}

                <div>
                   <h3 className="font-bold text-gray-800 mb-1">{t(language, 'editor.aiVoice')}</h3>
                   <p className="text-xs text-gray-500">{t(language, 'editor.voiceDesc')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                   {AVAILABLE_VOICES.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => setSelectedVoice(voice.id)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          selectedVoice === voice.id 
                            ? 'bg-white border-blue-500 ring-2 ring-blue-50 shadow-md' 
                            : 'bg-white/50 border-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xl">{voice.icon}</span>
                          <span className={`text-sm font-bold ${selectedVoice === voice.id ? 'text-blue-600' : 'text-gray-700'}`}>
                            {voice.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-tight">{voice.desc}</p>
                      </button>
                   ))}
                </div>

                <div className="flex flex-col gap-6 pt-4 border-t border-gray-100">
                   <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-sm font-medium text-gray-600 self-start sm:self-center">
                         Current: <span className="text-blue-600 font-bold">{selectedVoice}</span>
                      </div>
                      <div className="flex gap-3 w-full sm:w-auto">
                        <button 
                          onClick={handleTtsGenerate}
                          disabled={isGeneratingAudio || isBatchGenerating || !activeCard.text.trim()}
                          className="flex-1 sm:flex-none bg-white border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-2xl text-xs font-bold hover:bg-blue-50 transition-all disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
                        >
                          {isGeneratingAudio && <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
                          {isGeneratingAudio ? t(language, 'editor.generating') : t(language, 'editor.generateVoice')}
                        </button>
                        <button 
                          onClick={handleBatchTtsGenerate}
                          disabled={isGeneratingAudio || isBatchGenerating || editedDeck.cards.length === 0}
                          className="flex-1 sm:flex-none bg-blue-600 text-white px-8 py-3 rounded-2xl text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-100 flex items-center justify-center gap-3 group"
                        >
                          <svg className="w-4 h-4 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                          {t(language, 'editor.generateAllVoice')}
                        </button>
                      </div>
                   </div>

                   {activeCard.audioUrl !== '#' ? (
                      <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-blue-50">
                        <button onClick={handlePlayAudio} className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-md">
                           <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                        <div className="flex-1 overflow-hidden">
                           <p className="text-[10px] font-mono text-gray-400 truncate mb-1">{activeCard.audioUrl}</p>
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100 uppercase">{t(language, 'editor.synced')}</span>
                              <span className="text-[10px] text-gray-400 italic">MP3 (64kbps)</span>
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/40 border border-dashed border-gray-200 p-8 rounded-2xl text-center text-sm text-gray-400">
                        {t(language, 'editor.noAudio')}
                      </div>
                    )}
                </div>
             </div>

             {/* Vocabulary Breakdown Editor */}
             <div className="space-y-6 pt-12 border-t border-gray-100">
                <div className="flex items-center justify-between">
                   <div>
                      <h3 className="font-bold text-gray-800 uppercase tracking-wider text-sm">{t(language, 'editor.vocabulary')}</h3>
                      <p className="text-xs text-gray-400">{t(language, 'editor.vocabDesc')}</p>
                   </div>
                   <button 
                    onClick={addBreakdownItem}
                    className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors border border-blue-100 flex items-center gap-1"
                   >
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                     {t(language, 'editor.addWord')}
                   </button>
                </div>
                
                <div className="space-y-3">
                   {activeCard.breakdown.map((item, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row gap-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 group">
                         <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="space-y-1">
                               <label className="text-[10px] font-bold text-gray-400 uppercase">{t(language, 'editor.word')}</label>
                               <input 
                                value={item.word} 
                                onChange={(e) => handleBreakdownChange(idx, 'word', e.target.value)}
                                className="w-full bg-white px-3 py-2 rounded-lg border border-gray-200 text-sm font-bold focus:border-blue-500 outline-none"
                               />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] font-bold text-gray-400 uppercase">{t(language, 'editor.phonetic')}</label>
                               <input 
                                value={item.phonetic} 
                                onChange={(e) => handleBreakdownChange(idx, 'phonetic', e.target.value)}
                                className="w-full bg-white px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono text-blue-600 focus:border-blue-500 outline-none"
                               />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] font-bold text-gray-400 uppercase">{t(language, 'editor.meaning')}</label>
                               <input 
                                value={item.meaning} 
                                onChange={(e) => handleBreakdownChange(idx, 'meaning', e.target.value)}
                                className="w-full bg-white px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none"
                               />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] font-bold text-gray-400 uppercase">{t(language, 'editor.role')}</label>
                               <input 
                                value={item.role} 
                                onChange={(e) => handleBreakdownChange(idx, 'role', e.target.value)}
                                className="w-full bg-white px-3 py-2 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-500 focus:border-blue-500 outline-none"
                               />
                            </div>
                         </div>
                         <div className="flex items-end pb-1">
                            <button 
                              onClick={() => removeBreakdownItem(idx)}
                              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                         </div>
                      </div>
                   ))}
                   {activeCard.breakdown.length === 0 && (
                     <div className="text-center p-6 border border-dashed border-gray-100 rounded-2xl text-xs text-gray-400 italic">
                        Click "Deep Dive" above to auto-generate word analysis.
                     </div>
                   )}
                </div>
             </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 italic flex-col gap-4">
            <span className="text-5xl opacity-20">👈</span>
            {t(language, 'editor.selectCardPrompt')}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckEditor;
