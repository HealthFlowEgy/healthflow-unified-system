// File: frontend/regulatory-portal/src/types/user.types.ts
// Purpose: Type definitions for user management

export interface UserTenant {
  id: string;
  userId: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  roleId: string;
  roleName: string;
  status: 'active' | 'inactive' | 'invited' | 'suspended';
  joinedAt: string;
  lastActiveAt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  status: 'active' | 'inactive' | 'suspended';
  tenants: UserTenant[];
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  tenantId: string;
  email: string;
  roleId: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  acceptedAt?: string;
  acceptedBy?: string;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  scope: 'system' | 'tenant';
  tenantId?: string;
  permissions: string[];
  isSystemRole: boolean;
}

