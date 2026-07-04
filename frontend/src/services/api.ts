import axios, { AxiosInstance } from 'axios';
import type { ApiResponse, PaginatedResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies with all requests
});

// Helper function to get CSRF token from cookie
function getCsrfTokenFromCookie(): string | null {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'XSRF-TOKEN') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

apiClient.interceptors.response.use(
  (response) => {
    // Update CSRF token from response header if present
    const newCsrfToken = response.headers['x-csrf-token'];
    if (newCsrfToken) {
      console.log('✅ CSRF token updated from response');
      // Set new token in cookie via JavaScript
      document.cookie = `XSRF-TOKEN=${encodeURIComponent(newCsrfToken)}; path=/; SameSite=Strict`;
    }
    return response;
  },
  (error) => {
    // Don't auto-redirect on 401 - let the component handle it
    // This allows proper async cleanup before redirect
    if (error.response?.status === 401) {
      console.log('Received 401 Unauthorized - session may have expired');
      // Only redirect if we're not on the login page already
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('user');
        // Use setTimeout to allow current request to complete
        setTimeout(() => {
          window.location.href = '/login';
        }, 0);
      }
    }
    return Promise.reject(error);
  }
);

// Initialize CSRF token on first POST/PATCH/DELETE request
let csrfInitialized = false;

