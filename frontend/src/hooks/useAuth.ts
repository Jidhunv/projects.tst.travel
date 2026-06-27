import { create } from 'zustand';
import { User } from '../types';
import { api } from '@services/api';

interface AuthState {
  user: User | null;
  token: string | null; // Always null now since token is in HTTPOnly cookie
  isLoading: boolean;
  error: string | null;
  requiresPasswordChange: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => void;
  clearPasswordChangeRequirement: () => void;
  isAuthenticated: () => boolean;
}

const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: null, // Token is now in HTTPOnly cookie, not stored in state
  isLoading: false,
  error: null,
  requiresPasswordChange: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      console.log('useAuth.login called');
      const response = await api.login(email, password);
      console.log('API response:', response);
      console.log('response.data:', response.data);
      console.log('response.data.success:', response.data.success);
      console.log('response.data.data?.user:', response.data.data?.user);

      if (response.data.success && response.data.data?.user) {
        const user = response.data.data.user;
        const requiresPasswordChange = response.data.data.requiresPasswordChange || false;
        console.log('Login successful, setting user:', user);
        // Store user info in localStorage, but NOT the token (it's in HTTPOnly cookie)
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('requiresPasswordChange', String(requiresPasswordChange));
        set({
          user,
          token: null, // Token is in HTTPOnly cookie, not in state
          requiresPasswordChange,
          isLoading: false,
        });
      } else {
        console.error('Invalid response format:', response.data);
        set({ error: 'Invalid login response', isLoading: false });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.response?.data?.error || error.message || 'Login failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('user');
    localStorage.removeItem('requiresPasswordChange');
    set({ user: null, token: null, requiresPasswordChange: false });
  },

  clearPasswordChangeRequirement: () => {
    localStorage.removeItem('requiresPasswordChange');
    set({ requiresPasswordChange: false });
  },

  isAuthenticated: () => {
    // Check if user is authenticated (user data present, token in HTTPOnly cookie)
    return get().user !== null;
  },

  loadUser: () => {
    const userStr = localStorage.getItem('user');
    const requiresPasswordChangeStr = localStorage.getItem('requiresPasswordChange');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token: null }); // Token is in HTTPOnly cookie
        if (requiresPasswordChangeStr === 'true') {
          set({ requiresPasswordChange: true });
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  },
}));

export default useAuth;
