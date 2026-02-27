
import React, { useState } from 'react';
import { disassembleText, generateEnglishMaterial } from '../services/aiService';
import { Deck, Card, Language, AIModel, AIProvider } from '../types';
import { t } from '../services/i18n';

interface ContentCreatorProps {
  onSave: (deck: Deck) => void;
  onCancel: () => void;
  language: Language;
  provider: AIProvider;
  selectedModel: AIModel;
}

type CreatorStep = 'input' | 'materialPreview' | 'deckPreview';

const ContentCreator: React.FC<ContentCreatorProps> = ({ onSave, onCancel, language, provider, selectedModel }) => {
  const [inputText, setInputText] = useState('');
  const [generatedMaterial, setGeneratedMaterial] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<CreatorStep>('input');
  const [previewDeck, setPreviewDeck] = useState<Partial<Deck> | null>(null);

  const containsChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);

  const handleInitialAction = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    try {
      if (containsChinese(inputText)) {
        const material = await generateEnglishMaterial(inputText, provider, selectedModel);
        if (material) {
          setGeneratedMaterial(material);
          setStep('materialPreview');
        }
      } else {
        await performDisassembly(inputText);
      }
    } catch (err: any) {
      alert(err.message || "Action failed. Check your API settings.");
    } finally {
      setIsProcessing(false);
    }
  };

  const performDisassembly = async (text: string) => {
    setIsProcessing(true);
    try {
      const result = await disassembleText(text, provider, selectedModel);
      if (result) {
        const timestamp = Date.now();
        setPreviewDeck({
          ...result,
          sourceText: text,
          cards: result.cards.map((c: any, i: number) => ({
            ...c,
            id: `${timestamp}-${String(i).padStart(4, '0')}`,
            audioUrl: '#'
          }))
        });
        setStep('deckPreview');
      }
    } catch (err: any) {
      alert(err.message || "Disassembly failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSave = () => {
    if (!previewDeck) return;
    const finalDeck: Deck = {
      id: crypto.randomUUID(),
      title: previewDeck.title || 'Untitled Deck',
      description: previewDeck.description || '',
      icon: previewDeck.icon || '📝',
      sourceText: previewDeck.sourceText || '',
      cards: (previewDeck.cards || []) as Card[],
      createdAt: Date.now()
    };
    onSave(finalDeck);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
      <div className="max-w-4xl mx-auto px-8 py-16 w-full">
        <div className="mb-10 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {step === 'deckPreview' ? t(language, 'create.confirm') : t(language, 'create.title')}
            </h1>
            <p className="text-sm text-gray-400 font-medium">
              {step === 'materialPreview' 
                ? (language === 'zh' ? 'AI 已为您准备好英文素材，您可以预览或微调内容。' : 'AI has prepared the English material. Preview or refine it below.')
                : t(language, 'create.desc')}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 opacity-60">
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-widest border border-blue-100">
              {provider.toUpperCase()} {selectedModel.replace('-preview', '').replace('-', ' ').toUpperCase()} ACTIVE
            </span>
          </div>
        </div>

        {step === 'input' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="relative group">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={language === 'zh' ? '粘贴英文文章，或输入中文指令（如：写一个关于商务谈判的对话）。' : 'Paste English text, or enter Chinese instructions (e.g., Write a dialogue about business negotiation).'}
                className="w-full h-[540px] p-8 rounded-2xl border border-gray-100 bg-slate-50/30 focus:bg-white focus:border-blue-400 outline-none transition-all text-sm leading-relaxed text-gray-600 resize-none shadow-sm z-10 custom-scrollbar"
                disabled={isProcessing}
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl z-20 flex flex-col items-center justify-center space-y-6">
                  <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-center">
                    <p className="font-bold text-blue-600 text-sm tracking-widest uppercase">
                      {containsChinese(inputText) ? (language === 'zh' ? '正在构思英文素材...' : 'CRAFTING MATERIAL...') : t(language, 'create.processing')}
                    </p>
                    <p className="text-gray-400 text-[10px] mt-2 font-medium uppercase tracking-widest">{provider.toUpperCase()} ENGINE</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3 text-gray-400">
                 <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center text-xs">💡</div>
                 <p className="text-xs text-gray-400 font-medium">{language === 'zh' ? '中文输入将触发“素材创作”模式。' : 'Chinese input triggers "Material Creation" mode.'}</p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={onCancel} className="px-6 py-2.5 text-gray-400 text-xs font-bold hover:text-gray-600 transition-all">{t(language, 'create.cancel')}</button>
                <button
                  onClick={handleInitialAction}
                  disabled={!inputText.trim() || isProcessing}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg disabled:opacity-50 flex items-center gap-2 active:scale-95"
                >
                  <span className="text-sm">✨</span>{t(language, 'create.generate')}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'materialPreview' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <textarea
              value={generatedMaterial}
              onChange={(e) => setGeneratedMaterial(e.target.value)}
              className="w-full h-[540px] p-8 rounded-2xl border-2 border-blue-100 bg-white focus:border-blue-400 outline-none transition-all text-sm leading-relaxed text-gray-700 resize-none shadow-xl shadow-blue-50/50 z-10 custom-scrollbar"
              disabled={isProcessing}
            />
            <div className="flex items-center justify-between pt-2">
              <button onClick={() => setStep('input')} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                {language === 'zh' ? '返回重写指令' : 'Back to Instructions'}
              </button>
              <div className="flex items-center gap-4">
                <button onClick={onCancel} className="px-6 py-2.5 text-gray-400 text-xs font-bold hover:text-gray-600 transition-all">{t(language, 'create.cancel')}</button>
                <button onClick={() => performDisassembly(generatedMaterial)} disabled={!generatedMaterial.trim() || isProcessing} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-lg disabled:opacity-50 active:scale-95 flex items-center gap-2">
                  <span className="text-sm">✂️</span>{language === 'zh' ? '确认素材并开始拆解' : 'Confirm & Start Disassemble'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'deckPreview' && previewDeck && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-50/50 border border-gray-100 rounded-[28px] p-8">
              <div className="flex items-center gap-8">
                <div className="text-5xl bg-white w-24 h-24 rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">{previewDeck.icon}</div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{previewDeck.title}</h2>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">{previewDeck.description}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">Card List Preview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {previewDeck.cards?.map((card: any, i: number) => (
                  <div key={card.id} className="p-6 bg-white border border-gray-100 rounded-2xl hover:border-blue-100 transition-all flex flex-col">
                    <p className="text-sm font-bold text-gray-800 leading-snug">{card.text}</p>
                    <p className="text-xs text-gray-400 italic mt-auto">{card.translation}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between pt-6 border-t border-gray-50">
              <button onClick={() => setStep(generatedMaterial ? 'materialPreview' : 'input')} className="px-6 py-2.5 text-gray-400 text-xs font-bold hover:text-blue-500 transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>{t(language, 'create.editRaw')}
              </button>
              <div className="flex gap-3">
                <button onClick={onCancel} className="px-6 py-2.5 text-gray-400 text-xs font-bold hover:text-gray-600 transition-all">{t(language, 'create.cancel')}</button>
                <button onClick={handleConfirmSave} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-lg active:scale-95 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>{t(language, 'create.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentCreator;
