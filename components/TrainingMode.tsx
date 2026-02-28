
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, RotateCcw, CheckCircle2, AlertCircle, Trophy, Target, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Card, TrainingChallenge, Language, VoiceProvider } from '../types';
import { generateTrainingChallenges, playAudio, stopAllAudio, generateAudio } from '../services/aiService';

interface TrainingModeProps {
  card: Card;
  language: Language;
  voiceProvider: VoiceProvider;
  onExit: () => void;
}

const TrainingMode: React.FC<TrainingModeProps> = ({ card, language, voiceProvider, onExit }) => {
  const [challenges, setChallenges] = useState<TrainingChallenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userWords, setUserWords] = useState<string[]>([]);
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'playing' | 'checking' | 'correct' | 'wrong'>('idle');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentChallenge = challenges[currentIndex];
  const targetWords = currentChallenge?.content.split(/\s+/) || [];

  useEffect(() => {
    if (targetWords.length > 0 && userWords.length === 0) {
      setUserWords(new Array(targetWords.length).fill(''));
      setActiveWordIndex(0);
    }
  }, [currentChallenge, targetWords.length]);

  useEffect(() => {
    const initChallenges = async () => {
      setIsLoading(true);
      try {
        if (card.trainingContent && card.trainingContent.length > 0) {
          // Use existing training content
          const processedChallenges = card.trainingContent.map((item, idx) => ({
            id: `challenge-${idx}`,
            type: (item.role?.toLowerCase().includes('sentence') ? 'sentence' : 
                   item.role?.toLowerCase().includes('phrase') ? 'phrase' : 'word') as any,
            content: item.point,
            translation: item.meaning,
            audioUrl: item.audioUrl || '',
            voiceName: card.voiceName
          } as TrainingChallenge));
          setChallenges(processedChallenges);
        } else {
          // Fallback to AI generation if somehow we got here without trainingContent
          const result = await generateTrainingChallenges(card);
          const rawChallenges = result.challenges || [];
          
          // Generate audio for each challenge
          const processedChallenges = await Promise.all(rawChallenges.map(async (c: any, idx: number) => {
            const audio = await generateAudio(c.content, card.voiceName || 'en_female_lauren_moon_bigtts', voiceProvider);
            return {
              id: `challenge-${idx}`,
              type: c.type,
              content: c.content,
              translation: c.translation,
              audioUrl: audio?.url || '',
              voiceName: card.voiceName
            } as TrainingChallenge;
          }));
          
          setChallenges(processedChallenges);
        }
      } catch (err) {
        console.error("Failed to init challenges", err);
      } finally {
        setIsLoading(false);
      }
    };
    initChallenges();
  }, [card, voiceProvider]);

  useEffect(() => {
    if (currentChallenge && !isLoading) {
      playChallengeAudio(3);
    }
  }, [currentIndex, isLoading]);

  const playChallengeAudio = async (times: number = 1) => {
    if (!currentChallenge?.audioUrl) return;
    setIsAudioPlaying(true);
    for (let i = 0; i < times; i++) {
      await playAudio(currentChallenge.audioUrl);
      if (i < times - 1) await new Promise(resolve => setTimeout(resolve, 800));
    }
    setIsAudioPlaying(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (status === 'correct' || status === 'checking') return;
    
    const val = e.target.value;
    
    // If user types a space, move to next word
    if (val.endsWith(' ')) {
      if (activeWordIndex < targetWords.length - 1) {
        setActiveWordIndex(prev => prev + 1);
      }
      e.target.value = ''; // Clear hidden input
      return;
    }

    const newUserWords = [...userWords];
    newUserWords[activeWordIndex] = val;
    setUserWords(newUserWords);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (status === 'correct' || status === 'checking') return;

    if (e.key === 'Enter') {
      checkAnswer();
    } else if (e.key === 'Backspace') {
      const newUserWords = [...userWords];
      
      if (newUserWords[activeWordIndex].length > 0) {
        // Clear current word content
        newUserWords[activeWordIndex] = '';
        setUserWords(newUserWords);
        if (inputRef.current) inputRef.current.value = '';
      } else if (activeWordIndex > 0) {
        // Move to previous word and clear it
        const prevIdx = activeWordIndex - 1;
        setActiveWordIndex(prevIdx);
        newUserWords[prevIdx] = '';
        setUserWords(newUserWords);
        if (inputRef.current) inputRef.current.value = '';
      }
      e.preventDefault();
    }
  };

  const checkAnswer = () => {
    if (!currentChallenge) return;
    
    const fullInput = userWords.join(' ');
    const normalizedInput = fullInput.trim().toLowerCase().replace(/[.,!?;:]/g, '');
    const normalizedTarget = currentChallenge.content.trim().toLowerCase().replace(/[.,!?;:]/g, '');
    
    if (normalizedInput === normalizedTarget) {
      handleSuccess();
    } else {
      handleError();
    }
  };

  const handleSuccess = () => {
    setStatus('correct');
    setScore(prev => prev + 10);
    setStreak(prev => prev + 1);
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#2563eb', '#3b82f6', '#60a5fa']
    });

    // Play success sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
    audio.play().catch(() => {});

    setTimeout(() => {
      if (currentIndex < challenges.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setUserWords([]);
        setActiveWordIndex(0);
        setStatus('idle');
      } else {
        setTimeout(onExit, 2000);
      }
    }, 2000);
  };

  const handleError = () => {
    setStatus('wrong');
    setStreak(0);
    setErrorMsg(language === 'zh' ? '拼写有误，请再听一次' : 'Incorrect spelling, listen again');
    
    // Play error sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3');
    audio.play().catch(() => {});

    setTimeout(() => {
      setStatus('idle');
      playChallengeAudio(1);
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[200] bg-gray-900 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-lg font-bold animate-pulse">AI 正在为你准备挑战内容...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a0a0a] text-white flex flex-col overflow-hidden font-sans" onClick={() => inputRef.current?.focus()}>
      {/* Header */}
      <div className="p-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-[0_8px_16px_rgba(37,99,235,0.2)] flex items-end justify-center gap-[3px] p-2.5 overflow-hidden">
            <div className="w-1 h-1/3 bg-white/40 rounded-full"></div>
            <div className="w-1 h-full bg-white rounded-full"></div>
            <div className="w-1 h-1/2 bg-white/70 rounded-full"></div>
          </div>
          <span className="text-xl font-black tracking-tighter">CardEcho <span className="text-blue-500">TRAINING</span></span>
        </div>
        
        <button 
          onClick={onExit}
          className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all group"
        >
          <X className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
        {/* Progress bar */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl px-8">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / challenges.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
            <span>Challenge {currentIndex + 1} / {challenges.length}</span>
            <span>{currentChallenge?.type} mode</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div 
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-4xl flex flex-col items-center"
          >
            <div className="mb-12 text-center">
              <p className="text-blue-500 font-black uppercase tracking-[0.3em] text-xs mb-4">Listening Challenge</p>
              <h2 className="text-2xl font-medium text-gray-400 italic">
                {currentChallenge?.translation || card.translation}
              </h2>
            </div>

            <div className="relative w-full flex flex-wrap justify-center gap-x-6 gap-y-10">
              {/* Hidden input to capture typing */}
              <input
                ref={inputRef}
                type="text"
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="absolute opacity-0 pointer-events-none"
                autoFocus
              />

              {targetWords.map((word, i) => (
                <div key={i} className="relative flex flex-col items-center min-w-[4rem]">
                  <div className={`text-4xl md:text-6xl font-bold px-2 text-center transition-all duration-300 ${
                    status === 'wrong' && i === activeWordIndex ? 'text-red-500' : 
                    status === 'correct' ? 'text-green-400' : 
                    i === activeWordIndex ? 'text-blue-500' : 'text-white'
                  }`}>
                    {userWords[i] || ''}
                    {i === activeWordIndex && status === 'idle' && (
                      <motion.span 
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="inline-block w-1 h-10 md:h-14 bg-blue-500 ml-1 align-middle"
                      />
                    )}
                  </div>
                  <div className={`w-full h-1.5 mt-2 transition-all duration-300 ${
                    status === 'wrong' && i === activeWordIndex ? 'bg-red-600 h-2.5' : 
                    status === 'correct' ? 'bg-green-500' : 
                    i === activeWordIndex ? 'bg-blue-500 h-2' : 'bg-white/20'
                  }`} />
                </div>
              ))}
              
              {status === 'wrong' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-16 left-0 right-0 text-center text-red-500 text-sm font-bold flex items-center justify-center gap-2"
                >
                  <AlertCircle className="w-4 h-4" />
                  {errorMsg}
                </motion.div>
              )}
              
              {status === 'correct' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-16 left-0 right-0 text-center text-green-500 text-sm font-bold flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Perfect!
                </motion.div>
              )}
            </div>

            <div className="mt-20 flex gap-6">
              <button 
                onClick={() => playChallengeAudio(1)}
                className={`w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all ${isAudioPlaying ? 'text-blue-500 animate-pulse' : ''}`}
              >
                <Play className="w-6 h-6" />
              </button>
              <button 
                onClick={() => {
                  setUserWords(new Array(targetWords.length).fill(''));
                  setActiveWordIndex(0);
                  if (inputRef.current) inputRef.current.value = '';
                }}
                className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Widgets / Info */}
      <div className="p-12 grid grid-cols-3 gap-12">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-gray-500">
            <Trophy className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Total Score</span>
          </div>
          <div className="text-3xl font-black tabular-nums">{score}</div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-gray-500">
            <Flame className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Combo Streak</span>
          </div>
          <div className="text-3xl font-black text-orange-500 tabular-nums">{streak}</div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 text-gray-500">
            <Target className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Accuracy</span>
          </div>
          <div className="text-3xl font-black tabular-nums">100%</div>
        </div>
      </div>
    </div>
  );
};

export default TrainingMode;
