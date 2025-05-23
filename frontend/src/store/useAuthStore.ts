import { create } from "zustand";
import fetchApi, { getErrMsg } from "../lib/axios";
import toast from "react-hot-toast";
import { SingUpFormState } from "../pages/SignUpPage";
import { LoginFormState } from "../pages/LoginPage";
import { ProfileFormState } from "../pages/ProfilePage";
import { io, Socket } from "socket.io-client";
import { useChatStore } from "./useChatStore";
import { importEncryptedPrivateKey } from "../lib/crypto";
import { saveKey } from "../lib/keyStorage";
import { User } from "../types/user.types";
import publicKeyCache from "../lib/keyCache";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

interface AuthState {
  authUser: User | null;
  isSinginUp: boolean;
  isLogginIn: boolean;
  isUpdatingProfile: boolean;
  isCheckingAuth: boolean;
  onlineUsers: string[];
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
      const { data } = await fetchApi.get<User>("/auth/check");

      set({ authUser: data });
      useChatStore.setState({ publicKey: data.publicKey })
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
      const { publicKeyJwk, encryptedPrivateKey } = await useChatStore.getState().generateKeyPair(formData.password);
      const { data, message } = await fetchApi.post<User>("/auth/signup", { ...formData, publicKey: publicKeyJwk });

      await fetchApi.post("/key", { key: encryptedPrivateKey })

      toast.success(message);
      set({ authUser: data });
      useChatStore.setState({ publicKey: data.publicKey })
      get().connectSocket();
    } catch (err: any) {
      toast.error(getErrMsg(err));
    } finally {
      set({ isSinginUp: false });
    }
  },

  login: async (formData) => {
    set({ isLogginIn: true });
    try {
      const { data, message } = await fetchApi.post<User>("/auth/login", formData);
      const privateKey = await fetchPrivateKey(formData.password)

      toast.success(message);

      set({ authUser: data });
      useChatStore.setState({ publicKey: data.publicKey, privateKey })
      get().connectSocket();
    } catch (err: any) {
      console.error("Login failed:", err)
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

      //clear sensitive data
      publicKeyCache.clear()

      toast.success(message);
      window.location.reload()
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

const fetchPrivateKey = async (password: string): Promise<CryptoKey> => {
  try {
    const encryptedPrivateKey = await fetchApi.get<string>("/key");

    const privateKey = await importEncryptedPrivateKey(encryptedPrivateKey.data, password)
    const privateKeyJwk = await crypto.subtle.exportKey("jwk", privateKey)

    await saveKey('privateKey', privateKeyJwk)
    return privateKey
  } catch (error) {
    console.error("Failed to fetch private key:", error);
    throw new Error("Failed to decrypt private key. Please check your password.")
  }

}
