-- Sprint 5: BI Dashboard Service Tables
-- Migration: 009_sprint5_bi_dashboard.sql

-- Dashboards table
CREATE TABLE IF NOT EXISTS dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    organization_id UUID,
    created_by UUID,
    is_public BOOLEAN DEFAULT FALSE,
    layout JSONB,
    filters JSONB,
    refresh_interval INTEGER DEFAULT 300,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_dashboards_slug ON dashboards(slug);
CREATE INDEX idx_dashboards_organization_id ON dashboards(organization_id);

-- Widgets table
CREATE TABLE IF NOT EXISTS widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- chart, table, metric, map
    query TEXT NOT NULL,
    config JSONB,
    position JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_widgets_dashboard_id ON widgets(dashboard_id);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- scheduled, on_demand
    query TEXT NOT NULL,
    parameters JSONB,
    schedule JSONB,
    format VARCHAR(20) DEFAULT 'pdf',
    recipients JSONB,
    organization_id UUID,
    created_by UUID,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_reports_organization_id ON reports(organization_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_next_run_at ON reports(next_run_at);

-- Report executions table
CREATE TABLE IF NOT EXISTS report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    file_url VARCHAR(500),
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_report_executions_report_id ON report_executions(report_id);
CREATE INDEX idx_report_executions_status ON report_executions(status);

-- Metrics cache table
CREATE TABLE IF NOT EXISTS metrics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_key VARCHAR(255) UNIQUE NOT NULL,
    metric_value JSONB NOT NULL,
    organization_id UUID,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_metrics_cache_metric_key ON metrics_cache(metric_key);
CREATE INDEX idx_metrics_cache_organization_id ON metrics_cache(organization_id);
CREATE INDEX idx_metrics_cache_expires_at ON metrics_cache(expires_at);

COMMENT ON TABLE dashboards IS 'BI dashboards configuration';
COMMENT ON TABLE widgets IS 'Dashboard widgets';
COMMENT ON TABLE reports IS 'Scheduled and on-demand reports';
COMMENT ON TABLE report_executions IS 'Report execution history';
COMMENT ON TABLE metrics_cache IS 'Cached metrics for performance';
