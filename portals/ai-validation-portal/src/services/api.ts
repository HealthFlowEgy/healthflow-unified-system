/**
 * Enhanced HealthFlow API Service
 * Handles all API communications with the backend
 * International Best Practices Implementation
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios'

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1'
const FHIR_BASE_URL = process.env.REACT_APP_FHIR_URL || '/fhir'

// Create axios instance for API
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Create axios instance for FHIR
const fhirClient: AxiosInstance = axios.create({
  baseURL: FHIR_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/fhir+json',
    'Accept': 'application/fhir+json',
  },
})

// Request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API Service Class
export class ApiService {
  // Health and System Information
  static async healthCheck() {
    const response = await apiClient.get('/health')
    return response.data
  }

  static async getVersion() {
    const response = await apiClient.get('/version')
    return response.data
  }

  static async getAnalyticsDashboard() {
    const response = await apiClient.get('/analytics/dashboard')
    return response.data
  }

  // Authentication
  static async login(username: string, password: string) {
    const response = await apiClient.post('/auth/login', {
      username,
      password,
    })
    
    // Store token in localStorage
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token)
    }
    
    return response.data
  }

  static async register(userData: {
    username: string
    password: string
    email: string
    role: string
    profile?: any
  }) {
    const response = await apiClient.post('/auth/register', userData)
    return response.data
  }

  static async logout() {
    localStorage.removeItem('access_token')
    // In a real implementation, you might want to call a logout endpoint
    return { success: true }
  }

  static async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }
    
    const response = await apiClient.post('/auth/refresh', {
      refresh_token: refreshToken
    })
    
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token)
    }
    
    return response.data
  }

  // Prescriptions
  static async getPrescriptions(params: {
    page?: number
    per_page?: number
    status?: string
    patient_id?: string
    doctor_id?: string
  } = {}) {
    const response = await apiClient.get('/prescriptions', { params })
    return response.data
  }

  static async getPrescription(id: string) {
    const response = await apiClient.get(`/prescriptions/${id}`)
    return response.data
  }

  static async uploadPrescription(file: File, metadata?: any) {
    const formData = new FormData()
    formData.append('file', file)
    
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata))
    }
    
    const response = await apiClient.post('/prescriptions/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        )
        console.log(`Upload Progress: ${percentCompleted}%`)
      },
    })
    return response.data
  }

  static async validatePrescription(prescriptionId: string) {
    const response = await apiClient.post(`/prescriptions/${prescriptionId}/validate`)
    return response.data
  }

  static async approvePrescription(prescriptionId: string, notes?: string) {
    const response = await apiClient.post(`/prescriptions/${prescriptionId}/approve`, {
      notes
    })
    return response.data
  }

  static async rejectPrescription(prescriptionId: string, reason: string) {
    const response = await apiClient.post(`/prescriptions/${prescriptionId}/reject`, {
      reason
    })
    return response.data
  }

  // AI and Validation Services
  static async analyzeImage(file: File) {
    const formData = new FormData()
    formData.append('image', file)
    
    const response = await apiClient.post('/ai/analyze-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  static async checkDrugInteractions(medications: string[]) {
    const response = await apiClient.post('/ai/drug-interactions', {
      medications
    })
    return response.data
  }

  static async getClinicalDecisionSupport(prescriptionData: any) {
    const response = await apiClient.post('/ai/clinical-decision-support', prescriptionData)
    return response.data
  }

  // Patient Management
  static async getPatients(params: {
    page?: number
    per_page?: number
    search?: string
  } = {}) {
    const response = await apiClient.get('/patients', { params })
    return response.data
  }

  static async getPatient(id: string) {
    const response = await apiClient.get(`/patients/${id}`)
    return response.data
  }

  static async createPatient(patientData: any) {
    const response = await apiClient.post('/patients', patientData)
    return response.data
  }

  static async updatePatient(id: string, patientData: any) {
    const response = await apiClient.put(`/patients/${id}`, patientData)
    return response.data
  }

  // Doctor/Practitioner Management
  static async getPractitioners(params: {
    page?: number
    per_page?: number
    specialty?: string
  } = {}) {
    const response = await apiClient.get('/practitioners', { params })
    return response.data
  }

  static async getPractitioner(id: string) {
    const response = await apiClient.get(`/practitioners/${id}`)
    return response.data
  }

  // Audit and Compliance
  static async getAuditLogs(params: {
    page?: number
    per_page?: number
    action?: string
    user_id?: string
    start_date?: string
    end_date?: string
  } = {}) {
    const response = await apiClient.get('/audit/logs', { params })
    return response.data
  }

  static async getComplianceReport(type: string, period: string) {
    const response = await apiClient.get(`/compliance/report/${type}`, {
      params: { period }
    })
    return response.data
  }

  // FHIR Services
  static async getFhirMetadata() {
    const response = await fhirClient.get('/metadata')
    return response.data
  }

  static async getFhirPatients(params: any = {}) {
    const response = await fhirClient.get('/Patient', { params })
    return response.data
  }

  static async getFhirPatient(id: string) {
    const response = await fhirClient.get(`/Patient/${id}`)
    return response.data
  }

  static async createFhirMedicationRequest(medicationRequest: any) {
    const response = await fhirClient.post('/MedicationRequest', medicationRequest)
    return response.data
  }

  static async getFhirMedicationRequests(params: any = {}) {
    const response = await fhirClient.get('/MedicationRequest', { params })
    return response.data
  }

  // Notifications and Messaging
  static async getNotifications(params: {
    page?: number
    per_page?: number
    unread_only?: boolean
  } = {}) {
    const response = await apiClient.get('/notifications', { params })
    return response.data
  }

  static async markNotificationAsRead(id: string) {
    const response = await apiClient.put(`/notifications/${id}/read`)
    return response.data
  }

  static async sendMessage(recipientId: string, message: string, type: string = 'general') {
    const response = await apiClient.post('/messages', {
      recipient_id: recipientId,
      message,
      type
    })
    return response.data
  }

  // Settings and Configuration
  static async getUserSettings() {
    const response = await apiClient.get('/settings/user')
    return response.data
  }

  static async updateUserSettings(settings: any) {
    const response = await apiClient.put('/settings/user', settings)
    return response.data
  }

  static async getSystemSettings() {
    const response = await apiClient.get('/settings/system')
    return response.data
  }

  // File Management
  static async uploadFile(file: File, category: string = 'general') {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', category)
    
    const response = await apiClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  static async downloadFile(fileId: string) {
    const response = await apiClient.get(`/files/${fileId}/download`, {
      responseType: 'blob'
    })
    return response.data
  }

  static async deleteFile(fileId: string) {
    const response = await apiClient.delete(`/files/${fileId}`)
    return response.data
  }

  // Search and Discovery
  static async searchGlobal(query: string, filters: any = {}) {
    const response = await apiClient.get('/search', {
      params: { q: query, ...filters }
    })
    return response.data
  }

  static async searchMedications(query: string) {
    const response = await apiClient.get('/medications/search', {
      params: { q: query }
    })
    return response.data
  }

  static async getMedicationInfo(medicationId: string) {
    const response = await apiClient.get(`/medications/${medicationId}`)
    return response.data
  }
}

export default ApiService

// Export types for TypeScript
export interface User {
  id: string
  username: string
  role: string
  permissions: string[]
  profile: {
    name: string
    specialty?: string
    license?: string
  }
}

export interface Prescription {
  id: string
  patient_id: string
  patient_name: string
  doctor_id: string
  doctor_name: string
  date_created: string
  status: string
  medications: Medication[]
  validation_score: number
  ai_analysis: {
    drug_interactions: string
    dosage_validation: string
    contraindications: string
  }
}

export interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
  snomed_code?: string
}

export interface HealthStatus {
  status: string
  service: string
  version: string
  timestamp: string
  environment: string
  features: Record<string, boolean>
  compliance: Record<string, boolean>
}

