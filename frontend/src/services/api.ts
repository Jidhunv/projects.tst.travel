import axios, { AxiosInstance } from 'axios';
import type { ApiResponse, PaginatedResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiClient.post<ApiResponse<{ token: string }>>('/auth/login', { email, password }),

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
