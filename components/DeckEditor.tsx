
import React, { useState, useEffect } from 'react';
import { Deck, Card, WordBreakdown, TrainingItem, Language, AIProvider, AIModel, VoiceProvider } from '../types';
import { generateAudio, analyzeSentence, generateTrainingContent, playAudio, stopAllAudio } from '../services/aiService';
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
    cards: [...deck.cards].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
  };
  const [editedDeck, setEditedDeck] = useState<Deck>(JSON.parse(JSON.stringify(sortedDeck)));
  const [activeCardIdx, setActiveCardIdx] = useState<number | null>(null);
  
  // 常用音色状态
  const [recentDoubaoVoices, setRecentDoubaoVoices] = useState(() => {
    const saved = localStorage.getItem('cardecho_recent_voices');
    return saved ? JSON.parse(saved) : INITIAL_RECENT_DOUBAO;
  });

  // 只使用豆包语音
  const availableVoices = recentDoubaoVoices;
  
  // 初始化选中的音色：优先使用当前卡片的音色，如果没有则用列表第一个
  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    const firstCardWithVoice = deck.cards.find(c => c.voiceName);
    if (firstCardWithVoice?.voiceName) return firstCardWithVoice.voiceName;
    return availableVoices[0]?.id || 'en_female_lauren_moon_bigtts';
  });

  const [ttsSpeed, setTtsSpeed] = useState(1.2);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false); 
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [isGeneratingTraining, setIsGeneratingTraining] = useState(false);
  const [isBatchGeneratingTraining, setIsBatchGeneratingTraining] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showSuccessHint, setShowSuccessHint] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const activeCard = activeCardIdx !== null ? editedDeck.cards[activeCardIdx] : null;

  // 当切换卡片时，同步音色状态
  useEffect(() => {
    if (activeCard?.voiceName && activeCard.voiceName !== selectedVoice) {
      setSelectedVoice(activeCard.voiceName);
    }
  }, [activeCardIdx, activeCard?.voiceName]);

  // 确保选中的音色在当前列表里
  useEffect(() => {
    const isCurrentVoiceValid = availableVoices.find((v: any) => v.id === selectedVoice) || (activeCard?.voiceName === selectedVoice);
    
    if (!isCurrentVoiceValid && availableVoices.length > 0) {
      setSelectedVoice(availableVoices[0].id);
    }
  }, [recentDoubaoVoices, selectedVoice, activeCard?.voiceName]);

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
    }
  }, [editedDeck, deck]);

  useEffect(() => {
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => setSaveStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

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

  // 重新计算所有卡片的 index
  const recalculateIndices = (cards: Card[]): Card[] => {
    return cards.map((card, idx) => ({ ...card, index: idx }));
  };

  const addCard = () => {
    const newCard: Card = {
      id: `${Date.now()}-${editedDeck.cards.length}`,
      index: editedDeck.cards.length,
      text: '', translation: '', audioUrl: '#', breakdown: [], grammarNote: '', context: '', repeatCount: 3
    };
    const newCards = [...editedDeck.cards, newCard];
    setEditedDeck({ ...editedDeck, cards: newCards });
    setActiveCardIdx(newCards.length - 1);
  };

  const deleteCard = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editedDeck.cards.length <= 1) return;
    const newCards = editedDeck.cards.filter((_, i) => i !== idx);
    // 删除后重新计算 index
    const reindexedCards = recalculateIndices(newCards);
    setEditedDeck({ ...editedDeck, cards: reindexedCards });
    if (activeCardIdx !== null && activeCardIdx >= reindexedCards.length) {
      setActiveCardIdx(reindexedCards.length > 0 ? reindexedCards.length - 1 : null);
    }
  };

  const moveCard = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= editedDeck.cards.length) return;
    const newCards = [...editedDeck.cards];
    const [movedCard] = newCards.splice(fromIdx, 1);
    newCards.splice(toIdx, 0, movedCard);
    // 移动后重新计算 index
    const reindexedCards = recalculateIndices(newCards);
    setEditedDeck({ ...editedDeck, cards: reindexedCards });
    setActiveCardIdx(toIdx);
  };

  const duplicateCard = (idx: number) => {
    const cardToDuplicate = editedDeck.cards[idx];
    const newCard: Card = {
      ...cardToDuplicate,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      index: idx + 1,
    };
    const newCards = [...editedDeck.cards];
    newCards.splice(idx + 1, 0, newCard);
    // 复制后重新计算 index
    const reindexedCards = recalculateIndices(newCards);
    setEditedDeck({ ...editedDeck, cards: reindexedCards });
    setActiveCardIdx(idx + 1);
  };

  const handleBreakdownChange = (idx: number, field: keyof WordBreakdown, value: string) => {
    if (!activeCard) return;
    const currentBreakdown = activeCard.breakdown || [];
    const newBreakdown = [...currentBreakdown];
    newBreakdown[idx] = { ...newBreakdown[idx], [field]: value };
    handleCardChange('breakdown', newBreakdown);
  };

  const addBreakdownItem = () => {
    if (!activeCard) return;
    const newItem: WordBreakdown = { word: '', phonetic: '', meaning: '', role: '' };
    handleCardChange('breakdown', [...(activeCard.breakdown || []), newItem]);
  };

  const removeBreakdownItem = (idx: number) => {
    if (!activeCard) return;
    const newBreakdown = (activeCard.breakdown || []).filter((_, i) => i !== idx);
    handleCardChange('breakdown', newBreakdown);
  };

  const handleGenerateTraining = async () => {
    if (!activeCard || !activeCard.text.trim()) return;
    setIsGeneratingTraining(true);
    try {
      const result = await generateTrainingContent(activeCard.text, provider, model);
      if (result && result.trainingContent) {
        const trainingWithAudio = await Promise.all(result.trainingContent.map(async (item: TrainingItem) => {
          try {
            const audioResult = await generateAudio(item.point, selectedVoice, voiceProvider, ttsSpeed);
            if (audioResult) {
              let finalAudioUrl = audioResult.url;
              if (voiceProvider !== 'doubao') {
                const uploadedUrl = await cloudService.uploadAudio(`${activeCard.id}_training_${Date.now()}`, audioResult.url);
                if (uploadedUrl) finalAudioUrl = uploadedUrl;
              }
              return { ...item, audioUrl: finalAudioUrl };
            }
          } catch (e) {
            console.error("Audio generation failed for training item:", item.point, e);
          }
          return item;
        }));

        const newCards = [...editedDeck.cards];
        newCards[activeCardIdx!] = {
          ...newCards[activeCardIdx!],
          trainingContent: trainingWithAudio
        };
        const updatedDeck = { ...editedDeck, cards: newCards };
        setEditedDeck(updatedDeck);
        
        // Auto-save after generation
        await onSave(updatedDeck);
        setSaveStatus('saved');
      }
    } catch (error) {
      console.error("AI Training Generation failed:", error);
    } finally {
      setIsGeneratingTraining(false);
    }
  };

  const handleRegenerateTrainingAudio = async (idx: number) => {
    if (!activeCard || !activeCard.trainingContent) return;
    const item = activeCard.trainingContent[idx];
    if (!item.point.trim()) return;

    try {
      const audioResult = await generateAudio(item.point, selectedVoice, voiceProvider, ttsSpeed);
      if (audioResult) {
        let finalAudioUrl = audioResult.url;
        if (voiceProvider !== 'doubao') {
          const uploadedUrl = await cloudService.uploadAudio(`${activeCard.id}_training_${Date.now()}`, audioResult.url);
          if (uploadedUrl) finalAudioUrl = uploadedUrl;
        }
        handleTrainingChange(idx, 'audioUrl', finalAudioUrl);
      }
    } catch (e) {
      console.error("Regenerate audio failed:", e);
    }
  };

  const addTrainingItem = () => {
    if (!activeCard) return;
    const newItem: TrainingItem = { point: '', meaning: '', phonetic: '', role: '', audioUrl: '' };
    handleCardChange('trainingContent', [...(activeCard.trainingContent || []), newItem]);
  };

  const handleTrainingChange = (idx: number, field: keyof TrainingItem, value: string) => {
    if (!activeCard) return;
    const currentTraining = activeCard.trainingContent || [];
    const newTraining = [...currentTraining];
    newTraining[idx] = { ...newTraining[idx], [field]: value };
    handleCardChange('trainingContent', newTraining);
  };

  const removeTrainingItem = (idx: number) => {
    if (!activeCard) return;
    const newTraining = (activeCard.trainingContent || []).filter((_, i) => i !== idx);
    handleCardChange('trainingContent', newTraining);
  };

  const handleTtsGenerate = async () => {
    if (!activeCard) return;
    setIsGeneratingAudio(true);
    setSaveStatus('saving');
    try {
      const audioResult = await generateAudio(activeCard.text, selectedVoice, voiceProvider, ttsSpeed);
      if (audioResult) {
        // 如果是豆包，直接使用返回的文件名，不再上传到 Supabase
        let finalAudioUrl = audioResult.url;
        if (voiceProvider !== 'doubao') {
          const uploadedUrl = await cloudService.uploadAudio(activeCard.id, audioResult.url);
          if (uploadedUrl) finalAudioUrl = uploadedUrl;
          else {
            setSaveStatus('idle');
            return;
          }
        }

        if (finalAudioUrl) {
          const newCards = [...editedDeck.cards];
          newCards[activeCardIdx!] = { 
            ...newCards[activeCardIdx!], 
            audioUrl: finalAudioUrl,
            voiceName: selectedVoice,
            audioDuration: audioResult.duration
          };
          const updatedDeck = { ...editedDeck, cards: newCards };
          setEditedDeck(updatedDeck);
          await onSave(updatedDeck);
          setSaveStatus('saved');
          
          // 显示成功提示
          setShowSuccessHint(true);
          setTimeout(() => setShowSuccessHint(false), 3000);
          
          // 生成完成后自动播放一次
          setIsPlayingAudio(true);
          try {
            // 播放时需要处理文件名拼接，playAudio 内部已处理
            await playAudio(finalAudioUrl);
          } finally {
            setIsPlayingAudio(false);
          }
        } else {
          setSaveStatus('idle');
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
          // 如果是豆包，直接使用返回的文件名，不再上传到 Supabase
          let finalAudioUrl = audioResult.url;
          if (voiceProvider !== 'doubao') {
            const uploadedUrl = await cloudService.uploadAudio(card.id, audioResult.url);
            if (uploadedUrl) finalAudioUrl = uploadedUrl;
          }

          if (finalAudioUrl) {
            newCards[i] = { 
              ...newCards[i], 
              audioUrl: finalAudioUrl,
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

  // 批量生成挑战模式内容
  const handleBatchTrainingGenerate = async () => {
    if (editedDeck.cards.length === 0) return;
    setIsBatchGeneratingTraining(true);
    setSaveStatus('saving');
    setBatchProgress({ current: 0, total: editedDeck.cards.length });
    const newCards = [...editedDeck.cards];
    try {
      for (let i = 0; i < newCards.length; i++) {
        setBatchProgress({ current: i + 1, total: newCards.length });
        const card = newCards[i];
        if (!card.text.trim()) continue;
        
        const result = await generateTrainingContent(card.text, provider, model);
        if (result && result.trainingContent) {
          // 为每个训练内容生成音频
          const trainingWithAudio = await Promise.all(result.trainingContent.map(async (item: TrainingItem) => {
            try {
              const audioResult = await generateAudio(item.point, selectedVoice, voiceProvider, ttsSpeed);
              if (audioResult) {
                let finalAudioUrl = audioResult.url;
                if (voiceProvider !== 'doubao') {
                  const uploadedUrl = await cloudService.uploadAudio(`${card.id}_training_${Date.now()}`, audioResult.url);
                  if (uploadedUrl) finalAudioUrl = uploadedUrl;
                }
                return { ...item, audioUrl: finalAudioUrl };
              }
            } catch (e) {
              console.error("Audio generation failed for training item:", item.point, e);
            }
            return item;
          }));
          
          newCards[i] = {
            ...newCards[i],
            trainingContent: trainingWithAudio
          };
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
      console.error("Batch training content generation failed", err);
      setSaveStatus('idle');
    } finally {
      setIsBatchGeneratingTraining(false);
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
              className={`w-full text-left p-4 transition-all border-b border-gray-50 flex gap-3 group relative cursor-pointer ${activeCardIdx === idx ? 'bg-white shadow-sm border-l-4 border-l-blue-600' : 'hover:bg-gray-100'}`}
            >
              <div className="text-[10px] text-gray-300 tabular-nums pt-1 min-w-[24px]">#{idx + 1}</div>
              <div className="flex-1 overflow-hidden flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold truncate flex-1 ${activeCardIdx === idx ? 'text-blue-600' : 'text-gray-800'}`}>
                    {card.text || '(Empty Card)'}
                  </p>
                  {/* 删除按钮单独在右上角 */}
                  <button onClick={(e) => deleteCard(idx, e)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 shrink-0" title={language === 'zh' ? '删除此卡片' : 'Delete card'}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
                {/* 音频信息和移动/复制按钮放同一行 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    {card.audioUrl && card.audioUrl !== '#' && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-[9px] font-bold text-blue-500 rounded border border-blue-100 shrink-0">
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                        {([...Object.values(ALL_DOUBAO_VOICES).flat(), ...GEMINI_VOICES]).find(v => v.id === card.voiceName)?.label || card.voiceName || 'AI Voice'}
                      </div>
                    )}
                    {card.audioUrl && card.audioUrl !== '#' && (
                      <span className="text-[9px] text-gray-400 truncate font-medium">
                        {([...Object.values(ALL_DOUBAO_VOICES).flat(), ...GEMINI_VOICES]).find(v => v.id === card.voiceName)?.desc.split('|')[0] || ''}
                      </span>
                    )}
                  </div>
                  {/* 移动和复制按钮 */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveCard(idx, idx - 1); }} 
                      disabled={idx === 0}
                      className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed" 
                      title={language === 'zh' ? '上移' : 'Move up'}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"/></svg>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveCard(idx, idx + 1); }} 
                      disabled={idx === editedDeck.cards.length - 1}
                      className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed" 
                      title={language === 'zh' ? '下移' : 'Move down'}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); duplicateCard(idx); }} 
                      className="p-1.5 text-gray-300 hover:text-green-500 hover:bg-green-50 rounded-lg" 
                      title={language === 'zh' ? '复制此卡片' : 'Duplicate card'}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    </button>
                  </div>
                </div>
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

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="sticky top-4 z-10 bg-white border-b border-gray-100 py-6 px-12 rounded-2xl shadow-sm mx-4 mt-4">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div>
               <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{activeCardIdx === null ? t(language, 'editor.deckSettings') : t(language, 'editor.title')}</h2>
               <p className="text-xs text-gray-400 mt-1">
                 {activeCardIdx === null ? 'Manage main identity and source material.' : `Editing Card ${activeCardIdx + 1} of ${editedDeck.cards.length}`}
               </p>
            </div>
            <div className="flex gap-3">
               <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 font-bold hover:text-gray-600 transition-colors">{t(language, 'editor.cancel')}</button>
               
{/* 订阅的卡包不允许发布到商城 */}
{!deck.isSubscribed && (
  <button 
    onClick={() => onPublish(editedDeck)} 
    disabled={isPublishing}
    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 ${
      isPublished 
        ? 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50' // 修改：使用第二个按钮的激活样式
        : 'bg-indigo-600 text-white hover:bg-indigo-700'
    } disabled:opacity-50`}
  >
    {isPublishing ? (
      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
    ) : (
      <span>{isPublished ? '🚀' : '🚀'}</span>
    )}
    {isPublished ? (language === 'zh' ? '同步到商城' : 'Sync to Store') : (language === 'zh' ? '发布到商城' : 'Publish to Store')}
  </button>
)}

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
        </div>
        <div className="flex-1 overflow-y-auto p-12 bg-white custom-scrollbar">

        {activeCardIdx === null ? (
          <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <section className="bg-white border border-gray-100 rounded-[32px] p-8 md:p-12 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row gap-12 items-start relative z-10">
                   <div className="space-y-4 flex flex-col items-center">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center w-full">{t(language, 'editor.coverIcon')}</label>
                      <input type="text" value={editedDeck.icon} onChange={(e) => setEditedDeck({...editedDeck, icon: e.target.value})} className="w-28 h-28 text-5xl bg-gray-50 border border-gray-100 rounded-3xl text-center outline-none focus:bg-white transition-all shadow-inner" placeholder="🔥" />
                   </div>
                   <div className="flex-1 space-y-8 w-full">
                      <div className="space-y-3">
                         <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{t(language, 'editor.deckTitle')}</label>
                         <input value={editedDeck.title} onChange={(e) => setEditedDeck({ ...editedDeck, title: e.target.value })} className="w-full text-xl font-bold text-gray-900 bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:bg-white transition-all shadow-inner" placeholder="e.g. Daily French" />
                      </div>
                      <div className="space-y-3">
                         <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{t(language, 'editor.deckDescription')}</label>
                         <textarea value={editedDeck.description} onChange={(e) => setEditedDeck({ ...editedDeck, description: e.target.value })} className="w-full text-sm font-medium text-gray-600 bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:bg-white h-32 resize-none leading-relaxed shadow-inner" placeholder="Description..." />
                      </div>
                      <div className="space-y-3">
                         <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{t(language, 'editor.originalText')}</label>
                         <textarea 
                            value={editedDeck.sourceText || ''} 
                            onChange={(e) => setEditedDeck({ ...editedDeck, sourceText: e.target.value })} 
                            className="w-full text-sm font-medium text-gray-600 bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:bg-white h-48 resize-none leading-relaxed shadow-inner custom-scrollbar" 
                            placeholder="Paste source text here..." 
                         />
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
                    <h3 className="font-bold text-blue-900 text-sm">{t(language, 'editor.aiEnrichmentTitle')} ({provider.toUpperCase()})</h3>
                    <p className="text-xs text-blue-700/70">{t(language, 'editor.aiEnrichmentDesc')}</p>
                  </div>
                </div>
                <button onClick={handleAiAnalyze} disabled={isAnalyzing || !activeCard.text.trim()} className="bg-white border border-blue-200 text-blue-600 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50">
                  {isAnalyzing && <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>}
                  {isAnalyzing ? t(language, 'learning.analyzing') : t(language, 'learning.deepDive')}
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800">{t(language, 'editor.originalText')}</h3>
                  <textarea value={activeCard.text} onChange={(e) => handleCardChange('text', e.target.value)} className="w-full p-4 border border-gray-200 rounded-xl text-lg font-bold focus:border-blue-500 outline-none transition-all shadow-sm" rows={3} />
                </div>
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800">{t(language, 'editor.translation')}</h3>
                  <textarea value={activeCard.translation} onChange={(e) => handleCardChange('translation', e.target.value)} className="w-full p-4 border border-gray-200 rounded-xl text-lg text-gray-600 focus:border-blue-500 outline-none bg-gray-50/50" rows={3} />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800">{t(language, 'editor.grammarNote')}</h3>
                  <textarea value={activeCard.grammarNote} onChange={(e) => handleCardChange('grammarNote', e.target.value)} className="w-full p-4 border border-gray-200 rounded-xl text-sm text-gray-700 focus:border-blue-500 outline-none bg-gray-50/30" rows={4} />
                </div>
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800">{t(language, 'editor.usageContext')}</h3>
                  <textarea value={activeCard.context} onChange={(e) => handleCardChange('context', e.target.value)} className="w-full p-4 border border-gray-200 rounded-xl text-sm text-gray-600 italic focus:border-blue-500 outline-none bg-gray-50/30" rows={4} />
                </div>
             </div>

             {/* AI VOICE CONFIGURATION - MOVED UP */}
             <div className="p-8 bg-gray-50 rounded-[32px] border border-gray-100 space-y-8 mt-8 relative overflow-hidden shadow-sm">
                {(isBatchGenerating || isBatchGeneratingTraining) && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-12 animate-in fade-in duration-300">
                    <div className="w-full max-w-md space-y-6">
                       <div className="flex justify-between items-end mb-2">
                          <p className="text-lg font-black text-purple-600 uppercase tracking-tighter">
                            {isBatchGeneratingTraining 
                              ? (language === 'zh' ? '正在批量生成挑战内容...' : 'Generating Challenge Content...').replace('{current}', batchProgress.current.toString()).replace('{total}', batchProgress.total.toString())
                              : t(language, 'editor.batchProcessing').replace('{current}', batchProgress.current.toString()).replace('{total}', batchProgress.total.toString())}
                          </p>
                          <span className="text-xs font-bold text-gray-400 italic">Doubao HQ V3.1</span>
                       </div>
                       <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden shadow-inner border border-gray-100">
                          <div className={`h-full transition-all duration-500 ease-out ${isBatchGeneratingTraining ? 'bg-purple-600' : 'bg-blue-600'}`} style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}></div>
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
                               ? 'bg-purple-600 text-white shadow-md'
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
<span className="font-bold flex items-center gap-1.5 text-purple-600">
                           <span className="text-lg">{recentDoubaoVoices.find((v: any) => v.id === selectedVoice)?.icon || '🎙️'}</span>
                           {recentDoubaoVoices.find((v: any) => v.id === selectedVoice)?.label || selectedVoice}
                           <span className="text-[10px] font-normal text-gray-400 ml-1 opacity-70">
                              ({recentDoubaoVoices.find((v: any) => v.id === selectedVoice)?.desc || 'Standard'})
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
                            className="flex-1 sm:flex-none bg-white border-2 px-6 py-3 rounded-2xl text-xs font-bold transition-all disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 border-purple-600 text-purple-600 hover:bg-purple-50"
                          >
                            {isGeneratingAudio && <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>}
                            {isGeneratingAudio ? t(language, 'editor.generating') : t(language, 'editor.generateVoice')}
                          </button>
                          <button 
                            onClick={handleBatchTtsGenerate}
                            disabled={isGeneratingAudio || isBatchGenerating || editedDeck.cards.length === 0}
                            className="flex-1 sm:flex-none px-8 py-3 rounded-2xl text-xs font-bold text-white transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-3 group bg-purple-600 hover:bg-purple-700 shadow-purple-100"
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
                              : 'bg-purple-600 text-white hover:scale-105'
                          }`}
                        >
                           {isPlayingAudio ? (
                             <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                           ) : (
                             <svg className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                           )}
                        </button>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{language === 'zh' ? '预览音频' : 'PREVIEW AUDIO'}</span>
                             <span className="text-[10px] font-mono text-gray-400">{activeCard.audioDuration ? `${activeCard.audioDuration.toFixed(1)}s` : '--'}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                             <div className="h-full transition-all duration-300 bg-purple-600" style={{ width: isPlayingAudio ? '100%' : '0%', transitionDuration: isPlayingAudio ? `${activeCard.audioDuration || 3}s` : '0s' }}></div>
                          </div>
                        </div>
                      </div>
                   )}
                </div>
             </div>

             <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-800">{t(language, 'editor.vocabulary')}</h3>
                    <p className="text-xs text-gray-500">{t(language, 'editor.vocabDesc')}</p>
                  </div>
                  <button onClick={addBreakdownItem} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                    {t(language, 'editor.addWord')}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {(activeCard.breakdown || []).map((item, idx) => (
                    <div key={idx} className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4 relative group">
                      <button onClick={() => removeBreakdownItem(idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-200 text-gray-400 rounded-full flex items-center justify-center hover:text-red-500 hover:border-red-200 transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{t(language, 'editor.word')}</label>
                        <input value={item.word} onChange={(e) => handleBreakdownChange(idx, 'word', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{t(language, 'editor.phonetic')}</label>
                        <input value={item.phonetic} onChange={(e) => handleBreakdownChange(idx, 'phonetic', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono outline-none focus:border-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{t(language, 'editor.role')}</label>
                        <input value={item.role} onChange={(e) => handleBreakdownChange(idx, 'role', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{t(language, 'editor.meaning')}</label>
                        <input value={item.meaning} onChange={(e) => handleBreakdownChange(idx, 'meaning', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" />
                      </div>
                    </div>
                  ))}
                </div>
             </section>

             <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-800">{t(language, 'editor.trainingContent')}</h3>
                    <p className="text-xs text-gray-500">{t(language, 'editor.trainingDesc')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* 批量生成挑战模式内容按钮 */}
                    <button 
                      onClick={handleBatchTrainingGenerate}
                      disabled={isBatchGeneratingTraining || editedDeck.cards.length === 0}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-purple-100"
                    >
                      {isBatchGeneratingTraining ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                      )}
                      {language === 'zh' ? '批量生成' : 'Batch Generate'}
                    </button>
                    <button 
                      onClick={handleGenerateTraining} 
                      disabled={isGeneratingTraining || !activeCard.text.trim()}
                      className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-xs font-bold hover:bg-purple-100 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isGeneratingTraining ? (
                        <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                      )}
                      {t(language, 'editor.generateTraining')}
                    </button>
                    <button onClick={addTrainingItem} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                      {t(language, 'editor.addTrainingItem')}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {(activeCard.trainingContent || []).map((item, idx) => (
                    <div key={idx} className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-5 gap-4 relative group">
                      <button onClick={() => removeTrainingItem(idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-200 text-gray-400 rounded-full flex items-center justify-center hover:text-red-500 hover:border-red-200 transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{t(language, 'editor.point')}</label>
                        <input value={item.point} onChange={(e) => handleTrainingChange(idx, 'point', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{t(language, 'editor.phonetic')}</label>
                        <input value={item.phonetic} onChange={(e) => handleTrainingChange(idx, 'phonetic', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono outline-none focus:border-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{t(language, 'editor.role')}</label>
                        <input value={item.role} onChange={(e) => handleTrainingChange(idx, 'role', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{t(language, 'editor.meaning')}</label>
                        <input value={item.meaning} onChange={(e) => handleTrainingChange(idx, 'meaning', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{t(language, 'editor.audio')}</label>
                        <div className="flex items-center gap-2 h-[38px]">
                          {item.audioUrl && item.audioUrl !== '#' ? (
                            <>
                              <button 
                                onClick={() => playAudio(item.audioUrl!)}
                                className="flex-1 h-full bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all flex items-center justify-center gap-2 text-xs font-bold"
                                title="Play"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                {t(language, 'learning.play')}
                              </button>
                              <button 
                                onClick={() => handleRegenerateTrainingAudio(idx)}
                                className="p-2 h-full bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all"
                                title={t(language, 'editor.regenerate')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => handleRegenerateTrainingAudio(idx)}
                              className="w-full h-full bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all flex items-center justify-center gap-2 text-xs font-bold"
                              title={t(language, 'editor.regenerate')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                              {t(language, 'editor.regenerate')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
             </section>

             {/* AI VOICE CONFIGURATION - REMOVED FROM HERE */}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-300 italic flex-col gap-4">
            <span className="text-5xl opacity-20">👈</span>
            <p className="font-bold">{t(language, 'editor.selectCardPrompt')}</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default DeckEditor;
