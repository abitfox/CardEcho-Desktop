
import { debugService } from './debugService';

// 生产环境 API 基础地址
const BASE_URL = 'https://app.cardecho.cn';
const DOUBAO_DOWNLOAD_URL = `${BASE_URL}/api/tts/download`;

/**
 * 豆包语音合成服务 (V1.1.0)
 * 增加了全流程调试日志输出
 */
export const generateAudio = async (
  text: string, 
  voiceName: string = 'en_female_lauren_moon_bigtts',
  speed: number = 1.0
): Promise<{ url: string, duration: number } | null> => {
  if (!text.trim()) return null;

  // 1. 请求初始化日志
  debugService.log(`[Doubao Step 1] Initiating Proxy Request...`, 'ai', { text, voiceName, speed });

  try {
    // 2. 调用 Proxy 接口
    const response = await fetch(DOUBAO_DOWNLOAD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        voiceName: voiceName,
        speed: speed
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      debugService.log(`[Doubao Error] Proxy Status ${response.status}`, 'error', errorText);
      throw new Error(`Doubao API Error [${response.status}]: ${errorText}`);
    }

    const result = await response.json();
    
    // 3. Proxy 响应日志
    debugService.log(`[Doubao Step 2] Proxy JSON Response`, 'ai', result);

    if (result.success) {
      // 4. 下载地址日志
      // 按照用户要求，只按照绝对地址拼接: https://app.cardecho.cn/audio/ + fileName
      const fullDownloadUrl = `https://app.cardecho.cn/audio/${result.fileName}`;
      
      debugService.log(`[Doubao Step 3] Full Download URL Constructed`, 'info', fullDownloadUrl);
      
      // 5. 获取二进制音频数据 (增加重试机制，防止服务器文件写入延迟)
      debugService.log(`[Doubao Step 4] Fetching audio binary from CDN...`, 'info');
      
      let audioResponse: Response | null = null;
      let retries = 3;
      
      while (retries > 0) {
        try {
          audioResponse = await fetch(fullDownloadUrl, {
            method: 'GET',
            referrerPolicy: 'no-referrer', // 绕过某些防盗链限制
            cache: 'no-cache'
          });
          if (audioResponse.ok) break;
          debugService.log(`[Doubao Retry] Fetch status ${audioResponse.status} for ${fullDownloadUrl}`, 'warn');
        } catch (e) {
          debugService.log(`[Doubao Retry] Fetch exception for ${fullDownloadUrl}`, 'warn', String(e));
        }
        
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // 兜底逻辑：如果绝对地址 Fetch 失败，尝试使用 API 路径 (downloadUrl)
      // API 路径通常配置了更好的 CORS 跨域支持，在预览环境中成功率更高
      if ((!audioResponse || !audioResponse.ok) && result.downloadUrl) {
        const fallbackUrl = result.downloadUrl.startsWith('http') 
          ? result.downloadUrl 
          : `https://app.cardecho.cn${result.downloadUrl.startsWith('/') ? '' : '/'}${result.downloadUrl}`;
        
        debugService.log(`[Doubao Fallback] Attempting fallback to API path: ${fallbackUrl}`, 'warn');
        try {
          audioResponse = await fetch(fallbackUrl, { referrerPolicy: 'no-referrer' });
        } catch (e) {
          debugService.log(`[Doubao Fallback Error] Fallback fetch failed`, 'error', String(e));
        }
      }
      
      if (!audioResponse || !audioResponse.ok) {
        debugService.log(`[Doubao Error] All fetch attempts failed. Please check CORS settings on app.cardecho.cn`, 'error');
        throw new Error("Failed to download generated audio from proxy");
      }
      
      const blob = await audioResponse.blob();
      
      // 6. 二进制结果日志
      debugService.log(`[Doubao Step 5] Audio binary received`, 'ai', { 
        size: blob.size, 
        type: blob.type 
      });
      
      // 优先使用接口返回的时长，否则进行估算 (基于返回的 size 字节数，24000Hz MP3 约 8KB/s)
      const duration = result.data?.duration || (result.data?.size || blob.size) / 8000;

      // 7. 返回文件名和时长，不再转换为 Base64，由播放端拼接地址
      debugService.log(`[Doubao Step 6] Returning filename for storage`, 'info', { fileName: result.fileName });
      return {
        url: result.fileName, // 仅存文件名
        duration: duration > 0 ? duration : 2.5
      };

    } else {
      debugService.log(`[Doubao Error] Success is false or missing downloadUrl`, 'error', result);
      throw new Error(result.error || "Unknown TTS error");
    }

  } catch (err) {
    debugService.log(`[Doubao Global Catch] Exception occurred`, 'error', String(err));
    return null;
  }
};
