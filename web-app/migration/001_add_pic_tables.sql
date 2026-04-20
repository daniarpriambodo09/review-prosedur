-- Migration: Add PIC (Person In Charge) authentication and request management tables

-- Create pic_users table for storing PIC credentials and info
CREATE TABLE IF NOT EXISTS pic_users (
    id SERIAL PRIMARY KEY,
    pic_name VARCHAR(200) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(200),
    department VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pic_users_pic_name ON pic_users(pic_name);
CREATE INDEX IF NOT EXISTS idx_pic_users_is_active ON pic_users(is_active);

-- Create pic_requests table for tracking review and new document requests
CREATE TABLE IF NOT EXISTS pic_requests (
    id SERIAL PRIMARY KEY,
    pic_id INTEGER NOT NULL,
    request_type VARCHAR(50) NOT NULL, -- 'review' or 'new_document'
    document_numbers TEXT, -- JSON array for review requests, NULL for new document requests
    document_title VARCHAR(500), -- For new document requests
    document_level VARCHAR(50), -- For new document requests
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, rejected
    requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pic_id) REFERENCES pic_users(id) ON DELETE CASCADE
);

-- Create index for pic_requests
CREATE INDEX IF NOT EXISTS idx_pic_requests_pic_id ON pic_requests(pic_id);
CREATE INDEX IF NOT EXISTS idx_pic_requests_status ON pic_requests(status);
CREATE INDEX IF NOT EXISTS idx_pic_requests_request_type ON pic_requests(request_type);

-- Create pic_activity_log table for audit trail
CREATE TABLE IF NOT EXISTS pic_activity_log (
    id SERIAL PRIMARY KEY,
    pic_id INTEGER NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'login', 'document_review', 'new_request', 'logout'
    document_number VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pic_id) REFERENCES pic_users(id) ON DELETE CASCADE
);

-- Create index for activity log
CREATE INDEX IF NOT EXISTS idx_pic_activity_log_pic_id ON pic_activity_log(pic_id);
CREATE INDEX IF NOT EXISTS idx_pic_activity_log_created_at ON pic_activity_log(created_at);

-- Ensure updated_at is automatically updated
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Create triggers for auto-update of updated_at
DROP TRIGGER IF EXISTS update_pic_users_updated_at ON pic_users;
CREATE TRIGGER update_pic_users_updated_at 
    BEFORE UPDATE ON pic_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pic_requests_updated_at ON pic_requests;
CREATE TRIGGER update_pic_requests_updated_at 
    BEFORE UPDATE ON pic_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample PIC user (password: pic123456 - will be hashed)
-- This is just for testing, use proper bcrypt hashing in application
INSERT INTO pic_users (pic_name, password_hash, email, department, is_active)
VALUES ('PIC-001', '$2b$10$e88cZLkDbJEEDhNmPKxGXuTEfQH0BVMdKuDxqpMbKZs8f6rZj6KX2', 'pic001@example.com', 'Quality Assurance', true)
ON CONFLICT DO NOTHING;
