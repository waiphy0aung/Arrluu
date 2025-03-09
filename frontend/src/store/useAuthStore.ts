import { create } from "zustand";
import fetchApi, { getErrMsg } from "../lib/axios";
import toast from "react-hot-toast";
import { SingUpFormState } from "../pages/SignUpPage";
import { LoginFormState } from "../pages/LoginPage";
import { ProfileFormState } from "../pages/ProfilePage";

interface AuthState {
  authUser: any;
  isSinginUp: boolean;
  isLogginIn: boolean;
  isUpdatingProfile: boolean;
  isCheckingAuth: boolean;
  onlineUsers: any[];

  checkAuth: () => void;
  signup: (formData: SingUpFormState) => Promise<void>;
  login: (formData: LoginFormState) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (formData: ProfileFormState) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  authUser: null,
  isSinginUp: false,
  isLogginIn: false,
  isUpdatingProfile: false,
  onlineUsers: [],

  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      const user = await fetchApi.get("/auth/check");

      set({ authUser: user });
    } catch (err) {
      console.log(err);
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (formData) => {
    set({ isSinginUp: true });
    try {
      const { data, message } = await fetchApi.post("/auth/signup", formData);

      toast.success(message);
      set({ authUser: data });
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
      set({ authUser: data });
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
        formData
      );
      set({ authUser: data });
      toast.success(message);
    } catch (err: any) {
      toast.error(getErrMsg(err));
    } finally {
      set({ isUpdatingProfile: false });
    }
  },
}));
