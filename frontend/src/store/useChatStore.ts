import toast from "react-hot-toast";
import { create } from "zustand";
import fetchApi, { getErrMsg } from "../lib/axios";
import { MessageFormState } from "../components/MessageInput";
import { useAuthStore } from "./useAuthStore";
import { loadKey, saveKey } from "../lib/keyStorage";
import { encryptMessage, decryptMessage, exportAndEncryptPrivateKey, getKeyPair, getCachedPublicKey } from "../lib/crypto";
import { User } from "../types/user.types";
import { Message } from "../types/message.types";

export interface ChatState {
  messages: Message[];
  users: User[];
  selectedUser: User | null;
  isUsersLoading: boolean;
  isMessagesLoading: boolean;
  privateKey: CryptoKey | null;
  publicKey: JsonWebKey | null;

  setSelectedUser: (selectedUser: User | null) => void;
  getUsers: () => Promise<void>;
  getMessages: (userId: string | undefined) => Promise<void>;
  sendMessage: (messageData: MessageFormState) => Promise<void>;
  messageHandler: ((msg: Message) => void) | null;
  subscribeToMessages: () => void;
  unsubscribeFromMessages: () => void;
  generateKeyPair: (userPassword: string) => Promise<{ publicKeyJwk: JsonWebKey, encryptedPrivateKey: string }>;
  setPrivateKey: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  privateKey: null,
  publicKey: null,
  messageHandler: null,

  setSelectedUser: (selectedUser) => set({ selectedUser }),

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const { data } = await fetchApi.get("/messages/users");
      set({ users: data });
    } catch (err: any) {
      set({ users: [] })
      toast.error(getErrMsg(err));
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    if (!userId) {
      console.log("User not found")
      toast.error("Something went wrong")
    }
    set({ isMessagesLoading: true });
    try {
      const { data } = await fetchApi.get<Message[]>(`/messages/${userId}`);
      const decrypted = await decryptMessages(data, get().privateKey)
      set({ messages: decrypted });
    } catch (err) {
      console.error("Failed to fetch messages:", err);
      set({ messages: [] })
      toast.error(getErrMsg(err));
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, publicKey, messages } = get();
    const authUser = useAuthStore.getState().authUser

    if (!selectedUser || !authUser || !publicKey || !messageData.text.trim()) {
      toast.error("Missing required data for sending message");
      return;
    }

    try {
      const encryptedText = await encryptMessage(messageData, selectedUser, authUser);
      const bodyData = { ...messageData, ...encryptedText }
      const { data } = await fetchApi.post<Message>(`/messages/send/${selectedUser?._id}`, bodyData);

      set({
        messages: [
          ...messages,
          {
            ...data,
            text: messageData.text,
          }]
      });
    } catch (err) {
      console.error("Failed to send message:", err)
      toast.error(getErrMsg(err));
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, messageHandler } = get();
    const socket = useAuthStore.getState().socket;
    if (!socket || !selectedUser) return;

    if (messageHandler) socket.off("newMessage", messageHandler)

    const handler = async (msg: Message) => {
      if (msg.senderId !== selectedUser._id) return;
      const dm = await decryptMessage(msg, get().privateKey)
      set({ messages: [...get().messages, dm] })
    }

    socket.on("newMessage", handler);
    set({ messageHandler: handler })
  },

  unsubscribeFromMessages: () => {
    const { messageHandler } = get();
    const socket = useAuthStore.getState().socket;

    if (socket && messageHandler) {
      socket.off("newMessage", messageHandler)
      set({ messageHandler: null })
    }
  },

  generateKeyPair: async (userPassword) => {
    try {
      const { publicKey, privateKey } = await getKeyPair();
      const encryptedPrivateKey = await exportAndEncryptPrivateKey(privateKey, userPassword);

      const publicKeyJwk = await crypto.subtle.exportKey("jwk", publicKey);
      const privateKeyJwk = await crypto.subtle.exportKey("jwk", privateKey);

      await saveKey("privateKey", privateKeyJwk);
      set({ privateKey, publicKey });

      return { publicKeyJwk, encryptedPrivateKey };
    } catch (err) {
      console.error("Failed to generate key pair:", err);
      throw new Error("Failed to generate encryption keys");
    }

  },

  setPrivateKey: async () => {
    const jwk = await loadKey("privateKey");
    if (!jwk) {
      console.warn("No private key found in IndexedDB");
      return;
    }

    const key = await getCachedPublicKey(jwk, "decrypt");
    if (key) {
      set({ privateKey: key });
    } else {
      console.error("Failed to import private key");
    }
  },
}));

export async function decryptMessages(
  messages: Message[],
  privateKey: CryptoKey | null
): Promise<Message[]> {
  if (!privateKey) return messages;

  // Process in batches to avoid blocking UI
  const BATCH_SIZE = 10;
  const decrypted: Message[] = [];

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (msg) => {
      try {
        return await decryptMessage(msg, privateKey);
      } catch (error) {
        console.error("Failed to decrypt message:", error);
        return { ...msg, text: "[Failed to decrypt]" };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    decrypted.push(...batchResults);

    // Yield control to prevent UI blocking
    if (i + BATCH_SIZE < messages.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return decrypted;
}
