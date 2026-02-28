
import React, { useState } from 'react';
import { Card, Language } from '../types';
import { t } from '../services/i18n';

interface AnalysisPanelProps {
  card: Card | null;
  language: Language;
  onToggleReview?: (cardId: string, isForReview: boolean) => Promise<void>;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ card, language, onToggleReview }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!card) return (
    <div className="w-96 bg-white border-l border-gray-200 p-8 flex items-center justify-center text-gray-400 italic text-center">
      {t(language, 'learning.selectCard')}
    </div>
  );

  const handleToggleReview = async () => {
    if (!onToggleReview || isUpdating) return;
    setIsUpdating(true);
    try {
      await onToggleReview(card.id, !card.isForReview);
    } catch (err) {
      console.error("Toggle review failed:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">{t(language, 'sidebar.learning')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t(language, 'learning.vocabulary')}</h3>
          <div className="space-y-4">
            {card.breakdown && card.breakdown.map((item, i) => (
              <div key={i} className="group p-3 rounded-xl border border-gray-50 hover:border-blue-100 hover:bg-blue-50/30 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-md font-bold text-gray-800">{item.word}</span>
                  <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{item.role}</span>
                </div>
                <div className="text-sm text-blue-600 font-mono mb-1">{item.phonetic}</div>
                <div className="text-sm text-gray-600">{item.meaning}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t(language, 'learning.grammar')}</h3>
          <div className="bg-gray-50 p-4 rounded-xl text-sm leading-relaxed text-gray-700 border-l-4 border-blue-500">
            {card.grammarNote || t(language, 'learning.noGrammar')}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t(language, 'learning.context')}</h3>
          <p className="text-sm text-gray-600 leading-relaxed italic">
            "{card.context || t(language, 'learning.noContext')}"
          </p>
        </section>
      </div>

      <div className="p-6 bg-[#f8f9fa] border-t border-gray-100 space-y-3">
        <button 
          onClick={handleToggleReview}
          disabled={isUpdating}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 border ${
            card.isForReview 
              ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' 
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          } disabled:opacity-50`}
        >
          {isUpdating ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span>{card.isForReview ? '❤️' : '🤍'}</span>
          )}
          {t(language, 'learning.addReview')}
        </button>

        {card.trainingContent && card.trainingContent.length > 0 && (
          <button 
            onClick={() => {
              // We need a way to trigger training mode from here. 
              // I'll assume App.tsx will handle a custom event or state change.
              const event = new CustomEvent('start-training', { detail: { card } });
              window.dispatchEvent(event);
            }}
            className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>🎯</span>
            {t(language, 'learning.startTraining')}
          </button>
        )}
      </div>
    </div>
  );
};

export default AnalysisPanel;
