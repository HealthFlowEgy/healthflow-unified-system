// Sprint 2 - API Service
// ------------------------------------------------------------------------------

import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // If error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
              throw new Error('No refresh token');
            }

            const response = await axios.post(`${API_BASE_URL}/api/v2/auth/refresh`, {
              refreshToken,
            });

            const { accessToken } = response.data.data;
            localStorage.setItem('accessToken', accessToken);

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  get(url: string, params?: any) {
    return this.client.get(url, { params });
  }

  post(url: string, data?: any) {
    return this.client.post(url, data);
  }

  put(url: string, data?: any) {
    return this.client.put(url, data);
  }

  patch(url: string, data?: any) {
    return this.client.patch(url, data);
  }

  delete(url: string) {
    return this.client.delete(url);
  }
}

const apiService = new ApiService();

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiService.post('/api/v2/auth/login', { email, password }),
  
  logout: () =>
    apiService.post('/api/v2/auth/logout'),
  
  refreshToken: (refreshToken: string) =>
    apiService.post('/api/v2/auth/refresh', { refreshToken }),
  
  validateToken: (token: string) =>
    apiService.post('/api/v2/auth/validate', { token }),
};

// Pharmacy API
export const pharmacyApi = {
  listPharmacies: (params?: any) =>
    apiService.get('/api/v2/pharmacy', params),
  
  getPharmacy: (id: string) =>
    apiService.get(`/api/v2/pharmacy/${id}`),
  
  getDashboardStats: (pharmacyId: string) =>
    apiService.get(`/api/v2/pharmacy/${pharmacyId}/dashboard`),
  
  // Inventory
  getInventory: (pharmacyId: string, params?: any) =>
    apiService.get(`/api/v2/inventory/${pharmacyId}`, params),
  
  addInventoryItem: (pharmacyId: string, data: any) =>
    apiService.post(`/api/v2/inventory/${pharmacyId}/items`, data),
  
  updateInventoryItem: (pharmacyId: string, itemId: string, data: any) =>
    apiService.put(`/api/v2/inventory/${pharmacyId}/items/${itemId}`, data),
  
  deleteInventoryItem: (pharmacyId: string, itemId: string) =>
    apiService.delete(`/api/v2/inventory/${pharmacyId}/items/${itemId}`),
  
  getLowStockItems: (pharmacyId: string) =>
    apiService.get(`/api/v2/inventory/${pharmacyId}/low-stock`),
  
  getExpiringItems: (pharmacyId: string, days?: number) =>
    apiService.get(`/api/v2/inventory/${pharmacyId}/expiring`, { days }),
  
  // Prescriptions
  getPendingPrescriptions: (pharmacyId: string, params?: any) =>
    apiService.get(`/api/v2/dispensing/${pharmacyId}/prescriptions/pending`, params),
  
  searchPrescriptions: (pharmacyId: string, params: any) =>
    apiService.get(`/api/v2/dispensing/${pharmacyId}/prescriptions/search`, params),
  
  getPrescription: (pharmacyId: string, prescriptionId: string) =>
    apiService.get(`/api/v2/dispensing/${pharmacyId}/prescriptions/${prescriptionId}`),
  
  verifyPrescription: (pharmacyId: string, prescriptionId: string, data: any) =>
    apiService.post(`/api/v2/dispensing/${pharmacyId}/prescriptions/${prescriptionId}/verify`, data),
  
  dispensePrescription: (pharmacyId: string, data: any) =>
    apiService.post(`/api/v2/dispensing/${pharmacyId}/dispense`, data),
  
  // History
  getDispensingHistory: (pharmacyId: string, params?: any) =>
    apiService.get(`/api/v2/dispensing/${pharmacyId}/history`, params),
  
  getDispensingRecord: (pharmacyId: string, recordId: string) =>
    apiService.get(`/api/v2/dispensing/${pharmacyId}/history/${recordId}`),
  
  // Reports
  getInventoryValuation: (pharmacyId: string) =>
    apiService.get(`/api/v2/inventory/${pharmacyId}/valuation`),
  
  getSalesReport: (pharmacyId: string, params: any) =>
    apiService.get(`/api/v2/reports/${pharmacyId}/sales`, params),
};

// Medicine API
export const medicineApi = {
  search: (query: string, limit?: number) =>
    apiService.get('/api/v2/medicines/search', { q: query, limit }),
  
  getMedicine: (id: string) =>
    apiService.get(`/api/v2/medicines/${id}`),
};

// ------------------------------------------------------------------------------