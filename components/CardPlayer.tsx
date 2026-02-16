
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Card, Language } from '../types';
import { playAudio, stopAllAudio } from '../services/geminiService';
import { t } from '../services/i18n';

interface CardPlayerProps {
  cards: Card[];
  deckTitle: string;
  onActiveCardChange: (card: Card) => void;
  onCardComplete?: (cardId: string) => void; // 新增回调
  language: Language;
}

const STORAGE_KEY_AUTO_NEXT = 'cardecho_auto_next';

const CardPlayer: React.FC<CardPlayerProps> = ({ cards, deckTitle, onActiveCardChange, onCardComplete, language }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  
  const [isAutoNext, setIsAutoNext] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_AUTO_NEXT) === 'true';
  });
  
  const isAutoNextRef = useRef(isAutoNext);
  const playbackSpeedRef = useRef(playbackSpeed);
  const isLoopingRef = useRef(false);

  useEffect(() => {
    isAutoNextRef.current = isAutoNext;
    localStorage.setItem(STORAGE_KEY_AUTO_NEXT, String(isAutoNext));
  }, [isAutoNext]);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

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
        // 如果完整听完了复读，触发完成回调
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
      setIsPlaying(false);
      isLoopingRef.current = false;
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
    setPlaybackSpeed(speed);
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
    stopAllAudio();
    isLoopingRef.current = false;
    setIsPlaying(false);
    setCurrentRepeat(0);

    const timer = setTimeout(() => {
      startPlaybackLoop(activeIdx);
    }, 400); 

    return () => {
      clearTimeout(timer);
      stopAllAudio();
      isLoopingRef.current = false;
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
  }, [activeIdx, isPlaying, playbackSpeed]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      <div className="absolute top-8 right-12 z-20 flex items-center gap-6">
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
      </div>

      <div ref={containerRef} onScroll={handleScroll} className="card-snap-container custom-scrollbar flex-1 bg-white relative">
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
              <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900 selection:bg-blue-100">
                {card.text}
              </h1>
              <p className="text-xl text-gray-500 font-light italic">
                {card.translation}
              </p>
            </div>

            <div className="absolute bottom-24 flex flex-col items-center gap-8">
              {isPlaying && activeIdx === idx && (
                <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase animate-pulse border border-blue-100 shadow-sm mb-2">
                  {language === 'zh' ? '正在复读' : 'LOOPING'} : {currentRepeat} / {card.repeatCount || 3}
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
                    <button key={speed} onClick={() => changeSpeed(speed)} className={`p-3 transition-all rounded-lg flex flex-col items-center gap-1 ${playbackSpeed === speed ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}>
                        <span className={`text-xs font-bold px-2 py-1 rounded transition-colors ${playbackSpeed === speed ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>{speed.toFixed(2)}x</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CardPlayer;
