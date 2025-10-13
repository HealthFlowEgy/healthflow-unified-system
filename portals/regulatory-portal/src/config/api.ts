/**
 * API Configuration for Regulatory Portal
 * Updated to use unified API Gateway
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
  // Auth endpoints (via API Gateway)
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    me: '/api/auth/me'
  },

  // Regulatory endpoints (via API Gateway)
  regulatory: {
    // EDA Compliance
    getComplianceReports: '/api/regulatory/compliance/reports',
    submitComplianceReport: '/api/regulatory/compliance/submit',
    
    // Drug Recalls
    getDrugRecalls: '/api/regulatory/recalls',
    submitDrugRecall: '/api/regulatory/recalls/submit',
    
    // Monitoring
    getSuspiciousActivities: '/api/regulatory/monitoring/suspicious',
    getPrescriptionPatterns: '/api/regulatory/monitoring/patterns',
    
    // Analytics
    getStatistics: '/api/regulatory/analytics/statistics',
    getViolations: '/api/regulatory/analytics/violations'
  },

  // Health check
  health: '/health'
};

export default API_CONFIG;