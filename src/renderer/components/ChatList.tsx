import { useMemo } from 'react';
import { Chat } from '../types';

interface ChatListProps {
  chats: Chat[];
  selectedChatId: number | null;
  onChatSelect: (chatId: number) => void;
  onLoadMore: () => void;
  hasMore: boolean;
}

type DateCategory = 'today' | 'yesterday' | 'this-week' | 'older';

interface GroupedChats {
  category: DateCategory;
  label: string;
  chats: Chat[];
}

export function ChatList({
  chats,
  selectedChatId,
  onChatSelect,
  onLoadMore,
  hasMore,
}: ChatListProps) {
  const getDateCategory = (timestamp: number): DateCategory => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffInDays = diffMs / (1000 * 60 * 60 * 24);

    // Today - same date
    if (date.toDateString() === now.toDateString()) {
      return 'today';
    }
    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'yesterday';
    }
    // This week (last 7 days)
    if (diffInDays < 7) {
      return 'this-week';
    }
    // Older
    return 'older';
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const category = getDateCategory(timestamp);

    if (category === 'today') {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } else if (category === 'yesterday') {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } else if (category === 'this-week') {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const groupedChats = useMemo(() => {
    const groups: GroupedChats[] = [];
    const categoryMap: Record<DateCategory, GroupedChats> = {
      'today': { category: 'today', label: 'Today', chats: [] },
      'yesterday': { category: 'yesterday', label: 'Yesterday', chats: [] },
      'this-week': { category: 'this-week', label: 'This Week', chats: [] },
      'older': { category: 'older', label: 'Older', chats: [] },
    };

    chats.forEach((chat) => {
      const category = getDateCategory(chat.lastMessageAt);
      categoryMap[category].chats.push(chat);
    });

    // Only include categories that have chats
    const order: DateCategory[] = ['today', 'yesterday', 'this-week', 'older'];
    order.forEach((cat) => {
      if (categoryMap[cat].chats.length > 0) {
        groups.push(categoryMap[cat]);
      }
    });

    return groups;
  }, [chats]);

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <h2>Chats</h2>
        <span className="chat-count">{chats.length}</span>
      </div>
      
      <div className="chat-list-scrollable">
        {groupedChats.map((group) => (
          <div key={group.category} className="chat-group">
            <div className="chat-group-header">{group.label}</div>
            {group.chats.map((chat) => (
              <div
                key={chat.id}
                className={`chat-item ${selectedChatId === chat.id ? 'selected' : ''}`}
                onClick={() => onChatSelect(chat.id)}
              >
                <div className="chat-item-content">
                  <div className="chat-item-header">
                    <span className="chat-title">{chat.title}</span>
                    <span className="chat-time">{formatTime(chat.lastMessageAt)}</span>
                  </div>
                  <div className="chat-item-footer">
                    <span className="chat-preview">Last message...</span>
                    {chat.unreadCount > 0 && (
                      <span className="unread-badge">{chat.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        
        {hasMore && (
          <button onClick={onLoadMore} className="load-more-button">
            Load More Chats
          </button>
        )}
      </div>
    </div>
  );
}

