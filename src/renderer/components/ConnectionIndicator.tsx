import { ConnectionState } from '../types';

interface ConnectionIndicatorProps {
  state: ConnectionState;
  onReconnect: () => void;
}

export function ConnectionIndicator({ state, onReconnect }: ConnectionIndicatorProps) {
  const getStatusColor = () => {
    switch (state) {
      case 'connected':
        return '#22c55e';
      case 'reconnecting':
        return '#f59e0b';
      case 'offline':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (state) {
      case 'connected':
        return 'Connected';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="connection-indicator">
      <div
        className="status-dot"
        style={{ backgroundColor: getStatusColor() }}
      />
      <span className="status-text">{getStatusText()}</span>
      {state === 'offline' && (
        <button onClick={onReconnect} className="reconnect-button">
          Retry
        </button>
      )}
    </div>
  );
}