// Add CSRF token to all requests (from cookie)
apiClient.interceptors.request.use(
  async (config) => {
    const method = config.method?.toLowerCase();
    const isStateChangingRequest = ['post', 'patch', 'delete', 'put'].includes(method || '');

    // Initialize CSRF token by making a GET request if not already done and this is a state-changing request
    if (!csrfInitialized && isStateChangingRequest) {
      try {
        console.log('Initializing CSRF token before state-changing request...');
        await apiClient.get('/users/me');
        csrfInitialized = true;
        console.log('CSRF token initialized successfully');
      } catch (error) {
        console.warn('CSRF token initialization failed:', error);
        csrfInitialized = true;
      }
    }

    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
      console.log('CSRF token added to request header');
    } else if (isStateChangingRequest) {
      console.warn('No CSRF token found for state-changing request!');
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Initialize CSRF token when app loads
export async function initializeCsrfToken(): Promise<void> {
  try {
    await apiClient.get('/users/me');
  } catch (error) {
    // Token is still generated even if auth fails
    // No-op
  }
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiClient.post<ApiResponse<{ user: any; requiresPasswordChange: boolean }>>('/auth/login', { email, password }),

  logout: () =>
    apiClient.post<ApiResponse<void>>('/auth/logout'),

  // Current user including flattened permissions ("module:action:scope")
  getMe: () =>
    apiClient.get<ApiResponse<any>>('/users/me'),

  passwordReset: (email: string) =>
    apiClient.post<ApiResponse<void>>('/auth/password-reset', { email }),

  // Leads
  getLeads: (page = 1, limit = 20, filters?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<any>>('/leads', { params: { page, limit, ...filters } }),

  getLead: (id: string) =>
    apiClient.get<ApiResponse<any>>(`/leads/${id}`),

  createLead: (data: any) =>
    apiClient.post<ApiResponse<any>>('/leads', data),

  updateLead: (id: string, data: any) =>
    apiClient.patch<ApiResponse<any>>(`/leads/${id}`, data),

  deleteLead: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/leads/${id}`),

  updateLeadStatus: (id: string, status: string) =>
    apiClient.patch<ApiResponse<any>>(`/leads/${id}/status`, { status }),

  convertLeadToAccount: (id: string) =>
    apiClient.post<ApiResponse<any>>(`/leads/${id}/convert-to-account`, {}),

  convertLeadToOpportunity: (id: string) =>
    apiClient.post<ApiResponse<any>>(`/leads/${id}/convert-to-opportunity`, {}),

  markLeadLost: (id: string, lostReason: string) =>
    apiClient.patch<ApiResponse<any>>(`/leads/${id}/lost`, { lostReason }),

  // Products
  getProducts: (page = 1, limit = 100) =>
    apiClient.get<PaginatedResponse<any>>('/products', { params: { page, limit } }),

  // Rejection reasons (fixed dropdown list)
  getRejectionReasons: () =>
    apiClient.get<ApiResponse<string[]>>('/opportunities/meta/rejection-reasons'),

  // Accounts
  getAccounts: (page = 1, limit = 20, filters?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<any>>('/accounts', { params: { page, limit, ...filters } }),

  getAccount: (id: string) =>
    apiClient.get<ApiResponse<any>>(`/accounts/${id}`),

  createAccount: (data: any) =>
    apiClient.post<ApiResponse<any>>('/accounts', data),

  updateAccount: (id: string, data: any) =>
    apiClient.patch<ApiResponse<any>>(`/accounts/${id}`, data),

  deleteAccount: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/accounts/${id}`),

  getAccountTimeline: (id: string) =>
    apiClient.get<ApiResponse<any>>(`/accounts/${id}/timeline`),

  // Contacts
  getAccountContacts: (accountId: string) =>
    apiClient.get<ApiResponse<any[]>>(`/accounts/${accountId}/contacts`),

  createContact: (accountId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/accounts/${accountId}/contacts`, data),

  updateContact: (accountId: string, contactId: string, data: any) =>
    apiClient.patch<ApiResponse<any>>(`/accounts/${accountId}/contacts/${contactId}`, data),

  deleteContact: (accountId: string, contactId: string) =>
    apiClient.delete<ApiResponse<void>>(`/accounts/${accountId}/contacts/${contactId}`),

  // Opportunities
  getOpportunities: (page = 1, limit = 20, filters?: Record<string, any>) =>
    apiClient.get<PaginatedResponse<any>>('/opportunities', { params: { page, limit, ...filters } }),

  getOpportunity: (id: string) =>
    apiClient.get<ApiResponse<any>>(`/opportunities/${id}`),

  createOpportunity: (data: any) =>
    apiClient.post<ApiResponse<any>>('/opportunities', data),

  updateOpportunity: (id: string, data: any) =>
    apiClient.patch<ApiResponse<any>>(`/opportunities/${id}`, data),

  deleteOpportunity: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/opportunities/${id}`),

  updateOpportunityStage: (id: string, stage: string) =>
    apiClient.patch<ApiResponse<any>>(`/opportunities/${id}/stage`, { stage }),

  closeOpportunity: (id: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/opportunities/${id}/close`, data),

  addLineItem: (opportunityId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/opportunities/${opportunityId}/line-items`, data),

  updateLineItem: (opportunityId: string, lineItemId: string, data: any) =>
    apiClient.patch<ApiResponse<any>>(`/opportunities/${opportunityId}/line-items/${lineItemId}`, data),

  // Pipeline
  getPipeline: (filters?: Record<string, any>) =>
    apiClient.get<ApiResponse<any>>('/pipeline', { params: filters }),

  getPipelineForecast: (filters?: Record<string, any>) =>
    apiClient.get<ApiResponse<any>>('/pipeline/forecast', { params: filters }),

  // Reports & MIS (dollar figures, role-scoped)
  getMIS: () =>
    apiClient.get<ApiResponse<any>>('/reports/mis'),

  getPipelineReport: () =>
    apiClient.get<ApiResponse<any>>('/reports/pipeline'),

  getSalesReport: (filters?: Record<string, any>) =>
    apiClient.get<ApiResponse<any>>('/reports/sales', { params: filters }),

  // Suppliers (master data)
  getSuppliers: (filters?: Record<string, any>) =>
    apiClient.get<ApiResponse<any[]>>('/suppliers', { params: filters }),
  createSupplier: (data: any) => apiClient.post<ApiResponse<any>>('/suppliers', data),
  updateSupplier: (id: string, data: any) => apiClient.patch<ApiResponse<any>>(`/suppliers/${id}`, data),
  deleteSupplier: (id: string) => apiClient.delete<ApiResponse<void>>(`/suppliers/${id}`),

  // Sales visits / calls (Sales Report source)
  getSalesVisits: (filters?: Record<string, any>) =>
    apiClient.get<ApiResponse<any[]>>('/sales-visits', { params: filters }),
  createSalesVisit: (data: any) => apiClient.post<ApiResponse<any>>('/sales-visits', data),
  updateSalesVisit: (id: string, data: any) => apiClient.patch<ApiResponse<any>>(`/sales-visits/${id}`, data),
  deleteSalesVisit: (id: string) => apiClient.delete<ApiResponse<void>>(`/sales-visits/${id}`),

  // Expense management (with approval workflow)
  getExpenses: (filters?: Record<string, any>) =>
    apiClient.get<ApiResponse<any[]>>('/expenses', { params: filters }),
  createExpense: (data: any) => apiClient.post<ApiResponse<any>>('/expenses', data),
  updateExpense: (id: string, data: any) => apiClient.patch<ApiResponse<any>>(`/expenses/${id}`, data),
  decideExpense: (id: string, decision: 'Approved' | 'Rejected', notes?: string) =>
    apiClient.post<ApiResponse<any>>(`/expenses/${id}/decision`, { decision, notes }),
  deleteExpense: (id: string) => apiClient.delete<ApiResponse<void>>(`/expenses/${id}`),
};

export default apiClient;
