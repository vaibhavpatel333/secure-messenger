export interface Chat {
  id: number;
  title: string;
  lastMessageAt: number;
  unreadCount: number;
}

export interface Message {
  id: number;
  chatId: number;
  ts: number;
  sender: string;
  body: string;
  chatTitle?: string;
}

export type ConnectionState = 'connected' | 'reconnecting' | 'offline';

export interface ElectronAPI {
  getChats: (offset: number, limit: number) => Promise<Chat[]>;
  getMessages: (chatId: number, offset: number, limit: number) => Promise<Message[]>;
  searchMessages: (chatId: number, query: string) => Promise<Message[]>;
  searchMessagesGlobal: (query: string) => Promise<Message[]>;
  markChatAsRead: (chatId: number) => Promise<void>;
  seedData: () => Promise<void>;
  addMessage: (message: Omit<Message, 'id'>) => Promise<number>;
  getWebSocketUrl: () => Promise<string>;
  simulateDisconnect: () => Promise<void>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}

