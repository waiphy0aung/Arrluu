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
  publicKey: CryptoKey | null;

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
    if(!userId){
      console.log("User not found")
      toast.error("Something went wrong")
    }
    set({ isMessagesLoading: true });
    try {
      const { data } = await fetchApi.get(`/messages/${userId}`);
      const decrypted: Message[] = [];
      for (const msg of data) {
        const dm = await decryptMessage(msg, get().privateKey);
        decrypted.push(dm);
      }
      set({ messages: decrypted });
    } catch (err: any) {
      set({ messages: [] })
      toast.error(getErrMsg(err));
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, publicKey, messages } = get();
    const authUser = useAuthStore.getState().authUser

    if (!selectedUser || !authUser) return
    if (!publicKey || !messageData.text) return
    const encryptedText = await encryptMessage(messageData, selectedUser, authUser);
    try {
      const { data } = await fetchApi.post(`/messages/send/${selectedUser?._id}`, { ...messageData, ...encryptedText });
      set({ messages: [...messages, { ...data, text: messageData.text }] });
    } catch (err: any) {
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
    const { publicKey, privateKey } = await getKeyPair();
    const encryptedPrivateKey = await exportAndEncryptPrivateKey(privateKey, userPassword);

    const publicKeyJwk = await crypto.subtle.exportKey("jwk", publicKey);
    const privateKeyJwk = await crypto.subtle.exportKey("jwk", privateKey);
    await saveKey("privateKey", privateKeyJwk);
    set({ privateKey, publicKey });
    return { publicKeyJwk, encryptedPrivateKey };
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

