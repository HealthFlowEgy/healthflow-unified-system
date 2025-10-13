// File: frontend/regulatory-portal/src/services/auditLog.service.ts
// Purpose: API client for audit logs

import axios from 'axios';
import type {
  AuditSearchParams,
  AuditSearchResponse,
  PhiAccessSummary,
  Anomalies,
} from '../types/audit.types';

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

export const auditLogService = {
  /**
   * Search audit logs
   */
  async search(params: AuditSearchParams): Promise<AuditSearchResponse> {
    const response = await api.get('/audit/logs', { params });
    return response.data;
  },

  /**
   * Get PHI access summary
   */
  async getPhiAccessSummary(timeRange: '24h' | '7d' | '30d' | '90d'): Promise<PhiAccessSummary> {
    const response = await api.get('/audit/phi-access', {
      params: { timeRange },
    });
    return response.data.data;
  },

  /**
   * Detect anomalies
   */
  async detectAnomalies(): Promise<Anomalies> {
    const response = await api.get('/audit/anomalies');
    return response.data.data;
  },

  /**
   * Export audit logs to CSV
   */
  async exportToCsv(params: AuditSearchParams): Promise<Blob> {
    const response = await api.post(
      '/audit/export',
      { ...params, format: 'csv' },
      { responseType: 'blob' }
    );
    return response.data;
  },
};

