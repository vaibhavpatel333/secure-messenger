"use strict";
/**
 * Database Integration Tests
 *
 * Note: These tests require better-sqlite3 (a native module) to be compiled for Node.js.
 * By default, better-sqlite3 is compiled for Electron.
 *
 * To run these tests:
 *   npm run test:all
 *
 * This will rebuild better-sqlite3 for Node.js and run all tests including these.
 * Regular unit tests (npm test) exclude this file for faster execution.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const database_1 = require("./database");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
(0, vitest_1.describe)('Database', () => {
    let db;
    const testDbPath = path_1.default.join(__dirname, '../../test-messenger.db');
    (0, vitest_1.beforeEach)(() => {
        // Remove test database if it exists
        if (fs_1.default.existsSync(testDbPath)) {
            fs_1.default.unlinkSync(testDbPath);
        }
        db = new database_1.Database(testDbPath);
    });
    (0, vitest_1.afterEach)(() => {
        db.close();
        // Clean up test database
        if (fs_1.default.existsSync(testDbPath)) {
            fs_1.default.unlinkSync(testDbPath);
        }
    });
    (0, vitest_1.describe)('getChats', () => {
        (0, vitest_1.it)('should return empty array when no chats exist', () => {
            const chats = db.getChats(0, 50);
            (0, vitest_1.expect)(chats).toEqual([]);
        });
        (0, vitest_1.it)('should return chats sorted by lastMessageAt DESC', () => {
            // Seed some test data
            db.seedData();
            const chats = db.getChats(0, 5);
            (0, vitest_1.expect)(chats).toHaveLength(5);
            // Verify sorting: each chat should have lastMessageAt >= next chat
            for (let i = 0; i < chats.length - 1; i++) {
                (0, vitest_1.expect)(chats[i].lastMessageAt).toBeGreaterThanOrEqual(chats[i + 1].lastMessageAt);
            }
        });
        (0, vitest_1.it)('should respect pagination limits', () => {
            db.seedData();
            const firstPage = db.getChats(0, 10);
            const secondPage = db.getChats(10, 10);
            (0, vitest_1.expect)(firstPage).toHaveLength(10);
            (0, vitest_1.expect)(secondPage).toHaveLength(10);
            // Ensure pages are different
            (0, vitest_1.expect)(firstPage[0].id).not.toBe(secondPage[0].id);
        });
    });
    (0, vitest_1.describe)('getMessages', () => {
        (0, vitest_1.it)('should return empty array when chat has no messages', () => {
            const messages = db.getMessages(999, 0, 50);
            (0, vitest_1.expect)(messages).toEqual([]);
        });
        (0, vitest_1.it)('should return messages for specific chat sorted by timestamp DESC', () => {
            db.seedData();
            const messages = db.getMessages(1, 0, 50);
            (0, vitest_1.expect)(messages.length).toBeGreaterThan(0);
            // Verify all messages belong to the same chat
            messages.forEach(msg => {
                (0, vitest_1.expect)(msg.chatId).toBe(1);
            });
            // Verify sorting: messages ordered by timestamp DESC
            for (let i = 0; i < messages.length - 1; i++) {
                (0, vitest_1.expect)(messages[i].ts).toBeGreaterThanOrEqual(messages[i + 1].ts);
            }
        });
        (0, vitest_1.it)('should respect pagination for messages', () => {
            db.seedData();
            const firstPage = db.getMessages(1, 0, 10);
            const secondPage = db.getMessages(1, 10, 10);
            if (firstPage.length === 10) {
                (0, vitest_1.expect)(secondPage.length).toBeGreaterThan(0);
                // Verify pages are different
                (0, vitest_1.expect)(firstPage[0].id).not.toBe(secondPage[0].id);
            }
        });
    });
    (0, vitest_1.describe)('searchMessages', () => {
        (0, vitest_1.it)('should find messages containing search query', () => {
            db.seedData();
            // Search for a common word
            const results = db.searchMessages(1, 'the');
            // Verify all results contain the search term
            results.forEach(msg => {
                (0, vitest_1.expect)(msg.body.toLowerCase()).toContain('the');
            });
        });
        (0, vitest_1.it)('should limit search results to 50', () => {
            db.seedData();
            const results = db.searchMessages(1, 'a'); // Very common letter
            (0, vitest_1.expect)(results.length).toBeLessThanOrEqual(50);
        });
        (0, vitest_1.it)('should return empty array when no matches found', () => {
            db.seedData();
            const results = db.searchMessages(1, 'xyzabc123notfound');
            (0, vitest_1.expect)(results).toEqual([]);
        });
    });
    (0, vitest_1.describe)('searchMessagesGlobal', () => {
        (0, vitest_1.it)('should find messages containing search query in body', () => {
            db.seedData();
            const results = db.searchMessagesGlobal('about'); // "What do you think about this?"
            (0, vitest_1.expect)(results.length).toBeGreaterThan(0);
            results.forEach(msg => {
                const inBody = msg.body.toLowerCase().includes('about');
                const isSender = msg.sender.toLowerCase().includes('about');
                (0, vitest_1.expect)(inBody || isSender).toBe(true);
            });
        });
        (0, vitest_1.it)('should find messages matching sender name', () => {
            db.seedData();
            // 'Alice' is one of the seeded senders
            const results = db.searchMessagesGlobal('Alice');
            (0, vitest_1.expect)(results.length).toBeGreaterThan(0);
            // Every result should either have 'Alice' in body OR be sent by 'Alice'
            results.forEach(msg => {
                const inBody = msg.body.toLowerCase().includes('alice');
                const isSender = msg.sender.toLowerCase().includes('alice');
                (0, vitest_1.expect)(inBody || isSender).toBe(true);
            });
        });
        (0, vitest_1.it)('should find messages matching chat title', () => {
            db.seedData();
            // Get a random chat to search for
            const chats = db.getChats(0, 10);
            const targetChat = chats[0];
            // Search for the chat title
            const results = db.searchMessagesGlobal(targetChat.title);
            (0, vitest_1.expect)(results.length).toBeGreaterThan(0);
            // Verify that at least some results belong to the target chat
            const resultsFromTargetChat = results.filter(msg => msg.chatId === targetChat.id);
            (0, vitest_1.expect)(resultsFromTargetChat.length).toBeGreaterThan(0);
            // Verify chatTitle is populated
            (0, vitest_1.expect)(results[0].chatTitle).toBeDefined();
        });
    });
    (0, vitest_1.describe)('markChatAsRead', () => {
        (0, vitest_1.it)('should set unreadCount to 0', () => {
            db.seedData();
            const chatsBefore = db.getChats(0, 1);
            const initialUnread = chatsBefore[0].unreadCount;
            db.markChatAsRead(chatsBefore[0].id);
            const chatsAfter = db.getChats(0, 1);
            (0, vitest_1.expect)(chatsAfter[0].unreadCount).toBe(0);
            // Verify it was changed if it wasn't already 0
            if (initialUnread > 0) {
                (0, vitest_1.expect)(chatsAfter[0].unreadCount).not.toBe(initialUnread);
            }
        });
    });
    (0, vitest_1.describe)('addMessage', () => {
        (0, vitest_1.it)('should add a message and update chat lastMessageAt', () => {
            db.seedData();
            const testMessage = {
                chatId: 1,
                ts: Date.now(),
                sender: 'TestUser',
                body: 'Test message content',
            };
            const messageId = db.addMessage(testMessage);
            (0, vitest_1.expect)(messageId).toBeGreaterThan(0);
            // Verify message was added
            const messages = db.getMessages(1, 0, 1);
            (0, vitest_1.expect)(messages[0].sender).toBe('TestUser');
            // Verify chat was updated
            const chats = db.getChats(0, 200);
            const updatedChat = chats.find(c => c.id === 1);
            (0, vitest_1.expect)(updatedChat?.lastMessageAt).toBe(testMessage.ts);
        });
        (0, vitest_1.it)('should increment unreadCount when adding message', () => {
            db.seedData();
            const chat = db.getChats(0, 1)[0];
            db.markChatAsRead(chat.id);
            const chatAfterRead = db.getChats(0, 1)[0];
            (0, vitest_1.expect)(chatAfterRead.unreadCount).toBe(0);
            db.addMessage({
                chatId: chat.id,
                ts: Date.now(),
                sender: 'TestUser',
                body: 'New message',
            });
            const chatAfterMessage = db.getChats(0, 1)[0];
            (0, vitest_1.expect)(chatAfterMessage.unreadCount).toBe(1);
        });
    });
    (0, vitest_1.describe)('seedData', () => {
        (0, vitest_1.it)('should create 200 chats', () => {
            db.seedData();
            const allChats = db.getChats(0, 250);
            (0, vitest_1.expect)(allChats.length).toBe(200);
        });
        (0, vitest_1.it)('should create at least 20,000 messages', () => {
            db.seedData();
            // Count messages across all chats
            const chats = db.getChats(0, 200);
            let totalMessages = 0;
            chats.forEach(chat => {
                const messages = db.getMessages(chat.id, 0, 10000);
                totalMessages += messages.length;
            });
            (0, vitest_1.expect)(totalMessages).toBeGreaterThanOrEqual(20000);
        });
        (0, vitest_1.it)('should not seed data twice', () => {
            db.seedData();
            db.seedData(); // Call again
            const chats = db.getChats(0, 250);
            (0, vitest_1.expect)(chats.length).toBe(200); // Should still be 200, not 400
        });
    });
});
