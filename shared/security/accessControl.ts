/**
 * Role-Based Access Control (RBAC)
 * HIPAA-compliant access control
 */

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  PHARMACIST = 'PHARMACIST',
  PATIENT = 'PATIENT',
  RECEPTIONIST = 'RECEPTIONIST'
}

export enum Permission {
  // Patient permissions
  VIEW_PATIENT = 'VIEW_PATIENT',
  CREATE_PATIENT = 'CREATE_PATIENT',
  UPDATE_PATIENT = 'UPDATE_PATIENT',
  DELETE_PATIENT = 'DELETE_PATIENT',
  
  // Prescription permissions
  VIEW_PRESCRIPTION = 'VIEW_PRESCRIPTION',
  CREATE_PRESCRIPTION = 'CREATE_PRESCRIPTION',
  UPDATE_PRESCRIPTION = 'UPDATE_PRESCRIPTION',
  DELETE_PRESCRIPTION = 'DELETE_PRESCRIPTION',
  
  // Appointment permissions
  VIEW_APPOINTMENT = 'VIEW_APPOINTMENT',
  CREATE_APPOINTMENT = 'CREATE_APPOINTMENT',
  UPDATE_APPOINTMENT = 'UPDATE_APPOINTMENT',
  DELETE_APPOINTMENT = 'DELETE_APPOINTMENT',
  
  // Medical record permissions
  VIEW_MEDICAL_RECORD = 'VIEW_MEDICAL_RECORD',
  CREATE_MEDICAL_RECORD = 'CREATE_MEDICAL_RECORD',
  UPDATE_MEDICAL_RECORD = 'UPDATE_MEDICAL_RECORD',
  
  // Payment permissions
  VIEW_PAYMENT = 'VIEW_PAYMENT',
  PROCESS_PAYMENT = 'PROCESS_PAYMENT',
  REFUND_PAYMENT = 'REFUND_PAYMENT',
  
  // Admin permissions
  MANAGE_USERS = 'MANAGE_USERS',
  MANAGE_ROLES = 'MANAGE_ROLES',
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',
  EXPORT_DATA = 'EXPORT_DATA'
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),
  
  [Role.ADMIN]: [
    Permission.VIEW_PATIENT,
    Permission.CREATE_PATIENT,
    Permission.UPDATE_PATIENT,
    Permission.VIEW_APPOINTMENT,
    Permission.CREATE_APPOINTMENT,
    Permission.UPDATE_APPOINTMENT,
    Permission.VIEW_PAYMENT,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_USERS
  ],
  
  [Role.DOCTOR]: [
    Permission.VIEW_PATIENT,
    Permission.UPDATE_PATIENT,
    Permission.VIEW_PRESCRIPTION,
    Permission.CREATE_PRESCRIPTION,
    Permission.UPDATE_PRESCRIPTION,
    Permission.VIEW_MEDICAL_RECORD,
    Permission.CREATE_MEDICAL_RECORD,
    Permission.UPDATE_MEDICAL_RECORD,
    Permission.VIEW_APPOINTMENT,
    Permission.CREATE_APPOINTMENT,
    Permission.UPDATE_APPOINTMENT
  ],
  
  [Role.NURSE]: [
    Permission.VIEW_PATIENT,
    Permission.UPDATE_PATIENT,
    Permission.VIEW_PRESCRIPTION,
    Permission.VIEW_MEDICAL_RECORD,
    Permission.UPDATE_MEDICAL_RECORD,
    Permission.VIEW_APPOINTMENT,
    Permission.UPDATE_APPOINTMENT
  ],
  
  [Role.PHARMACIST]: [
    Permission.VIEW_PATIENT,
    Permission.VIEW_PRESCRIPTION,
    Permission.UPDATE_PRESCRIPTION
  ],
  
  [Role.PATIENT]: [
    Permission.VIEW_PRESCRIPTION,
    Permission.VIEW_APPOINTMENT,
    Permission.CREATE_APPOINTMENT,
    Permission.VIEW_PAYMENT
  ],
  
  [Role.RECEPTIONIST]: [
    Permission.VIEW_PATIENT,
    Permission.CREATE_PATIENT,
    Permission.UPDATE_PATIENT,
    Permission.VIEW_APPOINTMENT,
    Permission.CREATE_APPOINTMENT,
    Permission.UPDATE_APPOINTMENT,
    Permission.VIEW_PAYMENT
  ]
};

class AccessControlService {
  hasPermission(role: Role, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  hasAnyPermission(role: Role, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(role, permission));
  }

  hasAllPermissions(role: Role, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(role, permission));
  }

  getRolePermissions(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  canAccessResource(role: Role, resource: string, action: string): boolean {
    const permission = `${action.toUpperCase()}_${resource.toUpperCase()}` as Permission;
    return this.hasPermission(role, permission);
  }
}

export const accessControlService = new AccessControlService();
