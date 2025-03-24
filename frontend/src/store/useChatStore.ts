import toast from "react-hot-toast";
import { create } from "zustand";
import fetchApi, { getErrMsg } from "../lib/axios";
import { MessageFormState } from "../components/MessageInput";
import { useAuthStore } from "./useAuthStore";
import { decryptMessage, encryptMessage, getKeyPair, importKey } from "../lib/util";

interface ChatState {
  messages: any[];
  users: any[];
  selectedUser: any;
  isUsersLoading: boolean;
  isMessagesLoading: boolean;
  privateKey: any;

  setSelectedUser: (selectedUser: any) => void;
  getUsers: () => Promise<void>;
  getMessages: (userId: string) => Promise<void>;
  sendMessage: (messageData: MessageFormState) => Promise<void>;
  subscribeToMessages: () => void;
  unsubscribeFromMessages: () => void;
  generateKeyPair: () => Promise<JsonWebKey>;
  setPrivateKey: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  privateKey: null,

  setSelectedUser: (selectedUser) => set({ selectedUser }),

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const { data } = await fetchApi.get("/messages/users");
      set({ users: data });
    } catch (err: any) {
      toast.error(getErrMsg(err));
    } finally {
      set({ isUsersLoading: false });
    }
  },
  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const { data } = await fetchApi.get(`/messages/${userId}`);
      const decryptedData = await Promise.all(data.map(async (d: any) => {
        let decryptedText;
        if (d.text) {
          console.log(">>>>",d.text)
          decryptedText = await decryptMessage(d.text, get().privateKey)
          console.log("decryptedText",decryptedText)
        }
        return { ...d, text: decryptedText }
      }))
      set({ messages: decryptedData });
    } catch (err: any) {
      toast.error(getErrMsg(err));
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();

    let encryptedText;
    if (messageData.text && messageData.text.length > 0) {
      const publicKey = await importKey(selectedUser.publicKey, "encrypt")
      encryptedText = await encryptMessage(messageData.text, publicKey)
    }

    const encryptedData = {
      ...messageData,
      text: encryptedText
    }

    try {
      const { data } = await fetchApi.post(
        `/messages/send/${selectedUser?._id}`,
        encryptedData,
      );

      let decryptedText;
      if (data.text) {
        decryptedText = await decryptMessage(data.text, get().privateKey)
      }

      set({ messages: [...messages, { ...data, text: decryptedText }] });
    } catch (err: any) {
      toast.error(getErrMsg(err));
    }
  },
  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    if (socket) {
      socket.on("newMessage", async (message) => {
        if (message.senderId !== selectedUser._id) return;
        let decryptedText;
        if (message.text) {
          decryptedText = await decryptMessage(message.text, get().privateKey)
        }
        set({ messages: [...get().messages, { ...message, text: decryptedText }] });
      });
    }
  },
  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) socket.off("newMessage")
  },
  generateKeyPair: async () => {
    const { publicKey, privateKey } = await getKeyPair()
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', publicKey);
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', privateKey);
    set({ privateKey: privateKey })
    localStorage.setItem('privateKey', JSON.stringify(privateKeyJwk));
    return publicKeyJwk;
  },
  setPrivateKey: async () => {
    const storedPrivateKey = localStorage.getItem('privateKey');
    if (storedPrivateKey) {
      const key = await importKey(JSON.parse(storedPrivateKey), "decrypt")
      if (!key) return console.log("Failed to import private key")
      set({ privateKey: key })
    }
  }

}));
