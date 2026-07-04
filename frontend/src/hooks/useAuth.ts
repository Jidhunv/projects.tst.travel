import { create } from 'zustand';
import { User } from '../types';
import { api, initializeCsrfToken } from '@services/api';

interface AuthState {
  user: User | null;
  token: string | null; // Always null now since token is in HTTPOnly cookie
  permissions: string[]; // "module:action:scope", e.g. "leads:read:all"
  isLoading: boolean;
  error: string | null;
  requiresPasswordChange: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => void;
  refreshMe: () => Promise<void>;
  clearPasswordChangeRequirement: () => void;
  isAuthenticated: () => boolean;
  hasPermission: (module: string, action: string) => boolean;
  canViewModule: (module: string) => boolean;
}

const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: null, // Token is now in HTTPOnly cookie, not stored in state
  permissions: [],
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

        // Initialize CSRF token after successful login
        try {
          await initializeCsrfToken();
        } catch (error) {
          console.warn('CSRF token initialization failed, continuing:', error);
        }

        // Store user info in localStorage, but NOT the token (it's in HTTPOnly cookie)
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('requiresPasswordChange', String(requiresPasswordChange));
        set({
          user,
          token: null, // Token is in HTTPOnly cookie, not in state
          requiresPasswordChange,
          isLoading: false,
        });

        // Load canonical user + permissions so module gating works immediately.
        try {
          await get().refreshMe();
        } catch (error) {
          console.warn('Failed to load permissions after login:', error);
        }
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
    localStorage.removeItem('permissions');
    set({ user: null, token: null, permissions: [], requiresPasswordChange: false });
  },

  // Fetch the current user (with flattened permissions) from the backend.
  refreshMe: async () => {
    const res = await api.getMe();
    if (res.data.success && res.data.data) {
      const data = res.data.data;
      const permissions: string[] = data.permissions || [];
      localStorage.setItem('user', JSON.stringify(data));
      localStorage.setItem('permissions', JSON.stringify(permissions));
      set({ user: data, permissions });
    }
  },

  hasPermission: (module: string, action: string) => {
    const state = get();
    // Admin has full access, mirroring the backend's Admin safety net.
    if (state.user?.role?.name === 'Admin') return true;
    const perms = state.permissions || [];
    return (
      perms.includes(`${module}:${action}:all`) ||
      perms.includes(`${module}:${action}:self`)
    );
  },

  // A module is viewable if the user has any read/view permission for it.
  canViewModule: (module: string) => get().hasPermission(module, 'read'),

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
    const permsStr = localStorage.getItem('permissions');
    const requiresPasswordChangeStr = localStorage.getItem('requiresPasswordChange');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const permissions = permsStr ? JSON.parse(permsStr) : [];
        set({ user, token: null, permissions }); // Token is in HTTPOnly cookie
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
