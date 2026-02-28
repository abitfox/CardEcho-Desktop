
import { AIProvider, AIModel, VoiceProvider, Deck, Card } from '../types';
import * as gemini from './geminiService';
import * as doubao from './doubaoService';
import { debugService } from './debugService';

// DeepSeek API Configuration
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

async function callDeepSeek(model: string, systemPrompt: string, userPrompt: string, responseFormat?: 'json_object') {
  const apiKey = 'sk-5743718c28e740eaaae6c9bd69e68029';
  if (!apiKey) {
    throw new Error("DeepSeek API Key is not configured.");
  }

  debugService.log(`Requesting DeepSeek (${model})...`, 'ai', { systemPrompt, userPrompt });

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: responseFormat ? { type: responseFormat } : undefined,
      stream: false
    })
  });

  if (!response.ok) {
    const err = await response.json();
    debugService.log(`DeepSeek API Error: ${err.error?.message}`, 'error', err);
    throw new Error(err.error?.message || "DeepSeek API Error");
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  debugService.log(`DeepSeek Response Received.`, 'ai', content);
  return content;
}

export const generateEnglishMaterial = async (prompt: string, provider: AIProvider, model: AIModel): Promise<string | null> => {
  debugService.log(`Generating English material via ${provider}...`, 'info', prompt);
  if (provider === 'google') {
    return gemini.generateEnglishMaterial(prompt, model);
  } else {
    return callDeepSeek(
      model,
      "You are an English language curriculum designer. Write a natural, educational English text under 300 words. Provide ONLY the English text.",
      `Instruction: ${prompt}`
    );
  }
};

export const analyzeSentence = async (sentence: string, provider: AIProvider, model: AIModel) => {
  debugService.log(`Analyzing sentence via ${provider}...`, 'info', sentence);
  if (provider === 'google') {
    return gemini.analyzeSentence(sentence, model);
  } else {
    const systemPrompt = `You are a professional language tutor for Chinese learners. Analyze the English sentence. Return JSON with fields: breakdown (array of {word, phonetic, meaning, role}), grammarNote (string), context (string). The 'meaning', 'role', 'grammarNote', and 'context' fields MUST be in CHINESE. Keep the 'word' field as English word and 'phonetic' as standard IPA.`;
    const resText = await callDeepSeek(model, systemPrompt, `Sentence to analyze: "${sentence}"`, 'json_object');
    return JSON.parse(resText || "{}");
  }
};

export const disassembleText = async (rawText: string, provider: AIProvider, model: AIModel) => {
  debugService.log(`Disassembling text via ${provider}...`, 'info', rawText.slice(0, 50) + '...');
  if (provider === 'google') {
    return gemini.disassembleText(rawText, model);
  } else {
    const systemPrompt = `You are a meticulous language teacher. Disassemble English text into a learning deck JSON. 
    Fields:
    - title: (String)
    - description: (String)
    - icon: (String Emoji)
    - cards: Array of {
        text: (ORIGINAL English sentence),
        translation: (Chinese),
        grammarNote: (Chinese),
        context: (Chinese),
        repeatCount: (Integer 3-5),
        breakdown: Array of {word, phonetic, meaning, role (all values except word in Chinese)}
      }
     Suggest a repeatCount (3-5) based on complexity.`;
    const resText = await callDeepSeek(model, systemPrompt, `Text to disassemble: "${rawText}"`, 'json_object');
    return JSON.parse(resText || "{}");
  }
};

export const generateTrainingContent = async (sentence: string, provider: AIProvider, model: AIModel) => {
  debugService.log(`Generating training content via ${provider}...`, 'info', sentence);
  const systemPrompt = `You are a professional language tutor. Analyze the English sentence and extract 3-5 key training points (words, phrases, or the full sentence). 
  Return JSON with a field 'trainingContent' which is an array of objects.
  Each object MUST have:
  - point: (English word, phrase, or sentence)
  - meaning: (Chinese translation)
  - phonetic: (Standard IPA for words/phrases, or empty for sentences)
  - role: (Part of speech in Chinese, e.g., 名词, 动词, 短语, 句子)
  
  The last item should always be the full sentence itself.`;

  if (provider === 'google') {
    return gemini.generateTrainingContent(sentence, model, systemPrompt);
  } else {
    const resText = await callDeepSeek(model, systemPrompt, `Sentence: "${sentence}"`, 'json_object');
    return JSON.parse(resText || "{\"trainingContent\":[]}");
  }
};

export const generateTrainingChallenges = async (card: Card, model: AIModel = 'deepseek-chat') => {
  const systemPrompt = `You are an English language coach. Given an English sentence, identify 2-3 key words or phrases that are most important for a learner to master. 
  Return a JSON object with a field 'challenges' which is an array of objects.
  Each object in 'challenges' should have:
  - type: 'word' | 'phrase' | 'sentence'
  - content: the English text to be tested
  - translation: Chinese translation of the content
  
  The challenges should be ordered: first the words/phrases, then finally the full sentence.
  Example input: "No mercy, no retreat, victory is ours."
  Example output: {
    "challenges": [
      { "type": "word", "content": "mercy", "translation": "仁慈" },
      { "type": "word", "content": "retreat", "translation": "撤退" },
      { "type": "word", "content": "victory", "translation": "胜利" },
      { "type": "sentence", "content": "No mercy, no retreat, victory is ours.", "translation": "不留情面，不准撤退，胜利属于我们。" }
    ]
  }`;
  
  const resText = await callDeepSeek(model, systemPrompt, `Sentence: "${card.text}"`, 'json_object');
  return JSON.parse(resText || "{\"challenges\":[]}");
};

// --- TTS 路由逻辑 ---
// 修改此处：默认提供商改为 'doubao'
export const generateAudio = async (text: string, voiceName: string, provider: VoiceProvider = 'doubao', speed: number = 1.0) => {
  if (provider === 'doubao') {
    return doubao.generateAudio(text, voiceName, speed);
  }
  return gemini.generateAudio(text, voiceName);
};

export const playAudio = gemini.playAudio;
export const stopAllAudio = gemini.stopAllAudio;
