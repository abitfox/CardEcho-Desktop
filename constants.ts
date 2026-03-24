
import { Deck } from './types';

export const MOCK_LIBRARY_DECKS: Deck[] = [
  {
    id: 'deck-1',
    title: 'Daily Business English',
    description: 'Master professional communication in an office environment.',
    icon: '💼',
    createdAt: Date.now(),
    cards: [
      {
        id: 'c1',
        text: "I'd like to circle back to the point you made earlier about the budget allocation.",
        translation: "我想回到你之前提到的关于预算分配的那一点。",
        audioUrl: "#",
        context: "Commonly used in meetings to return to a previous topic.",
        grammarNote: "Phrasal verb 'circle back' means to revisit or return to a subject later.",
        // Fix: Add repeatCount to meet Card interface requirements
        repeatCount: 3,
        breakdown: [
          { word: "circle back", phonetic: "/ˈsɜːrkl bæk/", meaning: "回到", role: "Phrasal Verb" },
          { word: "budget", phonetic: "/ˈbʌdʒɪt/", meaning: "预算", role: "Noun" },
          { word: "allocation", phonetic: "/ˌæləˈkeɪʃn/", meaning: "分配", role: "Noun" }
        ]
      },
      {
        id: 'c2',
        text: "We need to ensure all stakeholders are aligned before the product launch.",
        translation: "我们需要确保在产品发布前所有利益相关者达成共识。",
        audioUrl: "#",
        context: "Project management context.",
        grammarNote: "'Aligned' implies being in agreement or having the same understanding.",
        // Fix: Add repeatCount to meet Card interface requirements
        repeatCount: 3,
        breakdown: [
          { word: "stakeholders", phonetic: "/ˈsteɪkhoʊldərz/", meaning: "利益相关者", role: "Noun" },
          { word: "aligned", phonetic: "/əˈlaɪnd/", meaning: "达成一致", role: "Adjective" }
        ]
      }
    ]
  }
];

export const MOCK_STORE_DECKS: Deck[] = [
  {
    id: 'store-1',
    title: 'Modern Philosophy 101',
    description: 'Explore existentialism and critical thinking through short, impactful quotes.',
    icon: '🗿',
    createdAt: Date.now(),
    author: 'Academy Echo',
    cards: [
      {
        id: 's1-c1',
        text: "I think, therefore I am.",
        translation: "我思故我在。",
        audioUrl: "#",
        context: "The fundamental element of Western philosophy by René Descartes.",
        grammarNote: "'Therefore' is a conjunctive adverb used to indicate a logical result.",
        // Fix: Add repeatCount to meet Card interface requirements
        repeatCount: 3,
        breakdown: [
          { word: "therefore", phonetic: "/ˈðerfɔːr/", meaning: "因此", role: "Adverb" },
          { word: "exist", phonetic: "/ɪɡˈzɪst/", meaning: "存在", role: "Verb" }
        ]
      }
    ]
  },
  {
    id: 'store-2',
    title: 'Silicon Valley Slang',
    description: 'Master the technical jargon and casual slang used in tech startups.',
    icon: '🚀',
    createdAt: Date.now(),
    author: 'TechGuru',
    cards: [
      {
        id: 's2-c1',
        text: "We need to pivot our strategy to achieve product-market fit.",
        translation: "我们需要调整战略以实现产品与市场的契合。",
        audioUrl: "#",
        context: "Commonly used when a startup changes its business direction.",
        grammarNote: "'Pivot' in a business context means to change direction significantly.",
        // Fix: Add repeatCount to meet Card interface requirements
        repeatCount: 3,
        breakdown: [
          { word: "pivot", phonetic: "/ˈpɪvət/", meaning: "转向/支点", role: "Verb" },
          { word: "fit", phonetic: "/fɪt/", meaning: "契合/合适", role: "Noun" }
        ]
      }
    ]
  },
  {
    id: 'store-3',
    title: 'Gourmet French Terms',
    description: 'The definitive guide to culinary terms for aspiring chefs and foodies.',
    icon: '🍳',
    createdAt: Date.now(),
    author: 'Le Cordon Bleu',
    cards: [
      {
        id: 's3-c1',
        text: "Mise en place is essential for a smooth kitchen operation.",
        translation: "‘一切就绪’（准备工作）对厨房的顺利运转至关重要。",
        audioUrl: "#",
        context: "A professional cooking term for gathering and prepping ingredients.",
        grammarNote: "This is a French loanword used widely in professional English kitchens.",
        // Fix: Add repeatCount to meet Card interface requirements
        repeatCount: 3,
        breakdown: [
          { word: "essential", phonetic: "/ɪˈsenʃl/", meaning: "必要的", role: "Adjective" },
          { word: "operation", phonetic: "/ˌɒpəˈreɪʃn/", meaning: "运转/操作", role: "Noun" }
        ]
      }
    ]
  }
];
