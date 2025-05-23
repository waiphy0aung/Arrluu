import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { SocketEvents } from '../types/socket.types';

export function useTypedSocket(socket: Socket | null) {
  const handlersRef = useRef<Map<string, Function>>(new Map());

  const on = <T extends keyof SocketEvents>(
    event: T,
    handler: SocketEvents[T]
  ) => {
    if (!socket) return;
    
    // Clean up previous handler
    const existingHandler = handlersRef.current.get(event);
    if (existingHandler) {
      socket.off(event, existingHandler as any);
    }
    
    // Add new handler
    socket.on(event, handler as any);
    handlersRef.current.set(event, handler);
  };

  const off = <T extends keyof SocketEvents>(event: T) => {
    if (!socket) return;
    
    const handler = handlersRef.current.get(event);
    if (handler) {
      socket.off(event, handler as any);
      handlersRef.current.delete(event);
    }
  };

  const emit = <T extends keyof SocketEvents>(
    event: T,
    ...args: Parameters<SocketEvents[T]>
  ) => {
    if (socket) {
      socket.emit(event, ...args);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup all handlers on unmount
      handlersRef.current.forEach((handler, event) => {
        if (socket) {
          socket.off(event, handler as any);
        }
      });
      handlersRef.current.clear();
    };
  }, [socket]);

  return { on, off, emit };
}
