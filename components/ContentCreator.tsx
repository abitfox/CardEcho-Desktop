
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
  const [aiProgress, setAiProgress] = useState('');
  const [aiProgressDetails, setAiProgressDetails] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
    setAiProgress('🤖 AI正在分析文本...');
    setAiProgressDetails('正在连接DeepSeek API');
    
    // 记录开始时间
    const startTime = Date.now();
    let lastUpdateTime = startTime;
    let receivedChunks = 0;
    let lastProgressText = '';
    
    try {
      // 使用流式输出模式，显示实时进度
      const result = await disassembleText(text, provider, selectedModel, { 
        onProgress: (progressText) => {
          receivedChunks++;
          const currentTime = Date.now();
          
          // 更新主进度
          setAiProgress(`📊 AI正在生成内容... (${receivedChunks} 个数据块)`);
          
          // 每300ms更新一次详细信息，避免过于频繁的渲染
          if (currentTime - lastUpdateTime > 300 || progressText !== lastProgressText) {
            setAiProgressDetails(progressText);
            lastUpdateTime = currentTime;
            lastProgressText = progressText;
          }
        }
      });
      
      if (result) {
        const timestamp = Date.now();
        const processingTime = Math.round((timestamp - startTime) / 1000);
        
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
        setAiProgress(`✅ 生成完成！`);
        setAiProgressDetails(`耗时 ${processingTime} 秒，生成 ${result.cards?.length || 0} 张卡片`);
        
        // 延迟清除进度信息
        setTimeout(() => {
          setAiProgress('');
          setAiProgressDetails('');
        }, 3000);
      }
    } catch (err: any) {
      console.error('Disassembly error:', err);
      setAiProgress(`❌ 生成失败`);
      setAiProgressDetails(`错误: ${err.message}`);
      
      // 延迟显示错误信息
      setTimeout(() => {
        alert(err.message || "内容生成失败，请重试或缩短文本长度。");
        setAiProgress('');
        setAiProgressDetails('');
      }, 500);
    } finally {
      setIsProcessing(false);
    }
  };



  const handleConfirmSave = async () => {
    if (!previewDeck || isSaving) return;
    
    setIsSaving(true);
    
    try {
      const finalDeck: Deck = {
        id: crypto.randomUUID(),
        title: previewDeck.title || 'Untitled Deck',
        description: previewDeck.description || '',
        icon: previewDeck.icon || '📝',
        sourceText: previewDeck.sourceText || '',
        cards: (previewDeck.cards || []) as Card[],
        createdAt: Date.now()
      };
      
      // 先显示保存中
      await onSave(finalDeck);
      
      // 保存成功，显示成功状态
      setSaveSuccess(true);
      
      // 短暂显示成功动画后跳转
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      console.error('Save error:', error);
      alert('保存失败，请重试');
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full">
        <div className="mb-12 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">
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
              {selectedModel.replace('-preview', '').replace('-', ' ').toUpperCase()} ACTIVE
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
                className="w-full h-[540px] p-8 rounded-2xl border border-gray-200 bg-slate-50/30 focus:bg-white focus:border-blue-400 outline-none transition-all text-sm leading-relaxed text-gray-600 resize-none shadow-sm z-10 custom-scrollbar"
                disabled={isProcessing}
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-md rounded-2xl z-20 flex flex-col items-center justify-center space-y-6 p-8">
                  {/* 动画效果 */}
                  <div className="relative mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    
                    {/* 外围脉冲效果 */}
                    <div className="absolute inset-0 w-16 h-16 border-2 border-blue-300/50 rounded-2xl animate-ping"></div>
                  </div>
                  
                  {/* 主标题 */}
                  <div className="text-center">
                    {/* 进度信息 - 替换固定标题，避免重复显示 */}
                    {aiProgress ? (
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-700">{aiProgress}</span>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        </div>
                        {aiProgressDetails && (
                          <p className="text-xs text-blue-600 font-medium truncate mt-1">
                            {aiProgressDetails}
                          </p>
                        )}
                      </div>
                    ) : (
                      /* 固定标题 - 当没有进度时显示 */
                      <h3 className="font-bold text-gray-800 text-xl mb-2">
                        {containsChinese(inputText) ? 
                          (language === 'zh' ? '🤖 AI正在创作英文素材' : '🤖 AI Crafting Material') : 
                          (language === 'zh' ? '🤖 AI正在分析文本' : '🤖 AI Analyzing Text')
                        }
                      </h3>
                    )}
                    
                    {/* 技术标签 */}
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium">
                        {language === 'zh' ? '流式生成' : 'Streaming'}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500 font-medium">{provider.toUpperCase()}</span>
                    </div>
                    
                    {/* 重要提示 */}
                    <div className="mt-4 px-4 py-2 bg-amber-50 border border-amber-100 rounded-lg">
                      <p className="text-xs text-amber-700 font-medium">
                        ⚠️ {language === 'zh' ? '请不要离开此页面，否则生成将被打断' : 'Please do not leave this page, otherwise generation will be interrupted'}
                      </p>
                    </div>
                  </div>
                  
                  {/* 底部进度条 */}
                  <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300" 
                      style={{ 
                        width: '30%',
                        animation: 'pulse 2s ease-in-out infinite'
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3 text-gray-400">
                 <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center text-xs">💡</div>
                 <p className="text-xs text-gray-400 font-medium">{language === 'zh' ? '中文输入将触发"素材创作"模式。' : 'Chinese input triggers "Material Creation" mode.'}</p>
                 {!containsChinese(inputText) && inputText.trim() && (
                   <span className={`text-xs font-medium ml-2 ${inputText.length > 1000 ? 'text-red-500' : 'text-blue-500'}`}>
                     {inputText.length}/1000 {language === 'zh' ? '字符' : 'chars'}
                     {inputText.length > 1000 && ` (${language === 'zh' ? '超出限制' : 'exceeded'})`}
                   </span>
                 )}
              </div>
              <div className="flex items-center gap-4">
                <button onClick={onCancel} className="px-6 py-2.5 text-gray-400 text-xs font-bold hover:text-gray-600 transition-all">{t(language, 'create.cancel')}</button>
                <button
                  onClick={handleInitialAction}
                  disabled={!inputText.trim() || isProcessing || (!containsChinese(inputText) && inputText.length > 1000)}
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
            <div className="relative group">
              <textarea
                value={generatedMaterial}
                onChange={(e) => setGeneratedMaterial(e.target.value)}
                className="w-full h-[540px] p-8 rounded-2xl border-2 border-blue-100 bg-white focus:border-blue-400 outline-none transition-all text-sm leading-relaxed text-gray-700 resize-none shadow-xl shadow-blue-50/50 z-10 custom-scrollbar"
                disabled={isProcessing}
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-md rounded-2xl z-20 flex flex-col items-center justify-center space-y-6 p-8">
                  <div className="relative mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <div className="absolute inset-0 w-16 h-16 border-2 border-blue-300/50 rounded-2xl animate-ping"></div>
                  </div>
                  <div className="text-center">
                    {aiProgress ? (
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-700">{aiProgress}</span>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        </div>
                        {aiProgressDetails && (
                          <p className="text-xs text-blue-600 font-medium truncate mt-1">
                            {aiProgressDetails}
                          </p>
                        )}
                      </div>
                    ) : (
                      <h3 className="font-bold text-gray-800 text-xl mb-2">
                        {language === 'zh' ? '🤖 AI正在拆解素材' : '🤖 AI Disassembling Material'}
                      </h3>
                    )}
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium">
                        {language === 'zh' ? '流式生成' : 'Streaming'}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500 font-medium">{provider.toUpperCase()}</span>
                    </div>
                    <div className="mt-4 px-4 py-2 bg-amber-50 border border-amber-100 rounded-lg">
                      <p className="text-xs text-amber-700 font-medium">
                        ⚠️ {language === 'zh' ? '请不要离开此页面，否则生成将被打断' : 'Please do not leave this page, otherwise generation will be interrupted'}
                      </p>
                    </div>
                  </div>
                  <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300" 
                      style={{ width: '30%', animation: 'pulse 2s ease-in-out infinite' }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
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
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            {/* 保存中/成功 全屏遮罩 */}
            {(isSaving || saveSuccess) && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-md rounded-2xl z-30 flex flex-col items-center justify-center">
                {saveSuccess ? (
                  /* 成功状态 */
                  <div className="flex flex-col items-center animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {language === 'zh' ? '✅ 添加成功！' : '✅ Added Successfully!'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {language === 'zh' ? '正在跳转到卡库...' : 'Redirecting to library...'}
                    </p>
                  </div>
                ) : (
                  /* 保存中状态 */
                  <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                      <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                      <div className="absolute inset-0 w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {language === 'zh' ? '正在保存到云端...' : 'Saving to cloud...'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {language === 'zh' ? '请稍候' : 'Please wait'}
                    </p>
                  </div>
                )}
              </div>
            )}
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
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">Card List Preview</h3>
                <div className="text-xs text-gray-400">
                  {previewDeck.cards?.filter(c => c.breakdown).length || 0}/{previewDeck.cards?.length || 0} cards with breakdown
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {previewDeck.cards?.map((card: any, i: number) => (
                  <div key={card.id} className="p-6 bg-white border border-gray-100 rounded-2xl hover:border-blue-100 transition-all flex flex-col">
                    <p className="text-sm font-bold text-gray-800 leading-snug">{card.text}</p>
                    <p className="text-xs text-gray-400 italic mb-3">{card.translation}</p>
                    
                    {card.breakdown && (
                      <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700">
                        ✅ 已生成词汇分析 ({card.breakdown.length} 个单词)
                      </div>
                    )}
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
                <button 
                  onClick={handleConfirmSave}
                  disabled={isSaving}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {language === 'zh' ? '保存中...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                      {t(language, 'create.confirm')}
                    </>
                  )}
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
