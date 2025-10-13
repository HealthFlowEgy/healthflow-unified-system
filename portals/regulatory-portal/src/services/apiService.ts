/**
 * API Service for Regulatory Portal
 * Handles all API calls through unified gateway
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';

class APIService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create(API_CONFIG);

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Token Management
  private getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private setToken(token: string): void {
    localStorage.setItem('accessToken', token);
  }

  private clearToken(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // Authentication
  async login(email: string, password: string) {
    const response = await this.client.post(API_ENDPOINTS.auth.login, {
      email,
      password
    });

    if (response.data.access_token) {
      this.setToken(response.data.access_token);
      localStorage.setItem('refreshToken', response.data.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
  }

  async logout() {
    try {
      await this.client.post(API_ENDPOINTS.auth.logout);
    } finally {
      this.clearToken();
    }
  }

  async getCurrentUser() {
    const response = await this.client.get(API_ENDPOINTS.auth.me);
    return response.data;
  }

  // Regulatory - Compliance Reports
  async getComplianceReports(filters?: any) {
    const response = await this.client.get(
      API_ENDPOINTS.regulatory.getComplianceReports,
      { params: filters }
    );
    return response.data;
  }

  async submitComplianceReport(reportData: any) {
    const response = await this.client.post(
      API_ENDPOINTS.regulatory.submitComplianceReport,
      reportData
    );
    return response.data;
  }

  // Regulatory - Drug Recalls
  async getDrugRecalls(filters?: any) {
    const response = await this.client.get(
      API_ENDPOINTS.regulatory.getDrugRecalls,
      { params: filters }
    );
    return response.data;
  }

  async submitDrugRecall(recallData: any) {
    const response = await this.client.post(
      API_ENDPOINTS.regulatory.submitDrugRecall,
      recallData
    );
    return response.data;
  }

  // Regulatory - Monitoring
  async getSuspiciousActivities(filters?: any) {
    const response = await this.client.get(
      API_ENDPOINTS.regulatory.getSuspiciousActivities,
      { params: filters }
    );
    return response.data;
  }

  async getPrescriptionPatterns(filters?: any) {
    const response = await this.client.get(
      API_ENDPOINTS.regulatory.getPrescriptionPatterns,
      { params: filters }
    );
    return response.data;
  }

  // Regulatory - Analytics
  async getStatistics(dateRange?: { from: string; to: string }) {
    const response = await this.client.get(
      API_ENDPOINTS.regulatory.getStatistics,
      { params: dateRange }
    );
    return response.data;
  }

  async getViolations(filters?: any) {
    const response = await this.client.get(
      API_ENDPOINTS.regulatory.getViolations,
      { params: filters }
    );
    return response.data;
  }

  // Health Check
  async healthCheck() {
    const response = await this.client.get(API_ENDPOINTS.health);
    return response.data;
  }
}

// Export singleton instance
export const apiService = new APIService();
export default apiService;