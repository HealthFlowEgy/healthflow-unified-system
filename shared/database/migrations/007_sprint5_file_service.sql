-- Sprint 5: File Service Tables
-- Migration: 007_sprint5_file_service.sql

-- Files table
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    category VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    description TEXT,
    tags JSONB,
    is_public BOOLEAN DEFAULT FALSE,
    uploaded_by UUID NOT NULL,
    uploaded_by_name VARCHAR(255),
    tenant_id UUID,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_files_category ON files(category);
CREATE INDEX idx_files_entity ON files(entity_type, entity_id);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX idx_files_tenant_id ON files(tenant_id);
CREATE INDEX idx_files_created_at ON files(created_at);
CREATE INDEX idx_files_deleted_at ON files(deleted_at);

-- File access log table
CREATE TABLE IF NOT EXISTS file_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_file_access_log_file_id ON file_access_log(file_id);
CREATE INDEX idx_file_access_log_user_id ON file_access_log(user_id);
CREATE INDEX idx_file_access_log_action ON file_access_log(action);
CREATE INDEX idx_file_access_log_created_at ON file_access_log(created_at);

-- File shares table
CREATE TABLE IF NOT EXISTS file_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL,
    shared_with UUID,
    shared_with_email VARCHAR(255),
    access_level VARCHAR(20) NOT NULL,
    expires_at TIMESTAMP,
    access_token VARCHAR(255),
    access_count INTEGER DEFAULT 0,
    max_access_count INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_file_shares_file_id ON file_shares(file_id);
CREATE INDEX idx_file_shares_shared_with ON file_shares(shared_with);
CREATE INDEX idx_file_shares_access_token ON file_shares(access_token);
CREATE INDEX idx_file_shares_is_active ON file_shares(is_active);

COMMENT ON TABLE files IS 'Stores metadata for uploaded files';
COMMENT ON TABLE file_access_log IS 'Logs all file access events';
COMMENT ON TABLE file_shares IS 'Manages file sharing permissions';
