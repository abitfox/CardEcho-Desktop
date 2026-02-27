
import React, { useState, useEffect } from 'react';
import { Deck, Card, WordBreakdown, Language, AIProvider, AIModel, VoiceProvider } from '../types';
import { generateAudio, analyzeSentence, playAudio, stopAllAudio } from '../services/aiService';
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
  provider: AIProvider;
  model: AIModel;
  voiceProvider: VoiceProvider;
}

const GEMINI_VOICES = [
  { id: 'Kore', label: 'Kore', desc: 'Calm & Professional', icon: '👩‍💼' },
  { id: 'Zephyr', label: 'Zephyr', desc: 'Warm & Friendly', icon: '👩‍🎨' },
  { id: 'Puck', label: 'Puck', desc: 'Youthful & Energetic', icon: '👦' },
  { id: 'Charon', label: 'Charon', desc: 'Mature & Steady', icon: '👨‍💼' },
  { id: 'Fenrir', label: 'Fenrir', desc: 'Deep & Resonant', icon: '🧔' },
];

// 音色库分类定义
const ALL_DOUBAO_VOICES = {
  "US": [
    { id: 'en_female_lauren_moon_bigtts', label: 'Lauren', desc: '温柔女声，清晰自然 | 推荐：通用朗读、有声读物', icon: '🇺🇸' },
    { id: 'en_male_michael_moon_bigtts', label: 'Michael', desc: '自然男声，专业稳重 | 推荐：商务播报、新闻', icon: '🇺🇸' },
    { id: 'en_male_bruce_moon_bigtts', label: 'Bruce', desc: '稳重男声 | 推荐：教育、纪录片', icon: '🇺🇸' },
    { id: 'en_female_amanda_mars_bigtts', label: 'Amanda', desc: '现代女声 | 推荐：广告、宣传片', icon: '🇺🇸' },
    { id: 'en_male_jackson_mars_bigtts', label: 'Jackson', desc: '年轻男声 | 推荐：游戏、娱乐', icon: '🇺🇸' },
    { id: 'en_male_campaign_jamal_moon_bigtts', label: 'Energetic Male II', desc: '充满活力 | 推荐：消息通知、广告', icon: '⚡' },
    { id: 'en_male_chris_moon_bigtts', label: 'Gotham Hero', desc: '英雄风格 | 推荐：游戏、电影预告', icon: '🦸' },
    { id: 'en_female_product_darcie_moon_bigtts', label: 'Flirty Female', desc: '俏皮女声 | 推荐：互动应用、游戏', icon: '💃' },
    { id: 'en_female_emotional_moon_bigtts', label: 'Peaceful Female', desc: '情感丰富 | 推荐：有声读物、故事', icon: '🍃' },
    { id: 'en_female_nara_moon_bigtts', label: 'Nara', desc: '亲切女声 | 推荐：客服、智能助手', icon: '📞' },
    { id: 'en_female_dacey_conversation_wvae_bigtts', label: 'Daisy', desc: '对话式女声 | 推荐：聊天机器人', icon: '💬' },
    { id: 'en_male_charlie_conversation_wvae_bigtts', label: 'Owen', desc: '对话式男声 | 推荐：聊天机器人', icon: '💬' },
    { id: 'en_female_sarah_new_conversation_wvae_bigtts', label: 'Luna', desc: '新对话女声 | 推荐：社交应用', icon: '📱' },
  ],
  "UK": [
    { id: 'en_female_daisy_moon_bigtts', label: 'Delicate Girl', desc: '优雅女声 | 推荐：文学朗读', icon: '🇬🇧' },
    { id: 'en_male_dave_moon_bigtts', label: 'Dave', desc: '英伦男声 | 推荐：纪录片、新闻', icon: '🇬🇧' },
    { id: 'en_male_hades_moon_bigtts', label: 'Hades', desc: '低沉男声 | 推荐：悬疑、恐怖', icon: '🇬🇧' },
    { id: 'en_female_onez_moon_bigtts', label: 'Onez', desc: '温柔女声 | 推荐：有声读物', icon: '🇬🇧' },
    { id: 'en_female_emily_mars_bigtts', label: 'Emily', desc: '经典女声 | 推荐：通用场景', icon: '🇬🇧' },
    { id: 'zh_male_xudong_conversation_wvae_bigtts', label: 'Daniel', desc: '对话式男声 | 推荐：聊天应用', icon: '🇬🇧' },
    { id: 'en_male_smith_mars_bigtts', label: 'Smith', desc: '正式男声 | 推荐：商务、教育', icon: '🇬🇧' },
    { id: 'en_female_anna_mars_bigtts', label: 'Anna', desc: '正式女声 | 推荐：商务、新闻', icon: '🇬🇧' },
  ],
  "AU": [
    { id: 'ICL_en_male_aussie_v1_tob', label: 'Ethan', desc: '澳洲男声 | 推荐：地方内容', icon: '🇦🇺' },
    { id: 'en_female_sarah_mars_bigtts', label: 'Sarah', desc: '澳洲女声 | 推荐：通用场景', icon: '🇦🇺' },
    { id: 'en_male_dryw_mars_bigtts', label: 'Dryw', desc: '澳洲男声 | 推荐：地方内容', icon: '🇦🇺' },
  ],
  "CN": [
    { id: 'zh_female_doubao_mars_bigtts', label: '豆包', desc: '亲和力女声', icon: '🟣' },
    { id: 'zh_female_cancan_mars_bigtts', label: '灿灿', desc: '阳光活力女声', icon: '☀️' },
    { id: 'zh_male_beijingxiaoye_emo_v2_mars_bigtts', label: '北京小爷', desc: '地道北京口音男声', icon: '🏮' },
    { id: 'zh_male_jianjian_mars_bigtts', label: '健健', desc: '磁性男声', icon: '👔' },
  ],
  "Roles": [
    { id: 'ICL_en_male_cc_sha_v1_tob', label: 'Cartoon Chef', desc: '卡通厨师', icon: '👨‍🍳' },
    { id: 'ICL_en_male_oogie2_tob', label: 'Big Boogie', desc: '大胡子', icon: '🧔' },
    { id: 'ICL_en_male_frosty1_tob', label: 'Frosty Man', desc: '雪人', icon: '⛄' },
    { id: 'ICL_en_male_grinch2_tob', label: 'The Grinch', desc: '绿怪', icon: '👹' },
    { id: 'ICL_en_male_zayne_tob', label: 'Zayne', desc: '角色音色', icon: '👤' },
    { id: 'ICL_en_male_cc_jigsaw_tob', label: 'Jigsaw', desc: '拼图杀手', icon: '🧩' },
    { id: 'ICL_en_male_cc_chucky_tob', label: 'Chucky', desc: '恰吉', icon: '🔪' },
    { id: 'ICL_en_male_cc_penny_v1_tob', label: 'Clown Man', desc: '小丑', icon: '🤡' },
    { id: 'ICL_en_male_kevin2_tob', label: 'Kevin McCallister', desc: '小鬼当家', icon: '🏠' },
    { id: 'ICL_en_male_xavier1_v1_tob', label: 'Xavier', desc: '泽维尔', icon: '👨‍🎓' },
    { id: 'ICL_en_male_cc_dracula_v1_tob', label: 'Noah', desc: '德拉库拉', icon: '🧛' },
    { id: 'ICL_en_male_cc_alastor_tob', label: 'Alastor', desc: '角色音色 | 推荐：游戏、娱乐', icon: '🎙️' },
  ]
};

