/**
 * API Configuration for Doctor Portal
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
};

export const API_ENDPOINTS = {
  // Auth
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    register: '/api/auth/register',
    refresh: '/api/auth/refresh',
    me: '/api/auth/me'
  },

  // Doctor
  doctor: {
    profile: '/api/doctors/profile',
    updateProfile: '/api/doctors/profile',
    statistics: '/api/doctors/statistics',
    templates: '/api/doctors/templates',
    createTemplate: '/api/doctors/templates'
  },

  // Patients
  patients: {
    list: '/api/patients',
    create: '/api/patients',
    get: (id: string) => `/api/patients/${id}`,
    update: (id: string) => `/api/patients/${id}`,
    delete: (id: string) => `/api/patients/${id}`,
    allergies: (id: string) => `/api/patients/${id}/allergies`,
    medicalHistory: (id: string) => `/api/patients/${id}/medical-history`
  },

  // Prescriptions
  prescriptions: {
    list: '/api/prescriptions',
    create: '/api/prescriptions',
    get: (id: string) => `/api/prescriptions/${id}`,
    submit: (id: string) => `/api/prescriptions/${id}/submit`,
    updateStatus: (id: string) => `/api/prescriptions/${id}/status`,
    history: (id: string) => `/api/prescriptions/${id}/history`
  },

  // Medicines
  medicines: {
    search: '/api/medicines',
    get: (id: string) => `/api/medicines/${id}`,
    checkInteractions: '/api/medicines/check-interactions',
    categories: '/api/medicines/categories'
  },

  // Health
  health: '/health'
};

export default API_CONFIG;