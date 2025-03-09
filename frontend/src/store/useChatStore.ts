import toast from "react-hot-toast";
import { create } from "zustand";
import fetchApi, { getErrMsg } from "../lib/axios";
import {MessageFormState} from "../components/MessageInput";
import {useAuthStore} from "./useAuthStore";

interface ChatState {
  messages: any[];
  users: any[];
  selectedUser: any;
  isUsersLoading: boolean;
  isMessagesLoading: boolean;

  setSelectedUser: (selectedUser: any) => void;
  getUsers: () => Promise<void>;
  getMessages: (userId: string) => Promise<void>;
  sendMessage: (messageData: MessageFormState) => Promise<void>;
  subscribeToMessages: () => void;
  unsubscribeFromMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

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
      set({ messages: data });
    } catch (err: any) {
      toast.error(getErrMsg(err));
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const { data } = await fetchApi.post(
        `/messages/send/${selectedUser?._id}`,
        messageData,
      );
      set({ messages: [...messages, data] });
    } catch (err: any) {
      toast.error(getErrMsg(err));
    }
  },
  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    if (socket) {
      socket.on("newMessage", (message) => {
        if(message.senderId !== selectedUser._id) return;
        set({ messages: [...get().messages, message] });
      });
    }
  },
  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if(socket) socket.off("newMessage")
  }
}));
