import { useEffect, useRef, useState, useCallback } from 'react';
import { ConnectionState } from '../types';

interface WebSocketMessage {
  type: string;
  chatId?: number;
  messageId?: number;
  ts?: number;
  sender?: string;
  body?: string;
}

interface UseWebSocketProps {
  url: string;
  onMessage: (message: WebSocketMessage) => void;
}

export function useWebSocket({ url, onMessage }: UseWebSocketProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('offline');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isManualCloseRef = useRef(false);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 10000); // Send ping every 10 seconds
  }, [clearHeartbeat]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState('reconnecting');
    
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          
          // Handle pong responses
          if (message.type === 'pong') {
            // Connection is alive
            return;
          }

          // Note: Do NOT log message.body to prevent sensitive data leaks
          onMessage(message);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error instanceof Error ? error.message : 'Unknown error');
        }
      };

      ws.onerror = () => {
        console.error('[WebSocket] Connection error occurred');
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        clearHeartbeat();
        
        if (!isManualCloseRef.current) {
          setConnectionState('offline');
          
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('[WebSocket] Failed to create connection');
      setConnectionState('offline');
    }
  }, [url, onMessage, startHeartbeat, clearHeartbeat]);

  const disconnect = useCallback(() => {
    isManualCloseRef.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    clearHeartbeat();
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setConnectionState('offline');
  }, [clearHeartbeat]);

  useEffect(() => {
    isManualCloseRef.current = false;
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connectionState,
    reconnect: connect,
  };
}

