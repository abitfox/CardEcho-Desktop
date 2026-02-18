
import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Access global lamejs (loaded via script tag in index.html)
const getLamejs = () => (window as any).lamejs;

// Internal audio state
let activeSource: AudioBufferSourceNode | null = null;
let activeContext: AudioContext | null = null;
let activeAudioElement: HTMLAudioElement | null = null;

const decodeBase64 = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const encodeBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && error?.status === 429) {
      console.warn(`Rate limit reached. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

const pcmToMp3 = (pcmData: Int16Array, sampleRate: number = 24000): Uint8Array => {
  const lame = getLamejs();
  if (!lame) {
    throw new Error("Lamejs library not loaded");
  }

  const mp3encoder = new lame.Mp3Encoder(1, sampleRate, 64);
  const mp3Data: Uint8Array[] = [];
  const sampleBlockSize = 576; 
  for (let i = 0; i < pcmData.length; i += sampleBlockSize) {
    const sampleChunk = pcmData.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(new Uint8Array(mp3buf));
  }
  const totalLength = mp3Data.reduce((acc, curr) => acc + curr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of mp3Data) {
    result.set(buf, offset);
    offset += buf.length;
  }
  return result;
};

export const stopAllAudio = () => {
  if (activeSource) {
    activeSource.stop();
    activeSource = null;
  }
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement = null;
  }
};

export const playAudio = async (url: string, playbackRate: number = 1.0) => {
  if (!url || url === '#') return;
  stopAllAudio();

  if (url.startsWith('http') || url.startsWith('data:audio/')) {
    activeAudioElement = new Audio(url);
    activeAudioElement.playbackRate = playbackRate;
    await activeAudioElement.play();
    return new Promise((resolve) => {
      activeAudioElement!.onended = resolve;
    });
  }

  const base64Content = url.includes(',') ? url.split(',')[1] : url;
  try {
    if (!activeContext) {
      activeContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (activeContext.state === 'suspended') await activeContext.resume();

    const bytes = decodeBase64(base64Content);
    const dataInt16 = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
    const buffer = activeContext.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    
    const source = activeContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    source.connect(activeContext.destination);
    source.start();
    activeSource = source;

    return new Promise((resolve) => {
      source.onended = resolve;
    });
  } catch (error) {
    console.error("Playback failed:", error);
  }
};

export const generateEnglishMaterial = async (prompt: string, model: string = 'gemini-3-flash-preview'): Promise<string | null> => {
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: `Instruction: ${prompt}` }] }],
      config: {
        systemInstruction: "You are an English language curriculum designer. Write a natural, educational English text under 300 words. Provide ONLY the English text.",
      }
    });
    return response.text || null;
  });
};

export const analyzeSentence = async (sentence: string, model: string = 'gemini-3-flash-preview') => {
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: `Sentence to analyze: "${sentence}"` }] }],
      config: {
        systemInstruction: "You are a professional language tutor for Chinese learners. Analyze the English sentence. The output fields 'word', 'meaning', 'role', 'grammarNote', and 'context' MUST be in CHINESE. Keep the 'word' field as English word and 'phonetic' as standard IPA.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            breakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  phonetic: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  role: { type: Type.STRING }
                },
                required: ["word", "phonetic", "meaning", "role"]
              }
            },
            grammarNote: { type: Type.STRING },
            context: { type: Type.STRING }
          },
          required: ["breakdown", "grammarNote", "context"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const disassembleText = async (rawText: string, model: string = 'gemini-3-pro-preview') => {
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: `Text to disassemble: "${rawText}"` }] }],
      config: {
        systemInstruction: "You are a meticulous language teacher. Disassemble English text into a learning deck. 1. The 'text' field MUST BE THE ORIGINAL ENGLISH SENTENCE. 2. The 'translation', 'grammarNote', and 'context' fields MUST BE IN CHINESE. 3. For 'breakdown', explain meanings and roles in CHINESE. 4. Suggest a repeatCount (3-5) based on complexity.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            icon: { type: Type.STRING },
            cards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: "The ORIGINAL English sentence" },
                  translation: { type: Type.STRING, description: "Chinese translation" },
                  grammarNote: { type: Type.STRING, description: "Grammar explanation in Chinese" },
                  context: { type: Type.STRING, description: "Usage context in Chinese" },
                  repeatCount: { type: Type.INTEGER, description: "Suggested repeat count between 3 and 5" },
                  breakdown: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        word: { type: Type.STRING, description: "The English word/phrase" },
                        phonetic: { type: Type.STRING, description: "IPA Phonetic" },
                        meaning: { type: Type.STRING, description: "Chinese meaning" },
                        role: { type: Type.STRING, description: "Grammatical role in Chinese" }
                      },
                      required: ["word", "phonetic", "meaning", "role"]
                    }
                  }
                },
                required: ["text", "translation", "grammarNote", "context", "breakdown", "repeatCount"]
              }
            }
          },
          required: ["title", "description", "icon", "cards"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const generateAudio = async (text: string, voiceName: string = 'Kore'): Promise<{ url: string, duration: number } | null> => {
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ 
        parts: [{ 
          text: `Speak this text naturally at a normal conversational speed, using authentic native-like intonation and expressive emotion: "${text}"` 
        }] 
      }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const pcmBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!pcmBase64) return null;

    const pcmBytes = decodeBase64(pcmBase64);
    const pcmInt16 = new Int16Array(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength / 2);
    const duration = pcmInt16.length / 24000;
    
    const mp3Bytes = pcmToMp3(pcmInt16, 24000);
    const mp3Base64 = encodeBase64(mp3Bytes);

    return {
      url: `data:audio/mpeg;base64,${mp3Base64}`,
      duration
    };
  });
};
