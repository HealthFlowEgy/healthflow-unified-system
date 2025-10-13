// Sprint 3 - API Service with Token Management
// ------------------------------------------------------------------------------

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import NetInfo from '@react-native-community/netinfo';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000/api/v2' 
  : 'https://api.healthflow.egypt.gov/api/v2';

class ApiService {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: any[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Check network connectivity
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          throw new Error('No internet connection');
        }

        // Add auth token
        const credentials = await Keychain.getGenericPassword();
        if (credentials) {
          config.headers.Authorization = `Bearer ${credentials.password}`;
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
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers!.Authorization = `Bearer ${token}`;
                return this.client(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await AsyncStorage.getItem('refreshToken');
            if (!refreshToken) throw new Error('No refresh token');

            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });

            const { accessToken } = response.data.data;

            await Keychain.setGenericPassword('accessToken', accessToken);
            
            this.processQueue(null, accessToken);
            originalRequest.headers!.Authorization = `Bearer ${accessToken}`;
            
            return this.client(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            
            // Clear auth data
            await Keychain.resetGenericPassword();
            await AsyncStorage.multiRemove(['refreshToken', 'user']);
            
            // Navigate to login (handle this in auth context)
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });

    this.failedQueue = [];
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.client.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.put<T>(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.patch<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.client.delete<T>(url, config);
  }
}

const apiService = new ApiService();

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiService.post('/auth/login', { email, password }),
  
  register: (userData: any) =>
    apiService.post('/auth/register', userData),
  
  logout: () =>
    apiService.post('/auth/logout'),
  
  refreshToken: (refreshToken: string) =>
    apiService.post('/auth/refresh', { refreshToken }),
  
  validateToken: (token: string) =>
    apiService.post('/auth/validate', { token }),
  
  updateProfile: (updates: any) =>
    apiService.patch('/auth/profile', updates),
  
  forgotPassword: (email: string) =>
    apiService.post('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) =>
    apiService.post('/auth/reset-password', { token, password }),
};

// Prescription API
export const prescriptionApi = {
  create: (prescriptionData: any) =>
    apiService.post('/prescriptions', prescriptionData),
  
  list: (params?: any) =>
    apiService.get('/prescriptions', { params }),
  
  get: (id: string) =>
    apiService.get(`/prescriptions/${id}`),
  
  update: (id: string, updates: any) =>
    apiService.put(`/prescriptions/${id}`, updates),
  
  submit: (id: string) =>
    apiService.post(`/prescriptions/${id}/submit`),
  
  cancel: (id: string, reason: string) =>
    apiService.post(`/prescriptions/${id}/cancel`, { reason }),
};

// Medicine API
export const medicineApi = {
  search: (query: string, limit = 20) =>
    apiService.get('/medicines/search', { params: { q: query, limit } }),
  
  get: (id: string) =>
    apiService.get(`/medicines/${id}`),
  
  alternatives: (id: string) =>
    apiService.get(`/medicines/${id}/alternatives`),
  
  checkInteractions: (medicineIds: string[]) =>
    apiService.post('/medicines/interactions', { medicineIds }),
};

// Pharmacy API (for mobile)
export const pharmacyApi = {
  nearby: (latitude: number, longitude: number, radius = 5000) =>
    apiService.get('/pharmacies/nearby', {
      params: { latitude, longitude, radius },
    }),
  
  search: (query: string) =>
    apiService.get('/pharmacies/search', { params: { q: query } }),
  
  get: (id: string) =>
    apiService.get(`/pharmacies/${id}`),
  
  checkAvailability: (pharmacyId: string, medicineIds: string[]) =>
    apiService.post(`/pharmacies/${pharmacyId}/check-availability`, { medicineIds }),
};

export default apiService;
</artifact>

Perfect! Let me continue with more mobile app screens:

<artifact identifier="sprint3-mobile-screens" type="application/vnd.ant.code" language="typescript" title="Mobile App Core Screens - Doctor & Pharmacist">