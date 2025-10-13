// File: frontend/regulatory-portal/src/services/user.service.ts
// Purpose: API client for user management

import axios from 'axios';
import { User, UserTenant, Invitation, Role } from '../types/user.types';

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

export const UserService = {
  /**
   * Add user to tenant
   */
  async addUserToTenant(tenantId: string, userId: string, roleId: string): Promise<UserTenant> {
    const response = await api.post(`/api/v2/tenants/${tenantId}/users`, {
      userId,
      roleId,
    });
    return response.data.data;
  },

  /**
   * Remove user from tenant
   */
  async removeUserFromTenant(tenantId: string, userId: string): Promise<void> {
    await api.delete(`/api/v2/tenants/${tenantId}/users/${userId}`);
  },

  /**
   * Update user role
   */
  async updateUserRole(tenantId: string, userId: string, roleId: string): Promise<UserTenant> {
    const response = await api.put(`/api/v2/tenants/${tenantId}/users/${userId}/role`, {
      roleId,
    });
    return response.data.data;
  },

  /**
   * Get tenant users
   */
  async getTenantUsers(tenantId: string): Promise<any[]> {
    const response = await api.get(`/api/v2/tenants/${tenantId}/users`);
    return response.data.data;
  },

  /**
   * Get user's tenants
   */
  async getUserTenants(userId: string): Promise<UserTenant[]> {
    const response = await api.get(`/api/v2/users/${userId}/tenants`);
    return response.data.data;
  },

  /**
   * Create invitation
   */
  async createInvitation(tenantId: string, email: string, roleId: string): Promise<Invitation> {
    const response = await api.post(`/api/v2/tenants/${tenantId}/invitations`, {
      email,
      roleId,
    });
    return response.data.data;
  },

  /**
   * Accept invitation
   */
  async acceptInvitation(token: string): Promise<UserTenant> {
    const response = await api.post(`/api/v2/invitations/${token}/accept`);
    return response.data.data;
  },

  /**
   * Check user permission
   */
  async checkPermission(userId: string, tenantId: string, permission: string): Promise<boolean> {
    const response = await api.post(`/api/v2/users/${userId}/permissions/check`, {
      tenantId,
      permission,
    });
    return response.data.data.hasPermission;
  },
};

