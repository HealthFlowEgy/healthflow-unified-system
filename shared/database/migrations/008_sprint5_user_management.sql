-- Sprint 5: User Management Service Tables
-- Migration: 008_sprint5_user_management.sql

-- Organizations/Tenants table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL, -- hospital, clinic, pharmacy, lab
    status VARCHAR(20) DEFAULT 'active',
    license_number VARCHAR(100),
    tax_id VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(20),
    address JSONB,
    settings JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_status ON organizations(status);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES organizations(id),
    is_system_role BOOLEAN DEFAULT FALSE,
    permissions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_roles_slug ON roles(slug);
CREATE INDEX idx_roles_organization_id ON roles(organization_id);
CREATE INDEX idx_roles_is_system_role ON roles(is_system_role);

-- Users table (extended)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    organization_id UUID REFERENCES organizations(id),
    metadata JSONB,
    last_login_at TIMESTAMP,
    password_changed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_status ON users(status);

-- User roles mapping
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_action ON permissions(action);
CREATE INDEX idx_permissions_category ON permissions(category);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    changes JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Insert default system roles
INSERT INTO roles (name, slug, description, is_system_role, permissions) VALUES
('Super Admin', 'super_admin', 'Full system access', TRUE, '["*"]'),
('Admin', 'admin', 'Organization administrator', TRUE, '["users:*", "roles:*", "settings:*"]'),
('Doctor', 'doctor', 'Medical doctor', TRUE, '["patients:read", "patients:write", "prescriptions:*", "appointments:*"]'),
('Nurse', 'nurse', 'Nurse', TRUE, '["patients:read", "appointments:read"]'),
('Pharmacist', 'pharmacist', 'Pharmacist', TRUE, '["prescriptions:read", "medicines:*"]'),
('Patient', 'patient', 'Patient', TRUE, '["profile:*", "appointments:read", "prescriptions:read"]'),
('Receptionist', 'receptionist', 'Receptionist', TRUE, '["appointments:*", "patients:read"]')
ON CONFLICT DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (name, slug, description, resource, action, category) VALUES
('View Users', 'users:read', 'View user information', 'users', 'read', 'user_management'),
('Create Users', 'users:create', 'Create new users', 'users', 'create', 'user_management'),
('Update Users', 'users:update', 'Update user information', 'users', 'update', 'user_management'),
('Delete Users', 'users:delete', 'Delete users', 'users', 'delete', 'user_management'),
('View Roles', 'roles:read', 'View roles', 'roles', 'read', 'user_management'),
('Manage Roles', 'roles:manage', 'Create and update roles', 'roles', 'manage', 'user_management'),
('View Patients', 'patients:read', 'View patient information', 'patients', 'read', 'clinical'),
('Manage Patients', 'patients:write', 'Create and update patients', 'patients', 'write', 'clinical'),
('View Prescriptions', 'prescriptions:read', 'View prescriptions', 'prescriptions', 'read', 'clinical'),
('Create Prescriptions', 'prescriptions:create', 'Create prescriptions', 'prescriptions', 'create', 'clinical'),
('View Appointments', 'appointments:read', 'View appointments', 'appointments', 'read', 'clinical'),
('Manage Appointments', 'appointments:manage', 'Create and update appointments', 'appointments', 'manage', 'clinical')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE organizations IS 'Organizations/tenants in the system';
COMMENT ON TABLE roles IS 'User roles with permissions';
COMMENT ON TABLE users IS 'System users';
COMMENT ON TABLE user_roles IS 'User-role mappings';
COMMENT ON TABLE permissions IS 'System permissions';
COMMENT ON TABLE audit_logs IS 'Audit trail for all actions';
