import { create } from 'zustand';
import { User } from '@types/index';
import { api } from '@services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => void;
}

const useAuth = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.login(email, password);
      if (response.data.success && response.data.data?.token) {
        localStorage.setItem('token', response.data.data.token);
        set({ token: response.data.data.token, isLoading: false });
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  loadUser: () => {
    const token = localStorage.getItem('token');
    if (token) {
      set({ token });
    }
  },
}));

export default useAuth;
