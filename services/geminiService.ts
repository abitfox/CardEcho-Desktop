
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

/**
 * Encodes raw PCM (Int16) data to MP3 using global lamejs
 */
const pcmToMp3 = (pcmData: Int16Array, sampleRate: number = 24000): Uint8Array => {
  const lame = getLamejs();
  if (!lame) {
    throw new Error("Lamejs library not loaded");
  }

  // Mono (1), SampleRate, Bitrate (64kbps)
  const mp3encoder = new lame.Mp3Encoder(1, sampleRate, 64);
  const mp3Data: Uint8Array[] = [];
  
  // Use recommended sample block size
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

  // Standard play for MP3/WAV/AAC URLs
  if (url.startsWith('http') || url.startsWith('data:audio/')) {
    activeAudioElement = new Audio(url);
    activeAudioElement.playbackRate = playbackRate;
    await activeAudioElement.play();
    return new Promise((resolve) => {
      activeAudioElement!.onended = resolve;
    });
  }

  // Fallback for raw PCM (legacy)
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

export const generateEnglishMaterial = async (prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [{ parts: [{ text: `Instruction: ${prompt}` }] }],
      config: {
        systemInstruction: "You are an English language curriculum designer. Based on the user's Chinese instructions, write a coherent, natural, and educational English text (story, article, or dialogue). The length must be under 300 words. Provide ONLY the English text without any intro or outro.",
      }
    });
    return response.text || null;
  } catch (error) {
    console.error("Material generation failed:", error);
    return null;
  }
};

export const analyzeSentence = async (sentence: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: `Sentence to analyze: "${sentence}"` }] }],
      config: {
        systemInstruction: "You are a professional language tutor. Analyze sentences and provide structured feedback for learners in CHINESE. All meanings, grammar notes, and context explanations must be in Chinese.",
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
                  meaning: { type: Type.STRING, description: "Meaning of the word in Chinese" },
                  role: { type: Type.STRING, description: "Grammatical role in Chinese (e.g., 名词, 动词)" }
                },
                required: ["word", "phonetic", "meaning", "role"]
              }
            },
            grammarNote: { type: Type.STRING, description: "Detailed grammar explanation in Chinese" },
            context: { type: Type.STRING, description: "Usage context or cultural nuance in Chinese" }
          },
          required: ["breakdown", "grammarNote", "context"],
          propertyOrdering: ["breakdown", "grammarNote", "context"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return null;
  }
};

export const disassembleText = async (rawText: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [{ parts: [{ text: `Text to disassemble: "${rawText}"` }] }],
      config: {
        systemInstruction: "You are a meticulous language teacher. Your task is to transform the provided text into a comprehensive learning deck. CRITICAL REQUIREMENT: You must process the ENTIRE input text. Do NOT summarize, skip, or omit any sentences or meaningful segments. Every single sentence from the original text must be represented as an individual card in the 'cards' array. Ensure the cards follow the original chronological flow of the text. All translations, meanings, grammar notes, and descriptions MUST be in CHINESE.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Title of the deck in Chinese" },
            description: { type: Type.STRING, description: "Brief description in Chinese" },
            icon: { type: Type.STRING, description: "A relevant emoji icon" },
            cards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: "The original foreign language text" },
                  translation: { type: Type.STRING, description: "The Chinese translation of the sentence" },
                  grammarNote: { type: Type.STRING, description: "Grammar point explanation in Chinese" },
                  context: { type: Type.STRING, description: "Contextual explanation in Chinese" },
                  breakdown: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        word: { type: Type.STRING },
                        phonetic: { type: Type.STRING },
                        meaning: { type: Type.STRING, description: "Word meaning in Chinese" },
                        role: { type: Type.STRING, description: "Part of speech in Chinese" }
                      },
                      required: ["word", "phonetic", "meaning", "role"]
                    }
                  }
                },
                required: ["text", "translation", "grammarNote", "context", "breakdown"]
              }
            }
          },
          required: ["title", "description", "icon", "cards"],
          propertyOrdering: ["title", "description", "icon", "cards"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Disassembly failed:", error);
    return null;
  }
};

export const generateAudio = async (text: string, voiceName: string = 'Kore'): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
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
    // Gemini output is usually 16-bit PCM at 24kHz
    const pcmInt16 = new Int16Array(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength / 2);
    
    // Encode to MP3 using global lamejs
    const mp3Bytes = pcmToMp3(pcmInt16, 24000);
    const mp3Base64 = encodeBase64(mp3Bytes);

    return `data:audio/mpeg;base64,${mp3Base64}`;
  } catch (error) {
    console.error("Audio generation failed:", error);
    return null;
  }
};
