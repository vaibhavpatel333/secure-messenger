"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('api', {
    // Database operations
    getChats: (offset, limit) => electron_1.ipcRenderer.invoke('db:getChats', offset, limit),
    getMessages: (chatId, offset, limit) => electron_1.ipcRenderer.invoke('db:getMessages', chatId, offset, limit),
    searchMessages: (chatId, query) => electron_1.ipcRenderer.invoke('db:searchMessages', chatId, query),
    searchMessagesGlobal: (query) => electron_1.ipcRenderer.invoke('db:searchMessagesGlobal', query),
    markChatAsRead: (chatId) => electron_1.ipcRenderer.invoke('db:markChatAsRead', chatId),
    seedData: () => electron_1.ipcRenderer.invoke('db:seedData'),
    addMessage: (message) => electron_1.ipcRenderer.invoke('db:addMessage', message),
    // WebSocket operations
    getWebSocketUrl: () => electron_1.ipcRenderer.invoke('ws:getServerUrl'),
    simulateDisconnect: () => electron_1.ipcRenderer.invoke('ws:simulateDisconnect'),
});
