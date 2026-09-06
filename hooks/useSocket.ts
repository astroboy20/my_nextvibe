/**
 * useSocket — React Native
 *
 * Manages a socket.io-client connection for a given namespace.
 * Reads the access token from AsyncStorage (RN equivalent of js-cookie).
 * Used by ChatTab and any other real-time feature.
 *
 * Usage:
 *   const { socketRef, isConnected, status } = useSocket('messaging', { enabled: !!eventId });
 */
import { API_URL } from '@/store/baseQuery';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

const SOCKET_BASE = API_URL.replace(/\/$/, '');

export function useSocket(
  namespace: 'messaging' | 'notifications',
  { enabled = true }: { enabled?: boolean } = {},
) {
  const [status, setStatus] = useState<SocketStatus>('disconnected');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let socket: Socket;
    let cancelled = false;

    const connect = async () => {
      const token = await AsyncStorage.getItem('accessToken');

      // If component unmounted before token resolved, bail out
      if (cancelled) return;

      // No token — mark as error and skip connection (matches web behaviour)
      if (!token) {
        setStatus('error');
        return;
      }

      console.log(`[socket/${namespace}] connecting to ${SOCKET_BASE}/${namespace}`);

      const url = `${SOCKET_BASE}/${namespace}`;

      socket = io(url, {
        // Pass the raw token — backend expects "Bearer <token>" or raw depending
        // on the auth middleware. Keep consistent with web version (raw token).
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 6,
        reconnectionDelay: 2000,
      });

      socketRef.current = socket;
      setStatus('connecting');

      socket.on('connect', () => {
        console.log(`[socket/${namespace}] ✅ connected  id=${socket.id}`);
        if (!cancelled) setStatus('connected');
      });

      socket.on('connect_error', (err) => {
        console.error(`[socket/${namespace}] ❌ connect_error:`, err.message);
        if (!cancelled) setStatus('error');
      });

      socket.on('disconnect', (reason) => {
        console.warn(`[socket/${namespace}] 🔌 disconnected  reason=${reason}`);
        if (!cancelled) setStatus('disconnected');
      });

      socket.on('reconnect', (attempt) => {
        console.log(`[socket/${namespace}] 🔄 reconnected after ${attempt} attempt(s)`);
        if (!cancelled) setStatus('connected');
      });
    };

    connect();

    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
    };
  }, [namespace, enabled]);

  const emit = useCallback((event: string, ...args: any[]) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  return {
    socketRef,
    status,
    isConnected: status === 'connected',
    emit,
  };
}
