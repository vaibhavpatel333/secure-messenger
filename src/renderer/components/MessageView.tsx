import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Message } from '../types';

interface MessageViewProps {
  chatId: number;
}

interface MessageGroup {
  date: string;
  dateLabel: string;
  messages: Message[];
}

export function MessageView({ chatId }: MessageViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadMessages = useCallback(async (offset: number = 0) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      const newMessages = await window.api.getMessages(chatId, offset, 50);
      
      if (offset === 0) {
        setMessages(newMessages.reverse());
      } else {
        setMessages((prev) => [...newMessages.reverse(), ...prev]);
      }
      
      if (newMessages.length < 50) {
        setHasMoreMessages(false);
      }
    } finally {
      loadingRef.current = false;
    }
  }, [chatId]);

  useEffect(() => {
    setMessages([]);
    setSearchResults([]);
    setSearchQuery('');
    setIsSearching(false);
    setHasMoreMessages(true);
    loadMessages(0);
  }, [chatId, loadMessages]);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const results = await window.api.searchMessages(chatId, searchQuery);
    setSearchResults(results.reverse());
  };

  const handleLoadOlder = () => {
    loadMessages(messages.length);
  };

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getDateLabel = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if same day as today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    // Check if yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    // Check if this week
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    if (date > weekAgo) {
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
    // Older - show full date
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
    });
  };

  const displayMessages = isSearching ? searchResults : messages;

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: MessageGroup[] = [];
    let currentGroup: MessageGroup | null = null;

    displayMessages.forEach((message) => {
      const messageDate = new Date(message.ts).toDateString();
      const dateLabel = getDateLabel(message.ts);

      if (!currentGroup || currentGroup.date !== messageDate) {
        currentGroup = {
          date: messageDate,
          dateLabel: dateLabel,
          messages: [message],
        };
        groups.push(currentGroup);
      } else {
        currentGroup.messages.push(message);
      }
    });

    return groups;
  }, [displayMessages]);

  return (
    <div className="message-view">
      <div className="message-view-header">
        <h2>Chat #{chatId}</h2>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="search-input"
          />
          <button onClick={handleSearch} className="search-button">
            Search
          </button>
          {isSearching && (
            <button
              onClick={() => {
                setIsSearching(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="clear-search-button"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="messages-container">
        {!isSearching && hasMoreMessages && (
          <button onClick={handleLoadOlder} className="load-older-button">
            Load Older Messages
          </button>
        )}

        {displayMessages.length === 0 ? (
          <div className="no-messages">
            {isSearching ? 'No messages found' : 'No messages yet'}
          </div>
        ) : (
          <div className="messages-list">
            {groupedMessages.map((group, groupIndex) => (
              <div key={group.date} className="message-date-group">
                <div className="message-date-separator">
                  <span className="message-date-label">{group.dateLabel}</span>
                </div>
                {group.messages.map((message) => (
                  <div key={message.id} className="message-item">
                    <div className="message-header">
                      <span className="message-sender">{message.sender}</span>
                      <span className="message-time">
                        {formatMessageTime(message.ts)}
                      </span>
                    </div>
                    <div className="message-body">{message.body}</div>
                  </div>
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}

