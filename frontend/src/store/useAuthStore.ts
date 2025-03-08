import { create } from "zustand";
import fetchApi from "../lib/axios";
import toast from "react-hot-toast";
import { SingUpFormState } from "../pages/SignUpPage";

interface AuthState {
  authUser: any;
  isSinginUp: boolean;
  isLogginIn: boolean;
  isUpdatingProfile: boolean;
  isCheckingAuth: boolean;

  checkAuth: () => void;
  signup: (formData: SingUpFormState) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  authUser: null,
  isSinginUp: false,
  isLogginIn: false,
  isUpdatingProfile: false,

  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      const { data } = await fetchApi.get("/auth/check");

      set({ authUser: data });
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
      toast.error(err.message);
    } finally {
      set({ isSinginUp: true });
    }
  },
}));
