import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { Database } from './database';
import { WebSocketServer } from './websocket-server';

let mainWindow: BrowserWindow | null = null;
let database: Database | null = null;
let wsServer: WebSocketServer | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    // Use VITE_DEV_SERVER_URL environment variable if set, otherwise default to 3000
    const url = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
    mainWindow.loadURL(url);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Initialize database
  const dbPath = path.join(app.getPath('userData'), 'messenger.db');
  database = new Database(dbPath);

  // Initialize WebSocket server
  wsServer = new WebSocketServer(8080);
  wsServer.start();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    wsServer?.stop();
    database?.close();
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('db:getChats', async (_, offset: number, limit: number) => {
  return database?.getChats(offset, limit) || [];
});

ipcMain.handle('db:getMessages', async (_, chatId: number, offset: number, limit: number) => {
  return database?.getMessages(chatId, offset, limit) || [];
});

ipcMain.handle('db:searchMessages', async (_, chatId: number, query: string) => {
  return database?.searchMessages(chatId, query) || [];
});

ipcMain.handle('db:searchMessagesGlobal', async (_, query: string) => {
  return database?.searchMessagesGlobal(query) || [];
});

ipcMain.handle('db:markChatAsRead', async (_, chatId: number) => {
  return database?.markChatAsRead(chatId);
});

ipcMain.handle('db:seedData', async () => {
  return database?.seedData();
});

ipcMain.handle('db:addMessage', async (_, message: any) => {
  return database?.addMessage(message);
});

ipcMain.handle('ws:getServerUrl', async () => {
  return 'ws://localhost:8080';
});

ipcMain.handle('ws:simulateDisconnect', async () => {
  wsServer?.simulateDisconnect();
});

