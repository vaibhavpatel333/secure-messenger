import { useEffect, useState, useCallback } from 'react';
import { Chat } from './types';
import { useWebSocket } from './hooks/useWebSocket';
import { ChatList } from './components/ChatList';
import { MessageView } from './components/MessageView';
import { ConnectionIndicator } from './components/ConnectionIndicator';
import { GlobalSearch } from './components/GlobalSearch';
import './App.css';

function App() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [wsUrl, setWsUrl] = useState<string>('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  // Load WebSocket URL
  useEffect(() => {
    window.api.getWebSocketUrl().then(setWsUrl);
  }, []);

  // Load initial chats
  const loadChats = useCallback(async (offset: number = 0) => {
    const newChats = await window.api.getChats(offset, 50);
    
    if (offset === 0) {
      // Sort initial chats by lastMessageAt descending (most recent first)
      setChats(newChats.sort((a, b) => b.lastMessageAt - a.lastMessageAt));
    } else {
      // Merge and sort when loading more
      setChats((prev) => {
        const merged = [...prev, ...newChats];
        return merged.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
      });
    }
    
    if (newChats.length < 50) {
      setHasMoreChats(false);
    }
  }, []);

  useEffect(() => {
    loadChats(0);
  }, [loadChats]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback(async (message: any) => {
    if (message.type === 'new_message') {
      const { chatId, messageId, ts, sender, body } = message;
      
      const time = new Date(ts).toLocaleTimeString();
      console.log(`[WebSocket Client] 📬 Received message at ${time}`);
      console.log(`   ├─ Chat: ${chatId} | Sender: ${sender}`);
      console.log(`   └─ Writing to database...`);
      
      // Add message to database (writes to SQLite)
      await window.api.addMessage({ chatId, ts, sender, body });
      
      console.log(`   ✅ Database updated, refreshing UI...`);
      
      // Update chat list in real-time
      setChats((prevChats) => {
        const updatedChats = prevChats.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              lastMessageAt: ts,
              // Don't increment unread count if this chat is currently selected
              unreadCount: selectedChatId === chatId ? 0 : chat.unreadCount + 1,
            };
          }
          return chat;
        });
        
        // Sort by lastMessageAt DESC (most recent first)
        return updatedChats.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
      });
    }
  }, [selectedChatId]);

  const { connectionState, reconnect } = useWebSocket({
    url: wsUrl,
    onMessage: handleWebSocketMessage,
  });

  const handleChatSelect = async (chatId: number) => {
    setSelectedChatId(chatId);
    await window.api.markChatAsRead(chatId);
    
    // Update local state
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      )
    );
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      await window.api.seedData();
      // Reset state before loading
      setHasMoreChats(true);
      await loadChats(0);
      alert('Database seeded successfully!');
    } catch (error) {
      console.error('[App] Failed to seed data');
      alert('Failed to seed data. Check console for details.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSimulateDisconnect = async () => {
    await window.api.simulateDisconnect();
  };

  const handleLoadMoreChats = () => {
    loadChats(chats.length);
  };

  const handleOpenGlobalSearch = () => {
    setShowGlobalSearch(true);
  };

  const handleCloseGlobalSearch = () => {
    setShowGlobalSearch(false);
  };

  const handleSelectMessageFromGlobalSearch = (chatId: number) => {
    setSelectedChatId(chatId);
    handleChatSelect(chatId);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Secure Messenger Desktop</h1>
        <div className="header-actions">
          <button
            onClick={handleOpenGlobalSearch}
            className="global-search-trigger"
            title="Search all chats (Ctrl+K)"
          >
            🔍 Global Search
          </button>
          <button
            onClick={handleSeedData}
            disabled={isSeeding}
            className="seed-button"
          >
            {isSeeding ? 'Seeding...' : 'Seed Data'}
          </button>
          <button
            onClick={handleSimulateDisconnect}
            className="disconnect-button"
          >
            Simulate Disconnect
          </button>
          <ConnectionIndicator state={connectionState} onReconnect={reconnect} />
        </div>
      </header>
      
      <div className="app-content">
        <div className="chat-list-container">
          <ChatList
            chats={chats}
            selectedChatId={selectedChatId}
            onChatSelect={handleChatSelect}
            onLoadMore={handleLoadMoreChats}
            hasMore={hasMoreChats}
          />
        </div>
        
        <div className="message-view-container">
          {selectedChatId ? (
            <MessageView chatId={selectedChatId} />
          ) : (
            <div className="no-chat-selected">
              <p>Select a chat to view messages</p>
            </div>
          )}
        </div>
      </div>

      {showGlobalSearch && (
        <GlobalSearch
          onClose={handleCloseGlobalSearch}
          onSelectMessage={handleSelectMessageFromGlobalSearch}
        />
      )}
    </div>
  );
}

export default App;

