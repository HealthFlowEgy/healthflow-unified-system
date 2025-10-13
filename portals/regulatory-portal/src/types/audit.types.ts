// File: frontend/regulatory-portal/src/types/audit.types.ts
// Purpose: Type definitions for audit logs

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  resource: string;
  resourceId?: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  phiAccessed: boolean;
  errorMessage?: string;
  timestamp: string;
}

export interface AuditSearchParams {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  action?: string;
  resource?: string;
  phiAccessed?: boolean;
  page?: number;
  limit?: number;
}

export interface AuditSearchResponse {
  success: boolean;
  data: AuditLog[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface PhiAccessSummary {
  summary: {
    total_accesses: number;
    unique_users: number;
    unique_patients: number;
  };
  byRole: Array<{
    user_role: string;
    count: number;
  }>;
  byHour: Array<{
    hour: number;
    count: number;
  }>;
}

export interface Anomalies {
  heavyUsers: Array<{
    user_id: string;
    user_email: string;
    user_role: string;
    access_count: number;
  }>;
  afterHoursAccess: Array<{
    user_id: string;
    user_email: string;
    timestamp: string;
    resource: string;
    resource_id: string;
  }>;
}

