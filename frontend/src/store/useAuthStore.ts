import { create } from "zustand";
import fetchApi, { getErrMsg } from "../lib/axios";
import toast from "react-hot-toast";
import { SingUpFormState } from "../pages/SignUpPage";
import { LoginFormState } from "../pages/LoginPage";
import { ProfileFormState } from "../pages/ProfilePage";
import { io, Socket } from "socket.io-client";
import { useChatStore } from "./useChatStore";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

interface AuthState {
  authUser: any;
  isSinginUp: boolean;
  isLogginIn: boolean;
  isUpdatingProfile: boolean;
  isCheckingAuth: boolean;
  onlineUsers: any[];
  socket: Socket | null;

  checkAuth: () => void;
  signup: (formData: SingUpFormState) => Promise<void>;
  login: (formData: LoginFormState) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (formData: ProfileFormState) => Promise<void>;
  connectSocket: () => void;
  disConnectSocket: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  authUser: null,
  isSinginUp: false,
  isLogginIn: false,
  isUpdatingProfile: false,
  onlineUsers: [],
  socket: null,

  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      const user = await fetchApi.get("/auth/check");

      set({ authUser: user });
      useChatStore.setState({ publicKey: user.publicKey })
      get().connectSocket();
    } catch (err) {
      console.log(err);
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (formData) => {
    set({ isSinginUp: true });
    try {
      const publicKeyJwk = await useChatStore.getState().generateKeyPair();
      const { data, message } = await fetchApi.post("/auth/signup", { ...formData, publicKey: publicKeyJwk });

      toast.success(message);
      set({ authUser: data });
      useChatStore.setState({ publicKey: data.publicKey })
      get().connectSocket();
    } catch (err: any) {
      toast.error(getErrMsg(err));
    } finally {
      set({ isSinginUp: true });
    }
  },

  login: async (formData) => {
    set({ isLogginIn: true });
    try {
      const { data, message } = await fetchApi.post("/auth/login", formData);
      toast.success(message);
      console.log("data", data)
      set({ authUser: data });
      useChatStore.setState({ publicKey: data.publicKey })
      get().connectSocket();
    } catch (err: any) {
      toast.error(getErrMsg(err));
    } finally {
      set({ isLogginIn: false });
    }
  },

  logout: async () => {
    try {
      const { message } = await fetchApi.post("/auth/logout");
      set({ authUser: null });
      get().disConnectSocket();
      toast.success(message);
    } catch (err: any) {
      toast.error(getErrMsg(err));
    }
  },

  updateProfile: async (formData) => {
    set({ isUpdatingProfile: true });
    try {
      const { data, message } = await fetchApi.put(
        "/auth/update-profile",
        formData,
      );
      set({ authUser: data });
      toast.success(message);
    } catch (err: any) {
      toast.error(getErrMsg(err));
    } finally {
      set({ isUpdatingProfile: false });
    }
  },
  connectSocket: () => {
    const { authUser } = get();

    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
    });
    socket.connect();

    set({ socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },
  disConnectSocket: () => {
    if (get().socket?.connected) get().socket?.disconnect();
  },
}));