const INITIAL_RECENT_DOUBAO = [
  ALL_DOUBAO_VOICES.US[0],
  ALL_DOUBAO_VOICES.US[1],
  ALL_DOUBAO_VOICES.UK[0],
  ALL_DOUBAO_VOICES.UK[1],
  ALL_DOUBAO_VOICES.CN[0],
  ALL_DOUBAO_VOICES.CN[1],
];

const DeckEditor: React.FC<DeckEditorProps> = ({ 
  deck, onSave, onCancel, onStartLearning, onPublish, 
  isPublished, isPublishing, language, 
  provider, model, voiceProvider 
}) => {
  const sortedDeck = {
    ...deck,
    cards: [...deck.cards].sort((a, b) => a.id.localeCompare(b.id))
  };
  const [editedDeck, setEditedDeck] = useState<Deck>(JSON.parse(JSON.stringify(sortedDeck)));
  const [activeCardIdx, setActiveCardIdx] = useState<number | null>(null);
  
  // 常用音色状态
  const [recentDoubaoVoices, setRecentDoubaoVoices] = useState(() => {
    const saved = localStorage.getItem('cardecho_recent_voices');
    return saved ? JSON.parse(saved) : INITIAL_RECENT_DOUBAO;
  });

  const availableVoices = voiceProvider === 'doubao' ? recentDoubaoVoices : GEMINI_VOICES;
  
  // 初始化选中的音色：优先使用当前卡片的音色，如果没有则用列表第一个
  const [selectedVoice, setSelectedVoice] = useState(() => {
    const firstCardWithVoice = deck.cards.find(c => c.voiceName);
    if (firstCardWithVoice?.voiceName) return firstCardWithVoice.voiceName;
    return availableVoices[0].id;
  });

  const [ttsSpeed, setTtsSpeed] = useState(1.2);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // 当切换卡片时，同步音色状态
  useEffect(() => {
    if (activeCard?.voiceName && activeCard.voiceName !== selectedVoice) {
      setSelectedVoice(activeCard.voiceName);
    }
  }, [activeCardIdx]);

  useEffect(() => {
    const newVoices = voiceProvider === 'doubao' ? recentDoubaoVoices : GEMINI_VOICES;
    // 确保选中的音色在当前列表里，或者它是当前卡片已有的音色
    const isCurrentVoiceValid = newVoices.find((v: any) => v.id === selectedVoice) || (activeCard?.voiceName === selectedVoice);
    
    if (!isCurrentVoiceValid) {
      setSelectedVoice(newVoices[0].id);
    }
  }, [voiceProvider, recentDoubaoVoices]);

  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false); 
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showSuccessHint, setShowSuccessHint] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const activeCard = activeCardIdx !== null ? editedDeck.cards[activeCardIdx] : null;

  const handleSelectNewVoice = (voice: any) => {
    setSelectedVoice(voice.id);
    // 如果不在常用列表中，则添加进去，保持最大 6 个
    setRecentDoubaoVoices((prev: any[]) => {
      if (prev.find(v => v.id === voice.id)) return prev;
      const updated = [voice, ...prev].slice(0, 6);
      localStorage.setItem('cardecho_recent_voices', JSON.stringify(updated));
      return updated;
    });
    setIsVoiceModalOpen(false);
  };

  useEffect(() => {
    const isDirty = JSON.stringify(deck) !== JSON.stringify(editedDeck);
    setHasChanges(isDirty);
    if (!isDirty && saveStatus === 'saving') {
      setSaveStatus('saved');
      const timer = setTimeout(() => setSaveStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [editedDeck, deck]);

  useEffect(() => {
    stopAllAudio();
    setIsPlayingAudio(false);
  }, [activeCardIdx]);

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
      const result = await analyzeSentence(activeCard.text, provider, model);
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
    } catch (err: any) {
      console.error("AI Analysis failed:", err);
      alert(err.message || "AI Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addCard = () => {
    const newCard: Card = {
      id: `${Date.now()}-${editedDeck.cards.length}`,
      text: '', translation: '', audioUrl: '#', breakdown: [], grammarNote: '', context: '', repeatCount: 3
    };
    const newCards = [...editedDeck.cards, newCard].sort((a, b) => a.id.localeCompare(b.id));
    setEditedDeck({ ...editedDeck, cards: newCards });
    const newIdx = newCards.findIndex(c => c.id === newCard.id);
    setActiveCardIdx(newIdx);
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
      const audioResult = await generateAudio(activeCard.text, selectedVoice, voiceProvider, ttsSpeed);
      if (audioResult) {
        const publicUrl = await cloudService.uploadAudio(activeCard.id, audioResult.url);
        if (publicUrl) {
          const newCards = [...editedDeck.cards];
          newCards[activeCardIdx!] = { 
            ...newCards[activeCardIdx!], 
            audioUrl: publicUrl,
            voiceName: selectedVoice,
            audioDuration: audioResult.duration
          };
          const updatedDeck = { ...editedDeck, cards: newCards };
          setEditedDeck(updatedDeck);
          await onSave(updatedDeck);
          
          // 显示成功提示
          setShowSuccessHint(true);
          setTimeout(() => setShowSuccessHint(false), 3000);
          
          // 生成完成后自动播放一次
          setIsPlayingAudio(true);
          try {
            await playAudio(publicUrl);
          } finally {
            setIsPlayingAudio(false);
          }
        }
      } else {
        setSaveStatus('idle');
      }
    } catch (err: any) {
      console.error("Audio generation failed", err);
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
        const audioResult = await generateAudio(card.text, selectedVoice, voiceProvider, ttsSpeed);
        if (audioResult) {
          const publicUrl = await cloudService.uploadAudio(card.id, audioResult.url);
          if (publicUrl) {
            newCards[i] = { 
              ...newCards[i], 
              audioUrl: publicUrl,
              voiceName: selectedVoice,
              audioDuration: audioResult.duration
            };
          }
        }
      }
      const updatedDeck = { ...editedDeck, cards: newCards };
      setEditedDeck(updatedDeck);
      await onSave(updatedDeck);
      setSaveStatus('saved');
      
      // 显示成功提示
      setShowSuccessHint(true);
      setTimeout(() => setShowSuccessHint(false), 3000);
    } catch (err) {
      console.error("Batch audio generation failed", err);
      setSaveStatus('idle');
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const toggleAudioPlayback = async () => {
    if (!activeCard || activeCard.audioUrl === '#') return;
    if (isPlayingAudio) {
      stopAllAudio();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      try {
        await playAudio(activeCard.audioUrl);
      } finally {
        setIsPlayingAudio(false);
      }
    }
  };

  const handleManualSave = async () => {
    if (saveStatus === 'saving' || !hasChanges) return;
    setSaveStatus('saving');
    try {
      await onSave(editedDeck);
      setSaveStatus('saved');
      setHasChanges(false);
    } catch (err) {
      setSaveStatus('idle');
      throw err;
    }
  };

  const handleStartLearning = async () => {
    try {
      if (hasChanges) await handleManualSave();
      onStartLearning(editedDeck);
    } catch (err) {
      alert("Failed to save changes.");
    }
  };

  return (
    <div className="flex h-full bg-white overflow-hidden relative">
      {/* 音色库全量选择弹窗 */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsVoiceModalOpen(false)}></div>
          <div className="bg-white w-full max-w-4xl h-[80vh] rounded-[40px] shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-gray-900">选择 AI 音色</h2>
                <p className="text-sm text-gray-400">点击音色名即可切换并添加至常用列表</p>
              </div>
              <button onClick={() => setIsVoiceModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
              {Object.entries(ALL_DOUBAO_VOICES).map(([category, voices]) => (
                <section key={category}>
                  <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    {category} Region
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {voices.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => handleSelectNewVoice(voice)}
                        className={`p-4 rounded-2xl border text-left transition-all hover:border-blue-300 hover:bg-blue-50/30 group ${selectedVoice === voice.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-gray-100 bg-gray-50/50'}`}
                      >
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xl">{voice.icon}</span>
                          <span className="text-sm font-bold text-gray-800">{voice.label}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 group-hover:text-blue-500 transition-colors">{voice.desc}</p>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}

      {saveStatus === 'saved' && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-green-600 text-white px-8 py-3 rounded-full shadow-2xl flex items-center gap-3 text-sm font-bold border border-green-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
            {isBatchGenerating ? t(language, 'editor.batchSuccess') : t(language, 'editor.synced')}
          </div>
        </div>
      )}

      <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/30">
        <div className="p-6 border-b border-gray-100 bg-white">
          <div 
            onClick={() => setActiveCardIdx(null)}
            className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 cursor-pointer ${activeCardIdx === null ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span className="text-xl">{editedDeck.icon}</span>
            <div className="overflow-hidden">
               <p className="text-sm font-bold truncate">{editedDeck.title || 'Untitled'}</p>
               <p className="text-[10px] text-gray-400 font-medium">Resource Settings</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {editedDeck.cards.map((card, idx) => (
            <div
              key={card.id}
              onClick={() => setActiveCardIdx(idx)}
              className={`w-full text-left p-4 transition-all border-b border-gray-50 flex flex-col gap-1 group relative cursor-pointer ${activeCardIdx === idx ? 'bg-white shadow-sm border-l-4 border-l-blue-600' : 'hover:bg-gray-100'}`}
            >
              <div className="flex items-center gap-2">
                <p className={`text-sm font-semibold truncate flex-1 ${activeCardIdx === idx ? 'text-blue-600' : 'text-gray-800'}`}>
                  <span className="text-[10px] text-gray-300 mr-1.5 tabular-nums">#{idx + 1}</span>
                  {card.text || '(Empty Card)'}
                </p>
                <button onClick={(e) => deleteCard(idx, e)} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100 bg-white">
          <button onClick={addCard} className="w-full py-2.5 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-all flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
            ADD NEW CARD
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-12 bg-white custom-scrollbar">
        <div className="max-w-4xl mx-auto flex justify-between items-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{activeCardIdx === null ? 'Deck Settings' : t(language, 'editor.title')}</h2>
            <div className="flex gap-3">
               <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 font-bold hover:text-gray-600 transition-colors">{t(language, 'editor.cancel')}</button>
               <button 
                onClick={handleManualSave} 
                disabled={!hasChanges || saveStatus === 'saving'}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-lg ${!hasChanges && saveStatus === 'idle' ? 'bg-gray-100 text-gray-400' : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50'}`}
               >
                  {saveStatus === 'saving' ? t(language, 'editor.syncing') : t(language, 'editor.save')}
               </button>
               <button onClick={handleStartLearning} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  {t(language, 'editor.startLearning')}
               </button>
            </div>
        </div>

        {activeCardIdx === null ? (
          <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <section className="bg-white border border-gray-100 rounded-[32px] p-8 md:p-12 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row gap-12 items-start relative z-10">
                   <div className="space-y-4 flex flex-col items-center">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-full">Cover Icon</label>
                      <input type="text" value={editedDeck.icon} onChange={(e) => setEditedDeck({...editedDeck, icon: e.target.value})} className="w-28 h-28 text-5xl bg-gray-50 border border-gray-100 rounded-3xl text-center outline-none focus:bg-white transition-all shadow-inner" placeholder="🔥" />
                   </div>
                   <div className="flex-1 space-y-8 w-full">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Title</label>
                         <input value={editedDeck.title} onChange={(e) => setEditedDeck({ ...editedDeck, title: e.target.value })} className="w-full text-xl font-bold text-gray-900 bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:bg-white transition-all shadow-inner" placeholder="e.g. Daily French" />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                         <textarea value={editedDeck.description} onChange={(e) => setEditedDeck({ ...editedDeck, description: e.target.value })} className="w-full text-sm font-medium text-gray-600 bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:bg-white h-32 resize-none leading-relaxed shadow-inner" placeholder="Description..." />
                      </div>
                   </div>
                </div>
             </section>
          </div>
        ) : activeCard ? (
          <div className="max-w-4xl mx-auto space-y-12 pb-32 animate-in fade-in duration-300">
             <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-[10px]">⚡</div>
                  <div>
                    <h3 className="font-bold text-blue-900 text-sm">AI Content Enrichment ({provider.toUpperCase()})</h3>
                    <p className="text-xs text-blue-700/70">Analyze card for vocab and grammar with current AI brain.</p>
                  </div>
                </div>
                <button onClick={handleAiAnalyze} disabled={isAnalyzing || !activeCard.text.trim()} className="bg-white border border-blue-200 text-blue-600 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50">
                  {isAnalyzing && <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>}
                  {isAnalyzing ? t(language, 'learning.analyzing') : t(language, 'learning.deepDive')}
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t(language, 'editor.originalText')}</label>
                  <textarea value={activeCard.text} onChange={(e) => handleCardChange('text', e.target.value)} className="w-full p-4 border border-gray-200 rounded-xl text-lg font-bold focus:border-blue-500 outline-none transition-all shadow-sm" rows={3} />
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t(language, 'editor.translation')}</label>
                  <textarea value={activeCard.translation} onChange={(e) => handleCardChange('translation', e.target.value)} className="w-full p-4 border border-gray-200 rounded-xl text-lg text-gray-600 focus:border-blue-500 outline-none bg-gray-50/50" rows={3} />
                </div>
             </div>

             {/* AI VOICE CONFIGURATION - UPDATED TO NEW DOUBAO LOGIC */}
             <div className="p-8 bg-gray-50 rounded-[32px] border border-gray-100 space-y-8 mt-8 relative overflow-hidden shadow-sm">
                {isBatchGenerating && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-12 animate-in fade-in duration-300">
                    <div className="w-full max-w-md space-y-6">
                       <div className="flex justify-between items-end mb-2">
                          <p className="text-lg font-black text-blue-600 uppercase tracking-tighter">
                            {t(language, 'editor.batchProcessing').replace('{current}', batchProgress.current.toString()).replace('{total}', batchProgress.total.toString())}
                          </p>
                          <span className="text-xs font-bold text-gray-400 italic">Doubao HQ V3.1</span>
                       </div>
                       <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden shadow-inner border border-gray-100">
                          <div className="bg-blue-600 h-full transition-all duration-500 ease-out" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}></div>
                       </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                   <div>
                      <h3 className="font-bold text-gray-800 mb-1">{t(language, 'editor.aiVoice')}</h3>
                      <p className="text-xs text-gray-500">{t(language, 'editor.voiceDesc')}</p>
                   </div>
                   <button 
                     onClick={() => setIsVoiceModalOpen(true)}
                     className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-blue-600 hover:border-blue-500 transition-all shadow-sm flex items-center gap-2"
                   >
                     🚀 所有音色
                   </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                   {availableVoices.map((voice: any) => (
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
                        <p className="text-[10px] text-gray-400 leading-tight line-clamp-1">{voice.desc}</p>
                      </button>
                   ))}
                </div>

                {/* 朗读速度选择 */}
                <div className="flex items-center gap-4 mt-2 mb-4 bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{language === 'zh' ? '朗读速度' : 'READING SPEED'}</span>
                   <div className="flex gap-2">
                      {[1.0, 1.2, 1.5, 2.0].map(speed => (
                         <button
                           key={speed}
                           onClick={() => setTtsSpeed(speed)}
                           className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                             ttsSpeed === speed 
                               ? (voiceProvider === 'doubao' ? 'bg-purple-600 text-white shadow-md' : 'bg-blue-600 text-white shadow-md')
                               : 'bg-white text-gray-500 border border-gray-100 hover:border-gray-300'
                           }`}
                         >
                           {speed.toFixed(1)}x
                         </button>
                      ))}
                   </div>
                </div>

                <div className="flex flex-col gap-6 pt-4 border-t border-gray-100">
                   <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                      <div className="text-sm font-medium text-gray-600 flex items-center gap-2">
                         <span className="bg-gray-100 px-2 py-1 rounded text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{language === 'zh' ? '当前音色' : 'CURRENT VOICE'}</span>
                         <span className={`font-bold flex items-center gap-1.5 ${voiceProvider === 'doubao' ? 'text-purple-600' : 'text-blue-600'}`}>
                            <span className="text-lg">{(voiceProvider === 'doubao' ? recentDoubaoVoices : GEMINI_VOICES).find((v: any) => v.id === selectedVoice)?.icon || '🎙️'}</span>
                            {(voiceProvider === 'doubao' ? recentDoubaoVoices : GEMINI_VOICES).find((v: any) => v.id === selectedVoice)?.label || selectedVoice}
                            <span className="text-[10px] font-normal text-gray-400 ml-1 opacity-70">
                               ({(voiceProvider === 'doubao' ? recentDoubaoVoices : GEMINI_VOICES).find((v: any) => v.id === selectedVoice)?.desc || 'Standard'})
                            </span>
                         </span>
                      </div>
                      <div className="flex flex-col gap-2 w-full lg:w-auto">
                        {showSuccessHint && (
                          <div className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100 animate-pulse text-center">
                            {language === 'zh' ? '✨ 生成成功！已自动保存' : '✨ Generated Successfully! Auto-saved'}
                          </div>
                        )}
                        <div className="flex gap-3 w-full lg:w-auto justify-end">
                          <button 
                            onClick={handleTtsGenerate}
                            disabled={isGeneratingAudio || isBatchGenerating || !activeCard.text.trim()}
                            className={`flex-1 sm:flex-none bg-white border-2 px-6 py-3 rounded-2xl text-xs font-bold transition-all disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 ${voiceProvider === 'doubao' ? 'border-purple-600 text-purple-600 hover:bg-purple-50' : 'border-blue-600 text-blue-600 hover:bg-blue-50'}`}
                          >
                            {isGeneratingAudio && <div className={`w-3 h-3 border-2 border-t-transparent rounded-full animate-spin ${voiceProvider === 'doubao' ? 'border-purple-600' : 'border-blue-600'}`}></div>}
                            {isGeneratingAudio ? t(language, 'editor.generating') : t(language, 'editor.generateVoice')}
                          </button>
                          <button 
                            onClick={handleBatchTtsGenerate}
                            disabled={isGeneratingAudio || isBatchGenerating || editedDeck.cards.length === 0}
                            className={`flex-1 sm:flex-none px-8 py-3 rounded-2xl text-xs font-bold text-white transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-3 group ${voiceProvider === 'doubao' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'}`}
                          >
                            <svg className="w-4 h-4 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                            {t(language, 'editor.generateAllVoice')}
                          </button>
                        </div>
                      </div>
                   </div>

                   {activeCard.audioUrl !== '#' && (
                      <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-50">
                        <button 
                          onClick={toggleAudioPlayback} 
                          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${
                            isPlayingAudio 
                              ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-100' 
                              : (voiceProvider === 'doubao' ? 'bg-purple-600 text-white hover:scale-105' : 'bg-blue-600 text-white hover:scale-105')
                          }`}
                        >
                           {isPlayingAudio ? (
                             <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                           ) : (
                             <svg className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                           )}
                        </button>
                        <div className="flex-1">
                           <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-gray-800">{language === 'zh' ? '预览播放' : 'Preview Resource'}</p>
                              {(activeCard.audioDuration !== undefined && activeCard.audioDuration !== null) && (
                                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                  {activeCard.audioDuration.toFixed(1)}s
                                </div>
                              )}
                           </div>
                           <p className="text-[10px] text-gray-400 mt-1">
                              音色: {
                                ([...Object.values(ALL_DOUBAO_VOICES).flat(), ...GEMINI_VOICES])
                                  .find(v => v.id === (activeCard.voiceName || selectedVoice))?.label || (activeCard.voiceName || selectedVoice)
                              } | 介绍: {
                                ([...Object.values(ALL_DOUBAO_VOICES).flat(), ...GEMINI_VOICES])
                                  .find(v => v.id === (activeCard.voiceName || selectedVoice))?.desc || 'HQ Audio Resource'
                              }
                           </p>
                        </div>
                      </div>
                    )}
                </div>
             </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-300 italic flex-col gap-4">
            <span className="text-5xl opacity-20">👈</span>
            <p className="font-bold">{t(language, 'editor.selectCardPrompt')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckEditor;
