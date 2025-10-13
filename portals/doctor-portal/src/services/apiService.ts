/**
 * API Service for Doctor Portal
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';

class APIService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create(API_CONFIG);

    // Request interceptor
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

    // Response interceptor
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
    localStorage.removeItem('user');
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

  // Doctor
  async getDoctorProfile() {
    const response = await this.client.get(API_ENDPOINTS.doctor.profile);
    return response.data;
  }

  async updateDoctorProfile(data: any) {
    const response = await this.client.put(API_ENDPOINTS.doctor.updateProfile, data);
    return response.data;
  }

  async getDoctorStatistics() {
    const response = await this.client.get(API_ENDPOINTS.doctor.statistics);
    return response.data;
  }

  async getPrescriptionTemplates() {
    const response = await this.client.get(API_ENDPOINTS.doctor.templates);
    return response.data;
  }

  // Patients
  async searchPatients(params?: any) {
    const response = await this.client.get(API_ENDPOINTS.patients.list, { params });
    return response.data;
  }

  async createPatient(data: any) {
    const response = await this.client.post(API_ENDPOINTS.patients.create, data);
    return response.data;
  }

  async getPatient(id: string) {
    const response = await this.client.get(API_ENDPOINTS.patients.get(id));
    return response.data;
  }

  async updatePatient(id: string, data: any) {
    const response = await this.client.put(API_ENDPOINTS.patients.update(id), data);
    return response.data;
  }

  async getPatientAllergies(id: string) {
    const response = await this.client.get(API_ENDPOINTS.patients.allergies(id));
    return response.data;
  }

  async addPatientAllergy(id: string, data: any) {
    const response = await this.client.post(API_ENDPOINTS.patients.allergies(id), data);
    return response.data;
  }

  async getPatientMedicalHistory(id: string) {
    const response = await this.client.get(API_ENDPOINTS.patients.medicalHistory(id));
    return response.data;
  }

  async addMedicalHistoryEntry(id: string, data: any) {
    const response = await this.client.post(API_ENDPOINTS.patients.medicalHistory(id), data);
    return response.data;
  }

  // Prescriptions
  async getPrescriptions(params?: any) {
    const response = await this.client.get(API_ENDPOINTS.prescriptions.list, { params });
    return response.data;
  }

  async createPrescription(data: any) {
    const response = await this.client.post(API_ENDPOINTS.prescriptions.create, data);
    return response.data;
  }

  async getPrescription(id: string) {
    const response = await this.client.get(API_ENDPOINTS.prescriptions.get(id));
    return response.data;
  }

  async submitPrescriptionForValidation(id: string) {
    const response = await this.client.post(API_ENDPOINTS.prescriptions.submit(id));
    return response.data;
  }

  async getPrescriptionHistory(id: string) {
    const response = await this.client.get(API_ENDPOINTS.prescriptions.history(id));
    return response.data;
  }

  // Medicines
  async searchMedicines(params?: any) {
    const response = await this.client.get(API_ENDPOINTS.medicines.search, { params });
    return response.data;
  }

  async getMedicine(id: string) {
    const response = await this.client.get(API_ENDPOINTS.medicines.get(id));
    return response.data;
  }

  async checkDrugInteractions(medicineIds: string[]) {
    const response = await this.client.post(API_ENDPOINTS.medicines.checkInteractions, {
      medicineIds
    });
    return response.data;
  }

  // Health check
  async healthCheck() {
    const response = await this.client.get(API_ENDPOINTS.health);
    return response.data;
  }
}

export const apiService = new APIService();
export default apiService;