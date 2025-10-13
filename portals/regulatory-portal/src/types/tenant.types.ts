// File: frontend/regulatory-portal/src/types/tenant.types.ts
// Purpose: Type definitions for tenant management

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'regulatory_agency' | 'eda';
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  governorate?: string;
  postalCode?: string;
  country?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  licenseStatus?: 'active' | 'expired' | 'suspended' | 'revoked';
  settings?: any;
  featuresEnabled?: any;
  subscriptionTier?: 'basic' | 'professional' | 'enterprise';
  maxUsers?: number;
  currentUsers?: number;
  status?: 'active' | 'suspended' | 'inactive' | 'pending_approval';
  suspensionReason?: string;
  suspendedAt?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantStatistics {
  totalTenants: number;
  activeTenants: number;
  byType: { [key: string]: number };
  bySubscriptionTier: { [key: string]: number };
  totalUsers: number;
  averageUsersPerTenant: number;
}

export interface TenantFormData {
  name: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'regulatory_agency' | 'eda';
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  governorate?: string;
  postalCode?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  subscriptionTier?: 'basic' | 'professional' | 'enterprise';
  maxUsers?: number;
}

