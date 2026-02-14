
import React, { useRef, useState, useEffect } from 'react';
import { Card, Language } from '../types';
import { playAudio, stopAllAudio } from '../services/geminiService';
import { t } from '../services/i18n';

interface CardPlayerProps {
  cards: Card[];
  onActiveCardChange: (card: Card) => void;
  language: Language;
}

const CardPlayer: React.FC<CardPlayerProps> = ({ cards, onActiveCardChange, language }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // Handle scroll and update active card
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

  const playCurrentCard = async (index: number) => {
    const currentCard = cards[index];
    if (currentCard && currentCard.audioUrl && currentCard.audioUrl !== '#') {
      setIsPlaying(true);
      try {
        await playAudio(currentCard.audioUrl, playbackSpeed);
      } catch (err) {
        console.error("Playback failed:", err);
      } finally {
        setIsPlaying(false);
      }
    }
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      stopAllAudio();
      setIsPlaying(false);
    } else {
      await playCurrentCard(activeIdx);
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (isPlaying) {
      stopAllAudio();
      playCurrentCard(activeIdx);
    }
  };

  // Broadcast initial card on mount or cards change
  useEffect(() => {
    if (cards.length > 0) {
      onActiveCardChange(cards[0]);
    }
  }, [cards]);

  // Handle auto-play when activeIdx changes
  useEffect(() => {
    stopAllAudio();
    setIsPlaying(false);
    const timer = setTimeout(() => {
      playCurrentCard(activeIdx);
    }, 300); // Slight delay for smooth transitions
    return () => {
      clearTimeout(timer);
      stopAllAudio();
    };
  }, [activeIdx]);

  // Global Hotkeys (Space for Play/Pause)
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
    <div ref={containerRef} onScroll={handleScroll} className="card-snap-container custom-scrollbar flex-1 bg-white relative">
      {cards.map((card, idx) => (
        <div key={card.id} className="card-snap-item h-full w-full flex flex-col items-center justify-center px-12 relative border-b border-gray-50">
          <div className="absolute top-12 left-12 flex items-center gap-4 text-gray-400">
            <span className="text-sm font-mono tracking-widest uppercase">{t(language, 'learning.sentence')} {idx + 1} / {cards.length}</span>
          </div>

          <div className="max-w-3xl w-full space-y-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900 selection:bg-blue-100">
              {card.text}
            </h1>
            <p className="text-xl text-gray-500 font-light italic">
              {card.translation}
            </p>
          </div>

          <div className="absolute bottom-24 flex items-center gap-8">
            <button onClick={togglePlayback} className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95">
              {isPlaying && activeIdx === idx ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
              ) : (
                <svg className="ml-1 w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>
            <div className="flex items-center gap-1 h-12">
              {[...Array(20)].map((_, i) => (
                <div key={i} className={`w-1 bg-blue-100 rounded-full transition-all duration-300 ${isPlaying && activeIdx === idx ? 'waveform-bar' : 'h-1/3'}`} style={{ animationDelay: `${i * 0.05}s`, height: (isPlaying && activeIdx === idx) ? undefined : `${20 + Math.random() * 40}%` }}></div>
              ))}
            </div>
            <div className="flex items-center gap-4">
               {[0.75, 1.0, 1.25].map(speed => (
                 <button key={speed} onClick={() => changeSpeed(speed)} className={`p-3 transition-all rounded-lg flex flex-col items-center gap-1 ${playbackSpeed === speed ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}>
                    <span className={`text-xs font-bold px-2 py-1 rounded transition-colors ${playbackSpeed === speed ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>{speed.toFixed(2)}x</span>
                 </button>
               ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CardPlayer;
