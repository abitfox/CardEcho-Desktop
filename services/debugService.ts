
export type LogLevel = 'info' | 'warn' | 'error' | 'ai';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

let logs: LogEntry[] = [];
const listeners: ((logs: LogEntry[]) => void)[] = [];

export const debugService = {
  log: (message: string, level: LogLevel = 'info', data?: any) => {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      level,
      message,
      data
    };
    logs = [entry, ...logs].slice(0, 150); // 保留最近150条
    listeners.forEach(l => l(logs));
    
    // 同时输出到控制台方便查看对象
    const styles = {
      ai: 'color: #3b82f6; font-weight: bold;',
      error: 'color: #ef4444; font-weight: bold;',
      warn: 'color: #f59e0b; font-weight: bold;',
      info: 'color: #6b7280; font-weight: bold;'
    };
    console.log(`%c[${entry.level.toUpperCase()}] %c${message}`, styles[level], 'color: inherit', data || '');
  },

  subscribe: (callback: (logs: LogEntry[]) => void) => {
    listeners.push(callback);
    callback(logs);
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx > -1) listeners.splice(idx, 1);
    };
  },

  clear: () => {
    logs = [];
    listeners.forEach(l => l(logs));
  }
};
