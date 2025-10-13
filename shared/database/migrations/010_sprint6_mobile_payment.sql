-- Sprint 6: Mobile API, Payment, WebSocket Tables
-- Migration: 010_sprint6_mobile_payment.sql

-- Push Notification Tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  device_type VARCHAR(50) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  platform_version VARCHAR(50),
  app_version VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  tenant_id UUID NOT NULL
);

CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_device ON push_tokens(device_id);
CREATE INDEX idx_push_tokens_active ON push_tokens(is_active);

-- Offline Sync Queue
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  action VARCHAR(20) NOT NULL,
  data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  synced_at TIMESTAMP,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  tenant_id UUID NOT NULL
);

CREATE INDEX idx_sync_queue_user ON sync_queue(user_id);
CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_priority ON sync_queue(priority);

-- Mobile Sessions
CREATE TABLE IF NOT EXISTS mobile_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  refresh_token TEXT NOT NULL UNIQUE,
  device_id VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  platform VARCHAR(20) NOT NULL,
  app_version VARCHAR(50),
  ip_address VARCHAR(45),
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  tenant_id UUID NOT NULL
);

CREATE INDEX idx_mobile_sessions_user ON mobile_sessions(user_id);
CREATE INDEX idx_mobile_sessions_token ON mobile_sessions(refresh_token);

-- App Analytics Events
CREATE TABLE IF NOT EXISTS app_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_name VARCHAR(100) NOT NULL,
  event_category VARCHAR(50) NOT NULL,
  device_id VARCHAR(255),
  platform VARCHAR(20),
  app_version VARCHAR(50),
  properties JSONB,
  screen_name VARCHAR(100),
  session_id UUID,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  tenant_id UUID NOT NULL
);

CREATE INDEX idx_app_events_user ON app_events(user_id);
CREATE INDEX idx_app_events_name ON app_events(event_name);
CREATE INDEX idx_app_events_timestamp ON app_events(timestamp);

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  token TEXT NOT NULL,
  last4 VARCHAR(4),
  brand VARCHAR(50),
  expiry_month VARCHAR(2),
  expiry_year VARCHAR(4),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  tenant_id UUID NOT NULL
);

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(is_default);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EGP' NOT NULL,
  status VARCHAR(20) NOT NULL,
  type VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  provider_transaction_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  tenant_id UUID NOT NULL
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created ON transactions(created_at);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  pdf_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_invoices_transaction ON invoices(transaction_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

COMMENT ON TABLE push_tokens IS 'Push notification device tokens for mobile apps';
COMMENT ON TABLE sync_queue IS 'Offline sync queue for mobile app data synchronization';
COMMENT ON TABLE mobile_sessions IS 'Mobile app session management with refresh tokens';
COMMENT ON TABLE app_events IS 'Mobile app analytics and event tracking';
COMMENT ON TABLE payment_methods IS 'User payment methods (cards, wallets)';
COMMENT ON TABLE transactions IS 'Payment transactions and history';
COMMENT ON TABLE invoices IS 'Payment invoices and receipts';
