import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Database operations
  getChats: (offset: number, limit: number) => 
    ipcRenderer.invoke('db:getChats', offset, limit),
  
  getMessages: (chatId: number, offset: number, limit: number) => 
    ipcRenderer.invoke('db:getMessages', chatId, offset, limit),
  
  searchMessages: (chatId: number, query: string) => 
    ipcRenderer.invoke('db:searchMessages', chatId, query),
  
  searchMessagesGlobal: (query: string) => 
    ipcRenderer.invoke('db:searchMessagesGlobal', query),
  
  markChatAsRead: (chatId: number) => 
    ipcRenderer.invoke('db:markChatAsRead', chatId),
  
  seedData: () => 
    ipcRenderer.invoke('db:seedData'),
  
  addMessage: (message: any) => 
    ipcRenderer.invoke('db:addMessage', message),
  
  // WebSocket operations
  getWebSocketUrl: () => 
    ipcRenderer.invoke('ws:getServerUrl'),
  
  simulateDisconnect: () => 
    ipcRenderer.invoke('ws:simulateDisconnect'),
});

