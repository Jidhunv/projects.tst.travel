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

// Get CSRF token from response header and set it in request headers for subsequent requests
let csrfToken: string | null = null;

apiClient.interceptors.response.use(
  (response) => {
    // Capture CSRF token from response header for next request
    const newCsrfToken = response.headers['x-csrf-token'];
    if (newCsrfToken) {
      csrfToken = newCsrfToken;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Add CSRF token to requests
apiClient.interceptors.request.use(
  (config) => {
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiClient.post<ApiResponse<{ user: any; requiresPasswordChange: boolean }>>('/auth/login', { email, password }),

  logout: () =>
    apiClient.post<ApiResponse<void>>('/auth/logout'),

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
};

export default apiClient;
