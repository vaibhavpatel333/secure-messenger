import { useState } from 'react';
import { Message } from '../types';

interface GlobalSearchProps {
  onClose: () => void;
  onSelectMessage: (chatId: number) => void;
}

export function GlobalSearch({ onClose, onSelectMessage }: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const results = await window.api.searchMessagesGlobal(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('[GlobalSearch] Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleMessageClick = (chatId: number) => {
    onSelectMessage(chatId);
    onClose();
  };

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };



  return (
    <div className="global-search-overlay" onClick={onClose}>
      <div className="global-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="global-search-header">
          <h2>Search All Chats</h2>
          <button onClick={onClose} className="close-button" aria-label="Close search">
            ✕
          </button>
        </div>

        <div className="global-search-input-container">
          <input
            type="text"
            placeholder="Search messages across all chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            className="global-search-input"
            autoFocus
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="global-search-button"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        <div className="global-search-results">
          {!hasSearched ? (
            <div className="global-search-placeholder">
              <p>Enter a search term to find messages across all chats</p>
              <p className="global-search-hint">Press Enter to search, Esc to close</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="global-search-no-results">
              <p>No messages found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="global-search-results-list">
              <p className="global-search-results-count">
                Found {searchResults.length} message{searchResults.length !== 1 ? 's' : ''}
              </p>
              {searchResults.map((message) => (
                <div
                  key={message.id}
                  className="global-search-result-item"
                  onClick={() => handleMessageClick(message.chatId)}
                >
                  <div className="global-search-result-header">
                    <span className="global-search-result-chat">
                      {message.chatTitle || `Chat ${message.chatId}`}
                    </span>
                    <span className="global-search-result-time">
                      {formatMessageTime(message.ts)}
                    </span>
                  </div>
                  <div className="global-search-result-sender">{message.sender}</div>
                  <div className="global-search-result-body">{message.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

