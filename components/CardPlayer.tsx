
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Card, Language } from '../types';
import { playAudio, stopAllAudio } from '../services/geminiService';
import { t } from '../services/i18n';

interface CardPlayerProps {
  cards: Card[];
  deckTitle: string;
  onActiveCardChange: (card: Card) => void;
  onCardComplete?: (cardId: string) => void;
  language: Language;
  globalSpeed: number; // 接收全局语速
  onSpeedChange: (speed: number) => void; // 用于同步全局设置
  onExit?: () => void; // 退出回调
}

const STORAGE_KEY_AUTO_NEXT = 'cardecho_auto_next';
const STORAGE_KEY_SHOW_ENGLISH = 'cardecho_show_english';
const STORAGE_KEY_SHOW_CHINESE = 'cardecho_show_chinese';

const CardPlayer: React.FC<CardPlayerProps> = ({ 
  cards, 
  deckTitle, 
  onActiveCardChange, 
  onCardComplete, 
  language,
  globalSpeed,
  onSpeedChange,
  onExit
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  
  const [isAutoNext, setIsAutoNext] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_AUTO_NEXT) === 'true';
  });
  
  const isAutoNextRef = useRef(isAutoNext);
  const playbackSpeedRef = useRef(globalSpeed);
  const isLoopingRef = useRef(false);
  const isTransitioningRef = useRef(false);

  // 显示控制状态
  const [showEnglish, setShowEnglish] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_SHOW_ENGLISH) !== 'false';
  });
  const [showChinese, setShowChinese] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_SHOW_CHINESE) !== 'false';
  });

  // 计时器状态
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isAutoNextRef.current = isAutoNext;
    localStorage.setItem(STORAGE_KEY_AUTO_NEXT, String(isAutoNext));
  }, [isAutoNext]);

  // 保存显示切换状态到 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SHOW_ENGLISH, String(showEnglish));
  }, [showEnglish]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SHOW_CHINESE, String(showChinese));
  }, [showChinese]);

  // 同步全局语速到内部 Ref
  useEffect(() => {
    playbackSpeedRef.current = globalSpeed;
  }, [globalSpeed]);

  // 计时器
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 计算进度
  const progress = cards.length > 0 ? ((activeIdx + 1) / cards.length) * 100 : 0;

  // 分数（基于播放次数）
  const score = currentRepeat > 0 ? (activeIdx + 1) * 10 + currentRepeat * 5 : (activeIdx + 1) * 10;

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollPos = containerRef.current.scrollTop;
    const itemHeight = containerRef.current.clientHeight;
    if (itemHeight === 0) return;
    
    const newIdx = Math.round(scrollPos / itemHeight);
    if (newIdx !== activeIdx && newIdx >= 0 && newIdx < cards.length) {
      setActiveIdx(newIdx);
      onActiveCardChange(cards[newIdx]);
    }
  };

  const scrollToNext = useCallback(() => {
    if (containerRef.current && activeIdx < cards.length - 1) {
      const itemHeight = containerRef.current.clientHeight;
      containerRef.current.scrollTo({
        top: (activeIdx + 1) * itemHeight,
        behavior: 'smooth'
      });
    }
  }, [activeIdx, cards.length]);

  const startPlaybackLoop = async (index: number) => {
    if (isLoopingRef.current) return;
    
    // 确保之前的音频完全停止
    stopAllAudio();
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const currentCard = cards[index];
    if (!currentCard || !currentCard.audioUrl || currentCard.audioUrl === '#') return;

    isLoopingRef.current = true;
    setIsPlaying(true);
    
    const totalRepeats = currentCard.repeatCount || 3;
    let completedFullCycle = false;
    
    try {
      for (let i = 1; i <= totalRepeats; i++) {
        if (!isLoopingRef.current || activeIdx !== index) break;
        
        setCurrentRepeat(i);
        await playAudio(currentCard.audioUrl, playbackSpeedRef.current);
        
        if (i < totalRepeats) {
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          completedFullCycle = true;
        }
      }
      
      if (activeIdx === index) {
        if (completedFullCycle) {
          onCardComplete?.(currentCard.id);
        }

        if (isAutoNextRef.current && index < cards.length - 1) {
          setTimeout(scrollToNext, 800);
        } else {
          setIsPlaying(false);
          isLoopingRef.current = false;
        }
      }
    } catch (err) {
      console.error("Playback loop failed:", err);
      // 停止所有音频并重置状态
      stopAllAudio();
      setIsPlaying(false);
      isLoopingRef.current = false;
      setCurrentRepeat(0);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopAllAudio();
      isLoopingRef.current = false;
      setIsPlaying(false);
      setCurrentRepeat(0);
    } else {
      startPlaybackLoop(activeIdx);
    }
  };

  const changeSpeed = (speed: number) => {
    onSpeedChange(speed); // 更新全局状态
    playbackSpeedRef.current = speed;
    
    if (isPlaying) {
      stopAllAudio();
      isLoopingRef.current = false;
      setTimeout(() => {
        startPlaybackLoop(activeIdx);
      }, 50);
    }
  };

  useEffect(() => {
    if (cards.length > 0) {
      onActiveCardChange(cards[0]);
    }
  }, [cards]);

  useEffect(() => {
    // 如果正在过渡中，先等待完成
    if (isTransitioningRef.current) return;
    
    isTransitioningRef.current = true;
    stopAllAudio();
    isLoopingRef.current = false;
    setIsPlaying(false);
    setCurrentRepeat(0);

    // 延迟确保之前的音频完全停止
    const timer = setTimeout(() => {
      startPlaybackLoop(activeIdx);
      isTransitioningRef.current = false;
    }, 500); 

    return () => {
      clearTimeout(timer);
      stopAllAudio();
      isLoopingRef.current = false;
      isTransitioningRef.current = false;
    };
  }, [activeIdx]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        togglePlayback();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIdx, isPlaying, globalSpeed]);

  return (
    <div className="flex-1 flex h-full">
      {/* 左侧功能区 - 浅色风格 */}
      <div className="w-72 bg-gray-50 border-r border-gray-200 p-6 flex flex-col h-full">
        {/* 退出按钮 - 最顶部 */}
        <button 
          onClick={() => onExit?.()}
          className="w-full py-3 px-4 rounded-xl bg-gray-200 hover:bg-gray-300 flex items-center justify-center gap-2 transition-all group mb-6"
        >
          <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
            {language === 'zh' ? '退出训练' : 'Exit Training'}
          </span>
        </button>

        {/* 卡组信息 */}
        {/* <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-gray-100">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
            {language === 'zh' ? '当前卡组' : 'Current Deck'}
          </div>
          <div className="text-lg font-bold text-gray-900 truncate">{deckTitle}</div>
        </div> */}

        {/* 底部区域 - 时间、进度、分数 */}
        <div className="mt-auto space-y-3">
          {/* 计时器 */}
          <div className="flex items-center justify-between py-2">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              {language === 'zh' ? '时间' : 'Time'}
            </span>
            <span className="text-lg font-bold text-gray-600 tabular-nums">
              {formatTime(elapsedTime)}
            </span>
          </div>

          {/* 进度 */}
          <div className="py-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                {language === 'zh' ? '进度' : 'Progress'}
              </span>
              <span className="text-sm font-bold text-gray-500">
                {activeIdx + 1} / {cards.length}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gray-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 分数 */}
          <div className="flex items-center justify-between py-2">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              {language === 'zh' ? '分数' : 'Score'}
            </span>
            <span className="text-lg font-bold text-gray-500">
              {score}
            </span>
          </div>
        </div>
      </div>

      {/* 右侧训练区域 */}
      <div className="flex-1 flex flex-col relative h-full">
        {/* 顶部控制栏 */}
        <div className="absolute top-8 right-8 z-20 flex items-center gap-4">
          <div className="flex items-center gap-3 bg-gray-50/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-gray-100 shadow-sm">
             <span className={`text-xs font-black uppercase tracking-widest ${isAutoNext ? 'text-blue-600' : 'text-gray-400'}`}>
               {language === 'zh' ? '自动切换' : 'AUTO PLAY'}
             </span>
             <button 
              onClick={() => setIsAutoNext(!isAutoNext)}
              className={`w-12 h-6 rounded-full p-1 transition-all duration-300 relative ${isAutoNext ? 'bg-blue-600' : 'bg-gray-200'}`}
             >
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${isAutoNext ? 'translate-x-6' : 'translate-x-0'}`}></div>
             </button>
          </div>
          <div className="flex items-center gap-3 bg-gray-50/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-gray-100 shadow-sm">
             <span className={`text-xs font-black uppercase tracking-widest ${showEnglish ? 'text-blue-600' : 'text-gray-400'}`}>
               EN
             </span>
             <button 
              onClick={() => setShowEnglish(!showEnglish)}
              className={`w-12 h-6 rounded-full p-1 transition-all duration-300 relative ${showEnglish ? 'bg-blue-600' : 'bg-gray-200'}`}
             >
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${showEnglish ? 'translate-x-6' : 'translate-x-0'}`}></div>
             </button>
          </div>
          <div className="flex items-center gap-3 bg-gray-50/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-gray-100 shadow-sm">
             <span className={`text-xs font-black uppercase tracking-widest ${showChinese ? 'text-blue-600' : 'text-gray-400'}`}>
               中文
             </span>
             <button 
              onClick={() => setShowChinese(!showChinese)}
              className={`w-12 h-6 rounded-full p-1 transition-all duration-300 relative ${showChinese ? 'bg-blue-600' : 'bg-gray-200'}`}
             >
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${showChinese ? 'translate-x-6' : 'translate-x-0'}`}></div>
             </button>
          </div>
        </div>

        <div ref={containerRef} onScroll={handleScroll} className="card-snap-container custom-scrollbar flex-1 bg-white relative h-full">
          {cards.map((card, idx) => (
            <div key={card.id} className="card-snap-item h-full w-full flex flex-col items-center justify-center px-12 relative border-b border-gray-50">
              <div className="absolute top-12 left-12 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-blue-600 text-white font-black px-2 py-0.5 rounded tracking-tighter uppercase">Deck</span>
                  <h4 className="text-sm font-bold text-gray-900 line-clamp-1 max-w-[300px]">{deckTitle}</h4>
                </div>
                <div className="flex items-center gap-2 text-gray-400 pl-0.5">
                  <span className="text-[10px] font-mono tracking-widest uppercase">{t(language, 'learning.sentence')} {idx + 1} / {cards.length}</span>
                </div>
              </div>

              <div className="max-w-3xl w-full space-y-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                {showEnglish && (
                  <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900 selection:bg-blue-100">
                    {card.text}
                  </h1>
                )}
                {showChinese && (
                  <p className="text-xl text-gray-500 font-light italic">
                    {card.translation}
                  </p>
                )}
              </div>

              <div className="absolute bottom-24 flex flex-col items-center gap-8">
                {isPlaying && activeIdx === idx && (
                  <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase animate-pulse border border-blue-100 shadow-sm mb-2">
                    {language === 'zh' ? '正在复读' : 'LOOPING'} {currentRepeat} / {card.repeatCount || 3}
                  </div>
                )}

                <div className="flex items-center gap-8">
                  <button onClick={togglePlayback} className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95">
                    {isPlaying && activeIdx === idx ? (
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                      </svg>
                    ) : (
                      <svg className="ml-1 w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    )}
                  </button>
                  <div className="flex items-center gap-1 h-12">
                    {[...Array(20)].map((_, i) => (
                      <div key={i} className={`w-1 bg-blue-100 rounded-full transition-all duration-300 ${isPlaying && activeIdx === idx ? 'waveform-bar' : 'h-1/3'}`} style={{ animationDelay: `${i * 0.05}s`, height: (isPlaying && activeIdx === idx) ? undefined : `${20 + Math.random() * 40}%` }}></div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4">
                    {[0.75, 1.0, 1.25, 1.5].map(speed => (
                      <button key={speed} onClick={() => changeSpeed(speed)} className={`p-3 transition-all rounded-lg flex flex-col items-center gap-1 ${globalSpeed === speed ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}>
                          <span className={`text-xs font-bold px-2 py-1 rounded transition-colors ${globalSpeed === speed ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>{speed.toFixed(2)}x</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 左侧圆点导航 */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-30">
          {cards.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (containerRef.current) {
                  const itemHeight = containerRef.current.clientHeight;
                  containerRef.current.scrollTo({
                    top: idx * itemHeight,
                    behavior: 'smooth'
                  });
                }
              }}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                activeIdx === idx 
                  ? 'bg-blue-600 w-3 h-3 shadow-lg' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              title={`${t(language, 'learning.sentence')} ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CardPlayer;
