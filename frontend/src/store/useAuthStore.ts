import { create } from "zustand";
import fetchApi from "../lib/axios";

interface AuthState {
  authUser: any;
  isSinginUp: boolean;
  isLogginIn: boolean;
  isUpdatingProfile: boolean;
  isCheckingAuth: boolean;

  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  authUser: null,
  isSinginUp: false,
  isLogginIn: false,
  isUpdatingProfile: false,

  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      const {data} = await fetchApi.get("/auth/check");
      console.log(data);
      // set({authUser: res.data})
    } catch (err) {
      console.log(err);
    } finally {
      set({ isCheckingAuth: false });
    }
  },
}));
