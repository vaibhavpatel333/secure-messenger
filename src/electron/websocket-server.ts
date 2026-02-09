import { WebSocketServer as WSServer, WebSocket } from 'ws';

export class WebSocketServer {
  private wss: WSServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private messageInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private port: number;

  constructor(port: number) {
    this.port = port;
  }

  start() {
    this.wss = new WSServer({ port: this.port });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[WebSocket Server] ✅ Client connected - Total clients:', this.clients.size + 1);
      this.clients.add(ws);

      ws.on('message', (message: Buffer) => {
        const data = JSON.parse(message.toString());
        
        // Handle ping messages
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        }
      });

      ws.on('close', () => {
        console.log('[WebSocket] Client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('[WebSocket] Connection error:', error.message);
        this.clients.delete(ws);
      });
    });

    // Start sending random messages every 1-3 seconds
    this.startMessageSimulation();

    console.log(`[WebSocket] Server started on port ${this.port}`);
  }

  private startMessageSimulation() {
    let messageCount = 0;
    
    const sendRandomMessage = () => {
      const delay = 1000 + Math.random() * 2000; // Calculate delay first
      
      if (this.clients.size === 0) {
        console.log(`[WebSocket Server] ⏸️  No clients connected. Waiting ${(delay/1000).toFixed(1)}s...`);
        this.messageInterval = setTimeout(sendRandomMessage, delay);
        return;
      }

      const chatId = Math.floor(Math.random() * 200) + 1; // Random chat from 1-200
      const senders = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
      const sender = senders[Math.floor(Math.random() * senders.length)];
      
      const messageBodies = [
        'New message arrived!',
        'Check out this interesting article.',
        'I just finished the report.',
        'Can we reschedule?',
        'Great work on the presentation!',
        'I have a question about the project.',
        'Let\'s discuss this tomorrow.',
        'Thanks for your quick response!',
        'I\'m sending you the updated files.',
        'The deadline has been extended.',
        'Hey, how are you doing?',
        'Let me know if you need anything.',
        'I\'m working on the project now.',
        'Perfect! See you then.',
        'This is really interesting.',
      ];
      const body = messageBodies[Math.floor(Math.random() * messageBodies.length)];

      // Generate unique messageId using timestamp + random
      const messageId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
      const ts = Date.now();

      const message = {
        type: 'new_message',
        chatId,
        messageId,
        ts,
        sender,
        body,
      };

      // Broadcast to all connected clients
      this.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });

      messageCount++;
      const time = new Date().toLocaleTimeString();
      console.log(`[WebSocket Server] 📨 Message #${messageCount} sent at ${time}`);
      console.log(`   ├─ Chat: ${chatId} | Sender: ${sender}`);
      console.log(`   ├─ Body: "${body.substring(0, 40)}${body.length > 40 ? '...' : ''}"`);
      console.log(`   └─ Next message in: ${(delay/1000).toFixed(1)}s`);

      // Schedule next message in 1-3 seconds (random delay)
      this.messageInterval = setTimeout(sendRandomMessage, delay);
    };

    console.log('[WebSocket Server] 🚀 Starting message simulation...');
    // Start the first message immediately
    sendRandomMessage();
  }

  simulateDisconnect() {
    // Close all client connections to simulate a network failure
    this.clients.forEach((client) => {
      client.close();
    });
    this.clients.clear();
    console.log('[WebSocket] Simulated disconnect - all clients dropped');
  }

  stop() {
    if (this.messageInterval) {
      clearTimeout(this.messageInterval);
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.clients.forEach((client) => client.close());
    this.wss?.close();
    console.log('[WebSocket] Server stopped');
  }
}

