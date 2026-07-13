import { useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const SOCKET_URL = 'https://socket-st9y.onrender.com/ws';

export function useSocket(position, onTaskReceived) {
  const clientRef = useRef(null);

  useEffect(() => {
    if (!position) return;

    console.log('🔥 SOCKET INIT', position);

    // Request browser Notification permission once (if available)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try { Notification.requestPermission().catch(() => {}); } catch(e) {}
    }

    const socket = new SockJS(SOCKET_URL);
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000
    });
    clientRef.current = client;

    client.onConnect = () => {
      console.log('✅ SOCKET CONNECTED');
      client.subscribe(`/topic/tasks/${position}`, (message) => {
        console.log('📩 MESSAGE RECEIVED:', message.body);
        let data = {};
        console.log(222222, message?.body);
        
        try { data = JSON.parse(message.body); } catch (e) { data = { raw: message.body }; }

        // call provided handler
        onTaskReceived?.(data);

        // show browser notification when a new task arrives
        try {
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            const title = data.title || data.taskName || 'Bạn có task mới';
            const body = data.message || data.description || 'Mở ứng dụng để xử lý task.';
            const tag = data.id || data.taskId || Date.now().toString();
            const notif = new Notification(title, {
              body,
              tag,
              icon: '/logo192.png'
            });
            notif.onclick = () => {
              try { window.focus(); } catch (e) {}
              try { notif.close(); } catch (e) {}
            };
          }
        } catch (e) {
          console.warn('Notification failed', e);
        }
      });
    };

    client.onStompError = (frame) => {
      console.error('❌ STOMP ERROR:', frame);
    };

    client.activate();

    return () => {
      try {
        client.deactivate();
      } catch (e) {
        console.warn('Socket cleanup failed', e);
      }
    };
  }, [position, onTaskReceived]);

  const sendApproval = (approval) => {
    const client = clientRef.current;
    if (client?.active) {
      client.publish({
        destination: '/app/approval',
        body: JSON.stringify(approval)
      });
    } else {
      console.warn('STOMP client not active yet');
    }
  };

  return { sendApproval };
}
