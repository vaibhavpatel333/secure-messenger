"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const database_1 = require("./database");
const websocket_server_1 = require("./websocket-server");
let mainWindow = null;
let database = null;
let wsServer = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    if (process.env.NODE_ENV === 'development') {
        // Use VITE_DEV_SERVER_URL environment variable if set, otherwise default to 3000
        const url = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
        mainWindow.loadURL(url);
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../renderer/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(() => {
    // Initialize database
    const dbPath = path_1.default.join(electron_1.app.getPath('userData'), 'messenger.db');
    database = new database_1.Database(dbPath);
    // Initialize WebSocket server
    wsServer = new websocket_server_1.WebSocketServer(8080);
    wsServer.start();
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        wsServer?.stop();
        database?.close();
        electron_1.app.quit();
    }
});
// IPC Handlers
electron_1.ipcMain.handle('db:getChats', async (_, offset, limit) => {
    return database?.getChats(offset, limit) || [];
});
electron_1.ipcMain.handle('db:getMessages', async (_, chatId, offset, limit) => {
    return database?.getMessages(chatId, offset, limit) || [];
});
electron_1.ipcMain.handle('db:searchMessages', async (_, chatId, query) => {
    return database?.searchMessages(chatId, query) || [];
});
electron_1.ipcMain.handle('db:searchMessagesGlobal', async (_, query) => {
    return database?.searchMessagesGlobal(query) || [];
});
electron_1.ipcMain.handle('db:markChatAsRead', async (_, chatId) => {
    return database?.markChatAsRead(chatId);
});
electron_1.ipcMain.handle('db:seedData', async () => {
    return database?.seedData();
});
electron_1.ipcMain.handle('db:addMessage', async (_, message) => {
    return database?.addMessage(message);
});
electron_1.ipcMain.handle('ws:getServerUrl', async () => {
    return 'ws://localhost:8080';
});
electron_1.ipcMain.handle('ws:simulateDisconnect', async () => {
    wsServer?.simulateDisconnect();
});
