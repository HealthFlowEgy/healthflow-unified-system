// File: frontend/regulatory-portal/src/services/tenant.service.ts
// Purpose: API client for tenant management

import axios from 'axios';
import { Tenant, TenantStatistics, TenantFormData } from '../types/tenant.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const TenantService = {
  /**
   * Create a new tenant
   */
  async create(data: TenantFormData): Promise<Tenant> {
    const response = await api.post('/api/v2/tenants', data);
    return response.data.data;
  },

  /**
   * Get tenant by ID
   */
  async getById(id: string): Promise<Tenant> {
    const response = await api.get(`/api/v2/tenants/${id}`);
    return response.data.data;
  },

  /**
   * Search tenants
   */
  async search(params: {
    query?: string;
    type?: string;
    status?: string;
    subscriptionTier?: string;
    page?: number;
    limit?: number;
  }): Promise<{ tenants: Tenant[]; pagination: any }> {
    const response = await api.get('/api/v2/tenants', { params });
    return {
      tenants: response.data.data,
      pagination: response.data.pagination,
    };
  },

  /**
   * Update tenant
   */
  async update(id: string, data: Partial<TenantFormData>): Promise<Tenant> {
    const response = await api.put(`/api/v2/tenants/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete tenant
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/api/v2/tenants/${id}`);
  },

  /**
   * Get tenant statistics
   */
  async getStatistics(): Promise<TenantStatistics> {
    const response = await api.get('/api/v2/tenants/statistics');
    return response.data.data;
  },
};

