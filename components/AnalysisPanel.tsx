
import React from 'react';
import { Card, Language } from '../types';
import { t } from '../services/i18n';

interface AnalysisPanelProps {
  card: Card | null;
  language: Language;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ card, language }) => {
  if (!card) return (
    <div className="w-96 bg-white border-l border-gray-200 p-8 flex items-center justify-center text-gray-400 italic text-center">
      {t(language, 'learning.selectCard')}
    </div>
  );

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
            {card.grammarNote || 'No grammar notes available.'}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t(language, 'learning.context')}</h3>
          <p className="text-sm text-gray-600 leading-relaxed italic">
            "{card.context || 'No context available.'}"
          </p>
        </section>
      </div>

      <div className="p-6 bg-[#f8f9fa] border-t border-gray-100">
        <button className="w-full bg-white border border-gray-200 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center gap-2">
          <span>❤️</span> {t(language, 'learning.addReview')}
        </button>
      </div>
    </div>
  );
};

export default AnalysisPanel;
