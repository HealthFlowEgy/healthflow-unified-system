// File: frontend/regulatory-portal/src/services/medicine.service.ts
// Purpose: API client for medicines

import axios from 'axios';
import type {
  Medicine,
  MedicineSearchParams,
  MedicineSearchResponse,
  BulkUploadResult,
} from '../types/medicine.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v2/eda`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const medicineService = {
  /**
   * Create a new medicine
   */
  async create(medicine: Medicine): Promise<Medicine> {
    const response = await api.post('/medicines', medicine);
    return response.data.data;
  },

  /**
   * Bulk upload medicines
   */
  async bulkUpload(fileContent: string, fileType: 'csv' | 'excel'): Promise<BulkUploadResult> {
    const response = await api.post('/medicines/bulk', {
      fileContent,
      fileType,
    });
    return response.data.data;
  },

  /**
   * Get medicine by ID
   */
  async getById(id: string): Promise<Medicine> {
    const response = await api.get(`/medicines/${id}`);
    return response.data.data;
  },

  /**
   * Search medicines
   */
  async search(params: MedicineSearchParams): Promise<MedicineSearchResponse> {
    const response = await api.get('/medicines', { params });
    return response.data;
  },

  /**
   * Update medicine
   */
  async update(id: string, updates: Partial<Medicine>): Promise<Medicine> {
    const response = await api.put(`/medicines/${id}`, updates);
    return response.data.data;
  },

  /**
   * Delete medicine
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/medicines/${id}`);
  },
};

