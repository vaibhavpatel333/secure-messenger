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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from './database';
import fs from 'fs';
import path from 'path';

describe('Database', () => {
  let db: Database;
  const testDbPath = path.join(__dirname, '../../test-messenger.db');

  beforeEach(() => {
    // Remove test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new Database(testDbPath);
  });

  afterEach(() => {
    db.close();
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('getChats', () => {
    it('should return empty array when no chats exist', () => {
      const chats = db.getChats(0, 50);
      expect(chats).toEqual([]);
    });

    it('should return chats sorted by lastMessageAt DESC', () => {
      // Seed some test data
      db.seedData();

      const chats = db.getChats(0, 5);

      expect(chats).toHaveLength(5);
      // Verify sorting: each chat should have lastMessageAt >= next chat
      for (let i = 0; i < chats.length - 1; i++) {
        expect(chats[i].lastMessageAt).toBeGreaterThanOrEqual(chats[i + 1].lastMessageAt);
      }
    });

    it('should respect pagination limits', () => {
      db.seedData();

      const firstPage = db.getChats(0, 10);
      const secondPage = db.getChats(10, 10);

      expect(firstPage).toHaveLength(10);
      expect(secondPage).toHaveLength(10);
      // Ensure pages are different
      expect(firstPage[0].id).not.toBe(secondPage[0].id);
    });
  });

  describe('getMessages', () => {
    it('should return empty array when chat has no messages', () => {
      const messages = db.getMessages(999, 0, 50);
      expect(messages).toEqual([]);
    });

    it('should return messages for specific chat sorted by timestamp DESC', () => {
      db.seedData();

      const messages = db.getMessages(1, 0, 50);

      expect(messages.length).toBeGreaterThan(0);

      // Verify all messages belong to the same chat
      messages.forEach(msg => {
        expect(msg.chatId).toBe(1);
      });

      // Verify sorting: messages ordered by timestamp DESC
      for (let i = 0; i < messages.length - 1; i++) {
        expect(messages[i].ts).toBeGreaterThanOrEqual(messages[i + 1].ts);
      }
    });

    it('should respect pagination for messages', () => {
      db.seedData();

      const firstPage = db.getMessages(1, 0, 10);
      const secondPage = db.getMessages(1, 10, 10);

      if (firstPage.length === 10) {
        expect(secondPage.length).toBeGreaterThan(0);
        // Verify pages are different
        expect(firstPage[0].id).not.toBe(secondPage[0].id);
      }
    });
  });

  describe('searchMessages', () => {
    it('should find messages containing search query', () => {
      db.seedData();

      // Search for a common word
      const results = db.searchMessages(1, 'the');

      // Verify all results contain the search term
      results.forEach(msg => {
        expect(msg.body.toLowerCase()).toContain('the');
      });
    });

    it('should limit search results to 50', () => {
      db.seedData();

      const results = db.searchMessages(1, 'a'); // Very common letter

      expect(results.length).toBeLessThanOrEqual(50);
    });

    it('should return empty array when no matches found', () => {
      db.seedData();

      const results = db.searchMessages(1, 'xyzabc123notfound');

      expect(results).toEqual([]);
    });
  });

  describe('searchMessagesGlobal', () => {
    it('should find messages containing search query in body', () => {
      db.seedData();
      const results = db.searchMessagesGlobal('about'); // "What do you think about this?"
      expect(results.length).toBeGreaterThan(0);

      results.forEach(msg => {
        const inBody = msg.body.toLowerCase().includes('about');
        const isSender = msg.sender.toLowerCase().includes('about');
        expect(inBody || isSender).toBe(true);
      });
    });

    it('should find messages matching sender name', () => {
      db.seedData();
      // 'Alice' is one of the seeded senders
      const results = db.searchMessagesGlobal('Alice');
      expect(results.length).toBeGreaterThan(0);

      // Every result should either have 'Alice' in body OR be sent by 'Alice'
      results.forEach(msg => {
        const inBody = msg.body.toLowerCase().includes('alice');
        const isSender = msg.sender.toLowerCase().includes('alice');
        expect(inBody || isSender).toBe(true);
      });
    });

    it('should find messages matching chat title', () => {
      db.seedData();

      // Get a random chat to search for
      const chats = db.getChats(0, 10);
      const targetChat = chats[0];

      // Search for the chat title
      const results = db.searchMessagesGlobal(targetChat.title);
      expect(results.length).toBeGreaterThan(0);

      // Verify that at least some results belong to the target chat
      const resultsFromTargetChat = results.filter(msg => msg.chatId === targetChat.id);
      expect(resultsFromTargetChat.length).toBeGreaterThan(0);

      // Verify chatTitle is populated
      expect(results[0].chatTitle).toBeDefined();
    });
  });

  describe('markChatAsRead', () => {
    it('should set unreadCount to 0', () => {
      db.seedData();

      const chatsBefore = db.getChats(0, 1);
      const initialUnread = chatsBefore[0].unreadCount;

      db.markChatAsRead(chatsBefore[0].id);

      const chatsAfter = db.getChats(0, 1);
      expect(chatsAfter[0].unreadCount).toBe(0);

      // Verify it was changed if it wasn't already 0
      if (initialUnread > 0) {
        expect(chatsAfter[0].unreadCount).not.toBe(initialUnread);
      }
    });
  });

  describe('addMessage', () => {
    it('should add a message and update chat lastMessageAt', () => {
      db.seedData();

      const testMessage = {
        chatId: 1,
        ts: Date.now(),
        sender: 'TestUser',
        body: 'Test message content',
      };

      const messageId = db.addMessage(testMessage);

      expect(messageId).toBeGreaterThan(0);

      // Verify message was added
      const messages = db.getMessages(1, 0, 1);
      expect(messages[0].sender).toBe('TestUser');

      // Verify chat was updated
      const chats = db.getChats(0, 200);
      const updatedChat = chats.find(c => c.id === 1);
      expect(updatedChat?.lastMessageAt).toBe(testMessage.ts);
    });

    it('should increment unreadCount when adding message', () => {
      db.seedData();

      const chat = db.getChats(0, 1)[0];
      db.markChatAsRead(chat.id);

      const chatAfterRead = db.getChats(0, 1)[0];
      expect(chatAfterRead.unreadCount).toBe(0);

      db.addMessage({
        chatId: chat.id,
        ts: Date.now(),
        sender: 'TestUser',
        body: 'New message',
      });

      const chatAfterMessage = db.getChats(0, 1)[0];
      expect(chatAfterMessage.unreadCount).toBe(1);
    });
  });

  describe('seedData', () => {
    it('should create 200 chats', () => {
      db.seedData();

      const allChats = db.getChats(0, 250);
      expect(allChats.length).toBe(200);
    });

    it('should create at least 20,000 messages', () => {
      db.seedData();

      // Count messages across all chats
      const chats = db.getChats(0, 200);
      let totalMessages = 0;

      chats.forEach(chat => {
        const messages = db.getMessages(chat.id, 0, 10000);
        totalMessages += messages.length;
      });

      expect(totalMessages).toBeGreaterThanOrEqual(20000);
    });

    it('should not seed data twice', () => {
      db.seedData();
      db.seedData(); // Call again

      const chats = db.getChats(0, 250);
      expect(chats.length).toBe(200); // Should still be 200, not 400
    });
  });
});

