// File: frontend/regulatory-portal/src/services/recall.service.ts
// Purpose: API client for recall management

import axios from 'axios';
import { Recall, RecallFormData, RecallStatistics } from '../types/recall.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const BASE_PATH = '/api/v2/eda/recalls';

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

export const recallService = {
  /**
   * Initiate a new recall
   */
  async initiateRecall(data: RecallFormData): Promise<Recall> {
    const response = await api.post(BASE_PATH, data);
    return response.data.data;
  },

  /**
   * Get recall by ID
   */
  async getById(id: string): Promise<Recall> {
    const response = await api.get(`${BASE_PATH}/${id}`);
    return response.data.data;
  },

  /**
   * Search recalls
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
  }): Promise<{ recalls: Recall[]; pagination: any }> {
    const response = await api.get(BASE_PATH, { params });
    return {
      recalls: response.data.data,
      pagination: response.data.pagination,
    };
  },

  /**
   * Update recall status
   */
  async updateStatus(
    id: string,
    status: string,
    metadata?: any
  ): Promise<Recall> {
    const response = await api.put(`${BASE_PATH}/${id}/status`, {
      status,
      ...metadata,
    });
    return response.data.data;
  },

  /**
   * Get recall statistics
   */
  async getStatistics(timeRange?: string): Promise<RecallStatistics> {
    const response = await api.get(`${BASE_PATH}/statistics`, {
      params: { timeRange },
    });
    return response.data.data;
  },
};

