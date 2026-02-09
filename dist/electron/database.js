"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const security_service_1 = require("./security-service");
class Database {
    constructor(dbPath) {
        this.db = new better_sqlite3_1.default(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.initialize();
    }
    initialize() {
        // Create tables
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        lastMessageAt INTEGER NOT NULL,
        unreadCount INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chatId INTEGER NOT NULL,
        ts INTEGER NOT NULL,
        sender TEXT NOT NULL,
        body TEXT NOT NULL,
        FOREIGN KEY (chatId) REFERENCES chats(id)
      );

      CREATE INDEX IF NOT EXISTS idx_chats_lastMessageAt ON chats(lastMessageAt DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_chatId_ts ON messages(chatId, ts DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_body ON messages(body);
    `);
    }
    getChats(offset, limit) {
        const stmt = this.db.prepare(`
      SELECT id, title, lastMessageAt, unreadCount
      FROM chats
      ORDER BY lastMessageAt DESC
      LIMIT ? OFFSET ?
    `);
        return stmt.all(limit, offset);
    }
    getMessages(chatId, offset, limit) {
        const stmt = this.db.prepare(`
      SELECT id, chatId, ts, sender, body
      FROM messages
      WHERE chatId = ?
      ORDER BY ts DESC
      LIMIT ? OFFSET ?
    `);
        const messages = stmt.all(chatId, limit, offset);
        // Decrypt message bodies before returning
        // In production, this would decrypt the encrypted content
        return messages.map(msg => ({
            ...msg,
            body: security_service_1.securityService.decrypt(msg.body),
        }));
    }
    searchMessages(chatId, query) {
        // Note: In production with real encryption, search would need special handling
        // Options: 1) Client-side decryption + search, 2) Encrypted search index
        const stmt = this.db.prepare(`
      SELECT id, chatId, ts, sender, body
      FROM messages
      WHERE chatId = ? AND body LIKE ?
      ORDER BY ts DESC
      LIMIT 50
    `);
        const messages = stmt.all(chatId, `%${query}%`);
        // Decrypt message bodies before returning
        return messages.map(msg => ({
            ...msg,
            body: security_service_1.securityService.decrypt(msg.body),
        }));
    }
    searchMessagesGlobal(query) {
        // Global search across all chats
        // Note: In production with real encryption, this would require special handling
        const stmt = this.db.prepare(`
      SELECT m.id, m.chatId, m.ts, m.sender, m.body, c.title as chatTitle
      FROM messages m
      JOIN chats c ON m.chatId = c.id
      WHERE m.body LIKE ? OR m.sender LIKE ? OR c.title LIKE ?
      ORDER BY m.ts DESC
      LIMIT 100
    `);
        const searchPattern = `%${query}%`;
        const messages = stmt.all(searchPattern, searchPattern, searchPattern);
        // Decrypt message bodies before returning
        return messages.map(msg => ({
            ...msg,
            body: security_service_1.securityService.decrypt(msg.body),
        }));
    }
    markChatAsRead(chatId) {
        const stmt = this.db.prepare(`
      UPDATE chats
      SET unreadCount = 0
      WHERE id = ?
    `);
        stmt.run(chatId);
    }
    addMessage(message) {
        // Encrypt message body before storage
        // In production, this would use real encryption
        const encryptedBody = security_service_1.securityService.encrypt(message.body);
        const insertMsg = this.db.prepare(`
      INSERT INTO messages (chatId, ts, sender, body)
      VALUES (?, ?, ?, ?)
    `);
        const updateChat = this.db.prepare(`
      UPDATE chats
      SET lastMessageAt = ?, unreadCount = unreadCount + 1
      WHERE id = ?
    `);
        const transaction = this.db.transaction(() => {
            const result = insertMsg.run(message.chatId, message.ts, message.sender, encryptedBody);
            updateChat.run(message.ts, message.chatId);
            // Log sanitized version (no sensitive content)
            console.log('[Database] Message added:', security_service_1.securityService.sanitizeForLogging(message));
            return result.lastInsertRowid;
        });
        return transaction();
    }
    seedData() {
        const chatCount = this.db.prepare('SELECT COUNT(*) as count FROM chats').get();
        // Valid random name generators
        const adjectives = ['Secret', 'Project', 'Team', 'Blue', 'Red', 'Green', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Weekly', 'Monthly', 'Annual', 'Global', 'Local', 'Internal', 'External', 'Hidden', 'Top', 'Super'];
        const nouns = ['Updates', 'Sync', 'Meeting', 'Planning', 'Review', 'Standup', 'Discussion', 'Ideas', 'Chat', 'Group', 'Force', 'Squad', 'Crew', 'Lounge', 'Room', 'Channel', 'Hub', 'Space', 'Zone'];
        const people = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack', 'Kevin', 'Liam', 'Mia', 'Noah', 'Olivia', 'Paul', 'Quinn', 'Ryan', 'Sarah', 'Tom'];
        const generateRandomTitle = () => {
            if (Math.random() > 0.4) {
                const person = people[Math.floor(Math.random() * people.length)];
                let title = person;
                if (Math.random() > 0.5) {
                    title += ' ' + String.fromCharCode(65 + Math.floor(Math.random() * 26)) + '.';
                }
                return title;
            }
            else {
                const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
                const noun = nouns[Math.floor(Math.random() * nouns.length)];
                return `${adj} ${noun}`;
            }
        };
        if (chatCount.count > 0) {
            // Check if we have legacy titles like "Chat 123"
            // We use a simple GLOB check. 'Chat [0-9]*' is standard SQL glob but sqlite glob might be limited.
            // 'Chat %' matches anything starting with Chat.
            const legacyChats = this.db.prepare("SELECT id, title FROM chats WHERE title LIKE 'Chat %'").all();
            // If we have many matching "Chat X", let's update them.
            // We filter in JS to be sure we only update "Chat <number>" format if we want to be strict,
            // but "Chat %" is probably a good enough heuristic for this dev app.
            // Let's check a few to see if they look like "Chat \d+"
            const needsMigration = legacyChats.filter(c => /^Chat \d+$/.test(c.title));
            if (needsMigration.length > 0) {
                console.log(`[Database] Found ${needsMigration.length} legacy chat titles. Migrating to random names...`);
                const updateTitle = this.db.prepare('UPDATE chats SET title = ? WHERE id = ?');
                const transaction = this.db.transaction(() => {
                    for (const chat of needsMigration) {
                        updateTitle.run(generateRandomTitle(), chat.id);
                    }
                });
                transaction();
                console.log('[Database] Migration complete.');
            }
            else {
                console.log('[Database] Already seeded and up to date');
            }
            return;
        }
        console.log('[Database] Seeding database...');
        const insertChat = this.db.prepare(`
      INSERT INTO chats (title, lastMessageAt, unreadCount)
      VALUES (?, ?, ?)
    `);
        const insertMessage = this.db.prepare(`
      INSERT INTO messages (chatId, ts, sender, body)
      VALUES (?, ?, ?, ?)
    `);
        const transaction = this.db.transaction(() => {
            // Create 200 chats
            const chatIds = [];
            const now = Date.now();
            // First, create chats with placeholder timestamps
            for (let i = 1; i <= 200; i++) {
                const result = insertChat.run(generateRandomTitle(), 0, // Placeholder, will be updated
                0 // Start with 0 unread
                );
                chatIds.push(result.lastInsertRowid);
            }
            // Create 20,000 messages distributed across chats
            const senders = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
            const messageBodies = [
                'Hey, how are you?',
                'Did you see the news today?',
                'Let\'s meet up later!',
                'I\'m working on the project now.',
                'Can you send me the files?',
                'Thanks for your help!',
                'That sounds great!',
                'I\'ll be there in 5 minutes.',
                'What do you think about this?',
                'Let me know when you\'re free.',
                'Perfect! See you then.',
                'I agree with your point.',
                'This is really interesting.',
                'Could you clarify that?',
                'I\'m almost done with my part.',
                'The meeting is at 3 PM.',
                'Don\'t forget to bring the documents.',
                'I\'ll review it tonight.',
                'Looking forward to it!',
                'Thanks for the update.',
            ];
            const totalMessages = 20000;
            const baseTime = now - 7 * 24 * 60 * 60 * 1000; // 7 days ago (not 30)
            // Track last message time for each chat
            const chatLastMessageTime = new Map();
            for (let i = 0; i < totalMessages; i++) {
                const chatId = chatIds[Math.floor(Math.random() * chatIds.length)];
                const sender = senders[Math.floor(Math.random() * senders.length)];
                const body = messageBodies[Math.floor(Math.random() * messageBodies.length)];
                // Create messages with progressive timestamps
                const ts = baseTime + Math.floor((now - baseTime) * (i / totalMessages));
                insertMessage.run(chatId, ts, sender, body);
                // Track the latest message time for this chat
                const currentLastTime = chatLastMessageTime.get(chatId) || 0;
                if (ts > currentLastTime) {
                    chatLastMessageTime.set(chatId, ts);
                }
            }
            // Update each chat with its actual last message time
            const updateChatTime = this.db.prepare(`
        UPDATE chats 
        SET lastMessageAt = ?, unreadCount = ?
        WHERE id = ?
      `);
            chatIds.forEach(chatId => {
                const lastMessageAt = chatLastMessageTime.get(chatId) || now;
                const unreadCount = Math.floor(Math.random() * 10);
                updateChatTime.run(lastMessageAt, unreadCount, chatId);
            });
        });
        transaction();
        console.log('[Database] Seeded successfully: 200 chats, 20000 messages');
    }
    close() {
        this.db.close();
    }
}
exports.Database = Database;
