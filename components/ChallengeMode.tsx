
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, RotateCcw, CheckCircle2, AlertCircle, Trophy, Target, Flame, Lightbulb, Clock, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Card, TrainingChallenge, Language, VoiceProvider, Deck } from '../types';
import { generateTrainingChallenges, playAudio, stopAllAudio, generateAudio } from '../services/aiService';
import { cloudService } from '../services/cloudService';

interface ChallengeModeProps {
  card: Card;
  deck: Deck;
  language: Language;
  voiceProvider: VoiceProvider;
  userId: string;
  onExit: () => void;
}

const ChallengeMode: React.FC<ChallengeModeProps> = ({ card, deck, language, voiceProvider, userId, onExit }) => {
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
  const [showHint, setShowHint] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [streakBonus, setStreakBonus] = useState(0);
  const [wrongWordIndex, setWrongWordIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingSoundRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentChallengeStartTimeRef = useRef<number>(Date.now());
  const hasUsedHintRef = useRef(false);
  const hasErrorRef = useRef(false);
  const totalAttemptsRef = useRef(0);
  const correctAttemptsRef = useRef(0);
  const challengeResultsRef = useRef<boolean[]>([]); // 记录每个挑战是否第一次就成功（无错误）

  const currentChallenge = challenges[currentIndex];
  const targetWords = currentChallenge?.content.split(/\s+/) || [];

  // Tips to cycle through
  const tips = [
    language === 'zh' ? '打入"?"问号以获得拼写提示' : 'Type "?" for spelling hint',
    language === 'zh' ? '60秒内完成当前拼写' : 'Complete spelling within 60 seconds',
    language === 'zh' ? '连续3次完美完成会获得加分奖励' : 'Get bonus points for 3 consecutive perfect answers'
  ];

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate score based on time spent
  const calculateTimeBonus = (timeSpentSeconds: number, wordCount: number): number => {
    // Base time: 3 seconds per word, max bonus within 5 seconds per word
    const baseTime = wordCount * 3;
    const maxBonusTime = wordCount * 5;
    const effectiveTime = Math.min(timeSpentSeconds, maxBonusTime);

    if (timeSpentSeconds <= baseTime) {
      // Fast completion: 15-20 bonus points
      return Math.round(20 * (1 - (timeSpentSeconds / baseTime) * 0.25));
    } else if (timeSpentSeconds <= maxBonusTime) {
      // Moderate speed: 5-15 bonus points
      return Math.round(15 * (1 - ((timeSpentSeconds - baseTime) / (maxBonusTime - baseTime)) * 0.67));
    } else {
      // Slow: no bonus
      return 0;
    }
  };

  // Calculate streak bonus (3 consecutive perfect answers)
  const calculateStreakBonus = (): number => {
    if (streak >= 3 && !hasUsedHintRef.current && !hasErrorRef.current) {
      return 30 + streak * 5; // Base 30 + 5 per extra streak
    }
    return 0;
  };

  useEffect(() => {
    if (targetWords.length > 0 && userWords.length === 0) {
      setUserWords(new Array(targetWords.length).fill(''));
      setActiveWordIndex(0);
      // Reset challenge state
      currentChallengeStartTimeRef.current = Date.now();
      hasUsedHintRef.current = false;
      hasErrorRef.current = false;
    }
  }, [currentChallenge, targetWords.length]);

  useEffect(() => {
    const initChallenges = async () => {
      setIsLoading(true);
      try {
        // Merge training content from all cards in the deck
        const allTrainingItems: any[] = [];
        
        // First, add training content from current card (prioritize it)
        if (card.trainingContent && card.trainingContent.length > 0) {
          allTrainingItems.push(...card.trainingContent.map(item => ({ ...item, currentCard: true })));
        }
        
        // Then add training content from other cards in the deck
        deck.cards.forEach((deckCard) => {
          if (deckCard.id !== card.id && deckCard.trainingContent && deckCard.trainingContent.length > 0) {
            allTrainingItems.push(...deckCard.trainingContent.map(item => ({ ...item, currentCard: false })));
          }
        });
        
        if (allTrainingItems.length > 0) {
          // Convert training items to challenges
          const processedChallenges = allTrainingItems.map((item, idx) => ({
            id: `challenge-${idx}`,
            type: (item.role?.toLowerCase().includes('sentence') ? 'sentence' : 
                   item.role?.toLowerCase().includes('phrase') ? 'phrase' : 'word') as any,
            content: item.point,
            translation: item.meaning,
            audioUrl: item.audioUrl || '',
            voiceName: item.currentCard ? card.voiceName : undefined
          } as TrainingChallenge));
          setChallenges(processedChallenges);
        } else {
          // Fallback to AI generation if no training content exists
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
  }, [card, deck, voiceProvider]);

  useEffect(() => {
    // Only play audio when we have a valid challenge and we're not loading
    // And also ensure we're not in the middle of a success or error state
    if (currentChallenge && !isLoading && status === 'idle' && !showCompletionModal) {
      // Small delay to ensure state is properly updated
      const timer = setTimeout(() => {
        playChallengeAudio(3);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, isLoading]);

  // Cycle through tips every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % tips.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [tips.length]);

  // Timer for tracking elapsed time
  useEffect(() => {
    if (isLoading) {
      setElapsedTime(0);
      return;
    }

    // Don't update timer when showing completion modal, but keep the value
    if (showCompletionModal) {
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isLoading, showCompletionModal]);

  // Global keyboard handler for completion modal
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (showCompletionModal && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleExitTraining();
      }
    };

    if (showCompletionModal) {
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }
  }, [showCompletionModal]);

  // Initialize typing sound
  useEffect(() => {
    // Short mechanical keyboard click sound
    typingSoundRef.current = new Audio('https://cdn.freesound.org/previews/341/341947_5266433-lq.mp3');
    typingSoundRef.current.volume = 0.2;

    return () => {
      if (typingSoundRef.current) {
        typingSoundRef.current.pause();
        typingSoundRef.current = null;
      }
    };
  }, []);

  const playTypingSound = () => {
    // Use Web Audio API for a simple mechanical keyboard click sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Create a short mechanical click
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.01);

      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.03);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.03);
    } catch (err) {
      // Fallback to audio element if Web Audio API fails
      if (typingSoundRef.current) {
        typingSoundRef.current.currentTime = 0;
        typingSoundRef.current.play().catch(() => {});
      }
    }
  };

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

    // If user types "?" show hint for current word
    if (val === '?') {
      setShowHint(true);
      hasUsedHintRef.current = true; // Mark hint as used
      e.target.value = ''; // Clear hidden input
      return;
    }

    // If user types a space, move to next word
    if (val.endsWith(' ')) {
      if (activeWordIndex < targetWords.length - 1) {
        setActiveWordIndex(prev => prev + 1);
      }
      e.target.value = ''; // Clear hidden input
      return;
    }

    // Play typing sound for actual typing
    if (val.length > 0) {
      playTypingSound();
    }

    const newUserWords = [...userWords];
    newUserWords[activeWordIndex] = val;
    setUserWords(newUserWords);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle completion modal
    if (showCompletionModal) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleExitTraining();
        return;
      }
    }

    if (status === 'correct' || status === 'checking') return;

    if (e.key === 'Enter') {
      if (showHint) {
        // Close hint on Enter
        setShowHint(false);
        e.preventDefault();
      } else {
        checkAnswer();
      }
    } else if (e.key === ' ') {
      if (showHint) {
        // Close hint on Space
        setShowHint(false);
        e.preventDefault();
      }
      // Don't check answer on space - let handleInputChange handle it
    } else if (e.key === 'Backspace') {
      if (showHint) {
        setShowHint(false);
        e.preventDefault();
        return;
      }

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
    } else if (e.key === 'Escape') {
      if (showHint) {
        setShowHint(false);
        e.preventDefault();
      }
    }
  };

  const checkAnswer = () => {
    if (!currentChallenge) return;

    totalAttemptsRef.current += 1;

    const fullInput = userWords.join(' ');
    const normalizedInput = fullInput.trim().toLowerCase().replace(/[.,!?;:]/g, '');
    const normalizedTarget = currentChallenge.content.trim().toLowerCase().replace(/[.,!?;:]/g, '');

    // 计算错误的单词索引
    let foundWrongIndex: number | null = null;
    const inputWords = userWords.map(w => w.trim().toLowerCase().replace(/[.,!?;:]/g, ''));
    const targetWordNorm = targetWords.map(w => w.trim().toLowerCase().replace(/[.,!?;:]/g, ''));
    
    for (let i = 0; i < Math.max(inputWords.length, targetWordNorm.length); i++) {
      if (inputWords[i] !== targetWordNorm[i]) {
        foundWrongIndex = i;
        console.log('错误单词索引:', i, '用户:', inputWords[i], '目标:', targetWordNorm[i]);
        break;
      }
    }
    setWrongWordIndex(foundWrongIndex);

    if (normalizedInput === normalizedTarget) {
      handleSuccess();
    } else {
      handleError();
    }
  };

  const handleSuccess = () => {
    setStatus('correct');
    correctAttemptsRef.current += 1;

    // 记录本次挑战是否第一次就成功（无错误且无提示）
    const isPerfect = !hasUsedHintRef.current && !hasErrorRef.current;
    challengeResultsRef.current[currentIndex] = isPerfect;

    // Stop all audio before celebrating
    stopAllAudio();

    // Calculate time bonus
    const timeSpent = (Date.now() - currentChallengeStartTimeRef.current) / 1000;
    const timeBonus = calculateTimeBonus(timeSpent, targetWords.length);

    // Calculate streak bonus (only if no hint and no error)
    const streakBonus = calculateStreakBonus();
    setStreakBonus(streakBonus);

    // Total points: base (10) + time bonus + streak bonus
    const totalPoints = 10 + timeBonus + streakBonus;
    setScore(prev => prev + totalPoints);

    // Update streak
    if (!hasUsedHintRef.current && !hasErrorRef.current) {
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }

    // Celebration effects
    if (streakBonus > 0) {
      // Special celebration for streak bonus
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#f59e0b', '#d97706', '#fbbf24', '#fef3c7'],
        scalar: 1.2
      });

      // Play celebration sound for streak bonus
      setTimeout(() => {
        // Use Web Audio API for celebration sound
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

          // Create a triumphant fanfare sound
          const playTone = (freq: number, startTime: number, duration: number) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + startTime);

            gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + startTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + startTime + duration - 0.1);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + startTime + duration);

            oscillator.start(audioContext.currentTime + startTime);
            oscillator.stop(audioContext.currentTime + startTime + duration);
          };

          // Play a triumphant melody
          playTone(523.25, 0, 0.2);     // C5
          playTone(659.25, 0.15, 0.2); // E5
          playTone(783.99, 0.3, 0.3);   // G5
          playTone(1046.50, 0.45, 0.4); // C6
        } catch (err) {
          console.error('Failed to play streak celebration sound:', err);
        }
      }, 100);
    } else {
      // Normal success confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563eb', '#3b82f6', '#60a5fa']
      });

      // Play success sound using Web Audio API
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (err) {
        console.error('Failed to play success sound:', err);
      }
    }

    // 同时更新每日打卡（每完成一个句子就打卡）
    cloudService.logCardCompletion(userId, card.id, deck.id).catch(err => console.error('Failed to log card completion:', err));

    setTimeout(() => {
      if (currentIndex < challenges.length - 1) {
        // Stop any playing audio before moving to next
        stopAllAudio();
        setCurrentIndex(prev => prev + 1);
        setUserWords([]);
        setActiveWordIndex(0);
        setStatus('idle');
        setShowHint(false);
        setWrongWordIndex(null);
      } else {
        // Stop any playing audio before showing completion
        stopAllAudio();

        // Play grand celebration sound immediately
        setTimeout(() => {
          // Use Web Audio API for grand celebration
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            const playTone = (freq: number, startTime: number, duration: number, type: OscillatorType = 'sine') => {
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();

              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);

              oscillator.type = type;
              oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + startTime);

              gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
              gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + startTime + 0.05);
              gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + startTime + duration - 0.1);
              gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + startTime + duration);

              oscillator.start(audioContext.currentTime + startTime);
              oscillator.stop(audioContext.currentTime + startTime + duration);
            };

            // Play a grand fanfare melody
            playTone(523.25, 0, 0.25);    // C5
            playTone(659.25, 0.2, 0.25);   // E5
            playTone(783.99, 0.4, 0.3);     // G5
            playTone(1046.50, 0.6, 0.35);   // C6
            playTone(1318.51, 0.8, 0.4);    // E6
            playTone(1567.98, 1.0, 0.5);    // G6

            // Add some harmony
            playTone(659.25, 0.2, 0.25, 'triangle');
            playTone(783.99, 0.4, 0.3, 'triangle');
            playTone(1046.50, 0.6, 0.35, 'triangle');
          } catch (err) {
            console.error('Failed to play grand celebration sound:', err);
          }
        }, 100);

        // Show completion modal after a short delay
        setTimeout(() => {
          setShowCompletionModal(true);

          // Grand celebration confetti - starts immediately when modal shows
          const duration = 3000;
          const end = Date.now() + duration;

          const frame = () => {
            confetti({
              particleCount: 5,
              angle: 60,
              spread: 55,
              origin: { x: 0 },
              colors: ['#2563eb', '#3b82f6', '#60a5fa', '#fbbf24', '#f59e0b', '#10b981']
            });
            confetti({
              particleCount: 5,
              angle: 120,
              spread: 55,
              origin: { x: 1 },
              colors: ['#2563eb', '#3b82f6', '#60a5fa', '#fbbf24', '#f59e0b', '#10b981']
            });

            if (Date.now() < end) {
              requestAnimationFrame(frame);
            }
          };

          frame();
        }, 300);
      }
    }, 1500);
  };

  const handleError = () => {
    setStatus('wrong');
    hasErrorRef.current = true;
    setStreak(0);
    setErrorMsg(language === 'zh' ? '拼写有误，请再听一次' : 'Incorrect spelling, listen again');

    // Stop all audio first
    stopAllAudio();

    // Play error sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.linearRampToValueAtTime(150, audioContext.currentTime + 0.15);

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.15);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (err) {
      console.error('Failed to play error sound:', err);
    }

    setTimeout(() => {
      setStatus('idle');
      setWrongWordIndex(null);
      // Play audio for the current challenge
      if (currentChallenge?.audioUrl) {
        playChallengeAudio(1);
      }
    }, 1500);
  };

  const handleExitTraining = () => {
    // 保存退出时的挑战记录
    const completionPercent = challenges.length > 0 
      ? Math.round(((currentIndex + 1) / challenges.length) * 100)
      : 0;
    const accuracy = totalAttemptsRef.current > 0 
      ? Math.round((correctAttemptsRef.current / totalAttemptsRef.current) * 100) 
      : 0;
    
    cloudService.saveChallengeRecord(userId, {
      cardId: card.id,
      deckId: deck.id,
      totalChallenges: challenges.length,
      completedChallenges: currentIndex + 1,
      score: score,
      accuracy: accuracy,
      timeSpent: elapsedTime,
      completionPercent: completionPercent
    }).then(() => {
      console.log('退出时记录已保存 (完成度: ' + completionPercent + '%)');
    }).catch(err => console.error('Failed to save exit challenge record:', err));

    setShowCompletionModal(false);
    onExit();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[200] bg-gray-900 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-lg font-bold animate-pulse">AI 正在为你准备挑战内容...</p>
      </div>
    );
  }

  // Get hint for current word
  const currentWordHint = targetWords[activeWordIndex];

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a0a0a] text-white flex flex-col overflow-hidden font-sans" onClick={() => inputRef.current?.focus()}>
      {/* Hint Modal */}
      <AnimatePresence>
        {showHint && currentWordHint && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[210] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={(e) => {
              e.stopPropagation();
              setShowHint(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <Lightbulb className="w-8 h-8 text-yellow-400" />
                <h3 className="text-xl font-bold text-white">
                  {language === 'zh' ? '单词提示' : 'Word Hint'}
                </h3>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-2">
                    {language === 'zh' ? '拼写' : 'Spelling'}
                  </p>
                  <p className="text-3xl font-bold text-white tracking-wider">
                    {currentWordHint}
                  </p>
                </div>
                {currentChallenge?.translation && (
                  <div className="bg-blue-900/30 rounded-xl p-4 border border-blue-800">
                    <p className="text-sm text-blue-400 mb-2">
                      {language === 'zh' ? '意思' : 'Meaning'}
                    </p>
                    <p className="text-lg font-medium text-white">
                      {currentChallenge.translation}
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHint(false);
                }}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-all"
              >
                {language === 'zh' ? '知道了 (按空格关闭)' : 'Got it (Press Space)'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Modal */}
      <AnimatePresence>
        {showCompletionModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[220] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-3xl p-8 max-w-lg w-full shadow-2xl"
            >
              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center"
                >
                  <Trophy className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-3xl font-black text-white mb-2">
                  {language === 'zh' ? '挑战完成！' : 'Challenge Complete!'}
                </h2>
                <p className="text-gray-400">
                  {language === 'zh' ? '恭喜你完成了本次挑战' : 'Congratulations on completing the challenge'}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-700/50 rounded-2xl p-4 text-center">
                  <div className="text-sm text-gray-400 mb-2">{language === 'zh' ? '单词量' : 'Words Learned'}</div>
                  <div className="text-3xl font-black text-white">{challenges.length}</div>
                </div>
                <div className="bg-gray-700/50 rounded-2xl p-4 text-center">
                  <div className="text-sm text-gray-400 mb-2">{language === 'zh' ? '准确率' : 'Accuracy'}</div>
                  <div className="text-3xl font-black text-green-400">
                    {challengeResultsRef.current.length > 0
                      ? Math.round((challengeResultsRef.current.filter(r => r).length / challengeResultsRef.current.length) * 100)
                      : 100}%
                  </div>
                </div>
                <div className="bg-blue-900/30 border border-blue-800 rounded-2xl p-4 text-center col-span-2">
                  <div className="text-sm text-blue-400 mb-2">{language === 'zh' ? '总分' : 'Total Score'}</div>
                  <div className="text-5xl font-black text-white">{score}</div>
                </div>
                <div className="bg-gray-700/50 rounded-2xl p-4 text-center col-span-2">
                  <div className="flex items-center justify-center gap-2 text-gray-400 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{language === 'zh' ? '总耗时' : 'Total Time'}</span>
                  </div>
                  <div className="text-2xl font-black text-white">{formatTime(elapsedTime)}</div>
                </div>
              </div>

              {/* Ranking Placeholder */}
              <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-800 rounded-2xl p-4 mb-6 text-center">
                <div className="text-sm text-purple-400 mb-1">
                  {language === 'zh' ? '全网排名' : 'Global Ranking'}
                </div>
                <div className="text-lg font-bold text-purple-300">
                  {language === 'zh' ? '即将上线...' : 'Coming Soon...'}
                </div>
              </div>

              {/* Exit Button */}
              <button
                onClick={handleExitTraining}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02]"
              >
                {language === 'zh' ? '按空格或回车退出' : 'Press Space or Enter to Exit'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-[0_8px_16px_rgba(37,99,235,0.2)] flex items-end justify-center gap-[3px] p-2.5 overflow-hidden">
            <div className="w-1 h-1/3 bg-white/40 rounded-full"></div>
            <div className="w-1 h-full bg-white rounded-full"></div>
            <div className="w-1 h-1/2 bg-white/70 rounded-full"></div>
          </div>
          <span className="text-xl font-black tracking-tighter">CardEcho <span className="text-blue-500">CHALLENGE</span></span>
        </div>
        
        <button 
          onClick={() => {
            // 保存退出时的挑战记录
            const completionPercent = challenges.length > 0 
              ? Math.round(((currentIndex + 1) / challenges.length) * 100)
              : 0;
            const accuracy = totalAttemptsRef.current > 0 
              ? Math.round((correctAttemptsRef.current / totalAttemptsRef.current) * 100) 
              : 0;
            
            cloudService.saveChallengeRecord(userId, {
              cardId: card.id,
              deckId: deck.id,
              totalChallenges: challenges.length,
              completedChallenges: currentIndex + 1,
              score: score,
              accuracy: accuracy,
              timeSpent: elapsedTime,
              completionPercent: completionPercent
            }).catch(err => console.error('Failed to save exit challenge record:', err));
            
            onExit();
          }}
          className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all group"
        >
          <X className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
        {/* Timer - Right Side */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
          <Clock className="w-6 h-6 text-blue-500" />
          <div className="text-4xl font-black text-white tabular-nums tracking-wider">
            {formatTime(elapsedTime)}
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {language === 'zh' ? '时间' : 'Time'}
          </div>
        </div>
        {/* Progress bar */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl px-8">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / challenges.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm font-bold text-gray-500 uppercase tracking-wider">
            <span>{language === 'zh' ? '挑战' : 'Challenge'} {currentIndex + 1} / {challenges.length}</span>
            <span>{currentChallenge?.type} {language === 'zh' ? '模式' : 'mode'}</span>
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
              <p className="text-blue-500 font-black uppercase tracking-[0.3em] text-xs mb-4">{language === 'zh' ? '听力挑战' : 'Listening Challenge'}</p>
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
                  <div className={`text-4xl md:text-6xl font-bold px-2 text-center transition-all duration-300 min-h-[5.5rem] md:min-h-[7.5rem] flex items-center justify-center ${
                    status === 'wrong' && wrongWordIndex !== null && i === wrongWordIndex ? 'text-red-500' :
                    status === 'correct' ? 'text-green-400' :
                    i === activeWordIndex ? 'text-blue-500' : 'text-white'
                  }`}>
                    {userWords[i] || ''}
                    {i === activeWordIndex && status === 'idle' && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="inline-block w-0.5 h-10 md:h-14 bg-blue-500 ml-1 align-middle flex-shrink-0"
                      />
                    )}
                  </div>
                  <div className={`w-full h-1.5 mt-2 transition-all duration-300 ${
                    status === 'wrong' && wrongWordIndex !== null && i === wrongWordIndex ? 'bg-red-600 h-2.5' :
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
                  {streakBonus > 0
                    ? `${language === 'zh' ? '完美!' : 'Perfect!'} +${streakBonus}`
                    : (language === 'zh' ? '完美!' : 'Perfect!')}
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
                  setShowHint(true);
                  hasUsedHintRef.current = true;
                }}
                className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                title={language === 'zh' ? '提示' : 'Hint'}
              >
                <Lightbulb className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Widgets / Info */}
      <div className="p-8 space-y-4">
        {/* Tips Banner */}
        <motion.div
          key={currentTipIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-2 flex items-center justify-center gap-2"
        >
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-gray-300">
            {tips[currentTipIndex]}
          </span>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-8 px-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-gray-500">
              <Trophy className="w-4 h-4" />
              <span className="text-base font-bold uppercase tracking-wider">{language === 'zh' ? '总分' : 'Total Score'}</span>
            </div>
            <div className="text-3xl font-black tabular-nums">{score}</div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-gray-500">
              <Flame className="w-4 h-4" />
              <span className="text-base font-bold uppercase tracking-wider">{language === 'zh' ? '连击' : 'Combo Streak'}</span>
            </div>
            <div className="text-3xl font-black text-orange-500 tabular-nums">{streak}</div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-gray-500">
              <Target className="w-4 h-4" />
              <span className="text-base font-bold uppercase tracking-wider">{language === 'zh' ? '准确率' : 'Accuracy'}</span>
            </div>
            <div className="text-3xl font-black tabular-nums">
              {challengeResultsRef.current.length > 0
                ? Math.round((challengeResultsRef.current.filter(r => r).length / challengeResultsRef.current.length) * 100)
                : 100}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengeMode;
