// File: frontend/regulatory-portal/src/services/adverseEvent.service.ts
// Purpose: API client for adverse event reporting

import axios from 'axios';
import { AdverseEvent, AdverseEventFormData, AdverseEventStatistics } from '../types/adverseEvent.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const BASE_PATH = '/api/v2/eda/adverse-events';

// Mock auth token - replace with real authentication
const getAuthToken = () => 'mock-jwt-token';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const adverseEventService = {
  /**
   * Submit a new adverse event report
   */
  async submitReport(data: AdverseEventFormData): Promise<AdverseEvent> {
    const response = await api.post(BASE_PATH, data);
    return response.data.data;
  },

  /**
   * Get adverse event by ID
   */
  async getById(id: string): Promise<AdverseEvent> {
    const response = await api.get(`${BASE_PATH}/${id}`);
    return response.data.data;
  },

  /**
   * Search adverse events
   */
  async search(params: {
    query?: string;
    severity?: string;
    status?: string;
    medicineId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ events: AdverseEvent[]; pagination: any }> {
    const response = await api.get(BASE_PATH, { params });
    return {
      events: response.data.data,
      pagination: response.data.pagination,
    };
  },

  /**
   * Update adverse event status
   */
  async updateStatus(
    id: string,
    status: string,
    metadata?: any
  ): Promise<AdverseEvent> {
    const response = await api.put(`${BASE_PATH}/${id}/status`, {
      status,
      ...metadata,
    });
    return response.data.data;
  },

  /**
   * Get adverse event statistics
   */
  async getStatistics(timeRange?: string): Promise<AdverseEventStatistics> {
    const response = await api.get(`${BASE_PATH}/statistics`, {
      params: { timeRange },
    });
    return response.data.data;
  },
};

