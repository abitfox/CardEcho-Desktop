
import React from 'react';
import { Language } from '../types';
import { t } from '../services/i18n';

interface StatisticsProps {
  studiedCardIds: Set<string>;
  allTimeCount: number;
  dailyGoal: number;
  streak: number;
  language: Language;
}

// Fixed: Adding named export 'Statistics' to resolve import error in App.tsx
export const Statistics: React.FC<StatisticsProps> = ({ studiedCardIds, allTimeCount, dailyGoal, streak, language }) => {
  const todayCount = studiedCardIds.size;
  const progressPercent = Math.min(100, Math.round((todayCount / dailyGoal) * 100));
  
  // 环形进度条常量
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  // 模拟估算学习时长（每张卡片平均 30 秒学习时间）
  const estimatedTimeMinutes = Math.round((allTimeCount * 30) / 60);

  const statsCards = [
    {
      label: language === 'zh' ? '累计学习卡片' : 'All-time Cards',
      value: allTimeCount,
      unit: language === 'zh' ? '张' : 'cards',
      icon: '🗂️',
      color: 'blue'
    },
    {
      label: language === 'zh' ? '预计学习时长' : 'Study Time',
      value: estimatedTimeMinutes,
      unit: language === 'zh' ? '分钟' : 'mins',
      icon: '⏱️',
      color: 'purple'
    },
    {
      label: language === 'zh' ? '连续达标天数' : 'Current Streak',
      value: streak,
      unit: language === 'zh' ? '天' : 'days',
      icon: '🔥',
      color: 'orange'
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9fa] custom-scrollbar p-12">
      <div className="max-w-6xl mx-auto space-y-10">
        <header>
          <h1 className="text-4xl font-black text-gray-900 mb-2">{t(language, 'sidebar.stats')}</h1>
          <p className="text-gray-500 font-medium">
            {language === 'zh' ? '量化你的每一步成长。' : 'Quantify every step of your progress.'}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Today's Focus Card */}
          <div className="lg:col-span-2 bg-white rounded-[40px] p-10 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
             
             {/* Circular Progress */}
             <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r={radius}
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-100"
                  />
                  <circle
                    cx="50" cy="50" r={radius}
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (circumference * progressPercent) / 100}
                    strokeLinecap="round"
                    className="text-blue-600 transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-black text-gray-900">{progressPercent}%</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{language === 'zh' ? '今日完成' : 'TODAY'}</span>
                </div>
             </div>

             <div className="flex-1 space-y-6 relative z-10 text-center md:text-left">
                <div>
                   <h2 className="text-2xl font-bold text-gray-900 mb-2">
                     {progressPercent >= 100 
                       ? (language === 'zh' ? '今日目标已达成！🎉' : 'Goal Achieved! 🎉') 
                       : (language === 'zh' ? '继续加油！💪' : 'Keep going! 💪')}
                   </h2>
                   <p className="text-gray-500 text-sm leading-relaxed">
                     {language === 'zh' 
                       ? `你今天已经完整复读了 ${todayCount} 条核心句型。距离每日目标 (${dailyGoal}) 还有 ${Math.max(0, dailyGoal - todayCount)} 张。`
                       : `You've mastered ${todayCount} sentences today. ${Math.max(0, dailyGoal - todayCount)} more to hit your daily goal of ${dailyGoal}.`}
                   </p>
                </div>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                   <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
                      <span className="block text-[10px] font-bold text-blue-400 uppercase">{language === 'zh' ? '已学卡片' : 'COMPLETED'}</span>
                      <span className="text-xl font-black text-blue-600">{todayCount}</span>
                   </div>
                   <div className="bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase">{language === 'zh' ? '待学卡片' : 'REMAINING'}</span>
                      <span className="text-xl font-black text-gray-600">{Math.max(0, dailyGoal - todayCount)}</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Streak Card */}
          <div className="bg-orange-600 rounded-[40px] p-10 text-white shadow-xl shadow-orange-100 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10">
               <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-6">🔥</div>
               <h3 className="text-xl font-bold mb-1">{language === 'zh' ? '学习冲刺中' : 'On Fire!'}</h3>
               <p className="text-orange-100 text-xs font-medium">
                 {language === 'zh' ? '连续达标天数' : 'Consecutive daily goals'}
               </p>
            </div>
            <div className="relative z-10 mt-8">
               <span className="text-6xl font-black tracking-tighter">{streak}</span>
               <span className="text-xl font-bold ml-2">{language === 'zh' ? '天' : 'DAYS'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {statsCards.map((card, i) => (
            <div key={i} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
               <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-lg">{card.icon}</div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{card.label}</span>
               </div>
               <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900">{card.value}</span>
                  <span className="text-sm font-bold text-gray-400">{card.unit}</span>
               </div>
            </div>
          ))}
        </div>

        {/* Evaluation Section */}
        <section className="bg-slate-900 rounded-[40px] p-12 text-white relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full -mr-48 -mb-48 blur-[100px]"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
               <div className="inline-flex items-center gap-2 bg-blue-500/20 px-3 py-1 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 border border-blue-500/30">
                  <span className="animate-pulse">●</span> AI Learning Insights
               </div>
               <h2 className="text-3xl font-bold mb-4">
                 {todayCount === 0 
                   ? (language === 'zh' ? '新的一天，开启你的语言引擎' : 'A fresh start for your engine')
                   : (language === 'zh' ? '深度学习正在发生' : 'Deep learning in progress')}
               </h2>
               <p className="text-gray-400 text-sm leading-relaxed">
                 {language === 'zh' 
                   ? '根据你的近期表现，你在商务英语和口语流利度上有显著提升。建议今天尝试更具挑战性的“硅谷俚语”资源包来拓宽边界。' 
                   : 'Based on recent data, your fluency in Business English is improving. Try pushing your boundaries with more informal tech jargon today.'}
               </p>
            </div>
            <button 
              onClick={() => window.location.hash = '#library'} // 模拟跳转
              className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black hover:bg-blue-50 transition-all shadow-xl active:scale-95 whitespace-nowrap"
            >
              {language === 'zh' ? '进入资源库' : 'GO TO LIBRARY'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Statistics;
