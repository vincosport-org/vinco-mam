import { useEffect, useRef, useCallback } from 'react';
import { useUserStore } from '../stores/userStore';

type EventHandler = (data: any) => void;

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const handlers = useRef<Map<string, Set<EventHandler>>>(new Map());
  const reconnectAttempts = useRef(0);
  const { user } = useUserStore();
  
  const connect = useCallback(() => {
    const settings = window.vincoMAM?.settings;
    if (!settings?.websocket_endpoint) return;
    
    const token = window.vincoMAM?.nonce || ''; // In production, use proper JWT
    const wsUrl = `${settings.websocket_endpoint}?token=${token}`;
    
    ws.current = new WebSocket(wsUrl);
    
    ws.current.onopen = () => {
      console.log('WebSocket connected');
      reconnectAttempts.current = 0;
      
      // Subscribe to default channels
      ws.current?.send(JSON.stringify({
        action: 'subscribe',
        channels: ['images', 'validation', 'albums']
      }));
    };
    
    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const eventHandlers = handlers.current.get(message.event);
        if (eventHandlers) {
          eventHandlers.forEach(handler => handler(message.data));
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };
    
    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      
      // Exponential backoff reconnect
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;
      
      setTimeout(connect, delay);
    };
    
    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, []);
  
  useEffect(() => {
    if (!window.vincoMAM?.settings?.websocket_endpoint) return;
    
    connect();
    
    // Keepalive ping every 30 seconds
    const pingInterval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ action: 'ping' }));
      }
    }, 30000);
    
    return () => {
      clearInterval(pingInterval);
      ws.current?.close();
    };
  }, [connect]);
  
  const subscribe = useCallback((event: string, handler: EventHandler) => {
    if (!handlers.current.has(event)) {
      handlers.current.set(event, new Set());
    }
    handlers.current.get(event)!.add(handler);
    
    return () => {
      handlers.current.get(event)?.delete(handler);
    };
  }, []);
  
  const send = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);
  
  return { 
    subscribe, 
    send, 
    isConnected: ws.current?.readyState === WebSocket.OPEN 
  };
}
