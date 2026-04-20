-- Migration: Add PIC (Person In Charge) authentication and request management tables

-- Create pic_users table for storing PIC credentials and info
CREATE TABLE IF NOT EXISTS pic_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(200) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    department VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pic_users_email ON pic_users(email);
CREATE INDEX IF NOT EXISTS idx_pic_users_is_active ON pic_users(is_active);

-- Create pic_documents table for documents assigned to PICs
CREATE TABLE IF NOT EXISTS pic_documents (
    id SERIAL PRIMARY KEY,
    pic_id INTEGER NOT NULL,
    document_number VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pic_id) REFERENCES pic_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pic_documents_pic_id ON pic_documents(pic_id);
CREATE INDEX IF NOT EXISTS idx_pic_documents_status ON pic_documents(status);

-- Create pic_requests table for tracking review requests
CREATE TABLE IF NOT EXISTS pic_requests (
    id SERIAL PRIMARY KEY,
    pic_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pic_id) REFERENCES pic_users(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES pic_documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pic_requests_pic_id ON pic_requests(pic_id);
CREATE INDEX IF NOT EXISTS idx_pic_requests_status ON pic_requests(status);

-- Create pic_document_requests table for new document requests
CREATE TABLE IF NOT EXISTS pic_document_requests (
    id SERIAL PRIMARY KEY,
    pic_id INTEGER NOT NULL,
    document_number VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pic_id) REFERENCES pic_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pic_document_requests_pic_id ON pic_document_requests(pic_id);
CREATE INDEX IF NOT EXISTS idx_pic_document_requests_status ON pic_document_requests(status);

-- Create pic_activities table for audit trail
CREATE TABLE IF NOT EXISTS pic_activities (
    id SERIAL PRIMARY KEY,
    pic_id INTEGER NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    description VARCHAR(500),
    ip_address VARCHAR(50),
    user_agent TEXT,
    target_type VARCHAR(50),
    target_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pic_id) REFERENCES pic_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pic_activities_pic_id ON pic_activities(pic_id);
CREATE INDEX IF NOT EXISTS idx_pic_activities_activity_type ON pic_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_pic_activities_created_at ON pic_activities(created_at);

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

DROP TRIGGER IF EXISTS update_pic_documents_updated_at ON pic_documents;
CREATE TRIGGER update_pic_documents_updated_at 
    BEFORE UPDATE ON pic_documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pic_requests_updated_at ON pic_requests;
CREATE TRIGGER update_pic_requests_updated_at 
    BEFORE UPDATE ON pic_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pic_document_requests_updated_at ON pic_document_requests;
CREATE TRIGGER update_pic_document_requests_updated_at 
    BEFORE UPDATE ON pic_document_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
