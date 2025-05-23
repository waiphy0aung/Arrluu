import { Message } from "./message.types";

export interface SocketEvents {
  // Client to server
  disconnect: () => void;

  // Server to client
  newMessage: (message: Message) => void;
  getOnlineUsers: (userIds: string[]) => void;
}

export interface SocketData {
  userId: string;
}
