-- Buat database baru
CREATE DATABASE procedure_management;

-- Connect ke database
\c procedure_management

-- Buat tabel procedure_documents
CREATE TABLE procedure_documents (
    id SERIAL PRIMARY KEY,
    nama_dokumen VARCHAR(500) NOT NULL,
    nomor_dokumen VARCHAR(100) UNIQUE NOT NULL,
    level_dokumen VARCHAR(50) NOT NULL,
    tanggal_selesai_approval VARCHAR(50), -- nullable: terisi otomatis saat seluruh tahap approval selesai
    revisi VARCHAR(20) NOT NULL,
    owner VARCHAR(200) NOT NULL,
    pic VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT '-',
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Buat index untuk performa
CREATE INDEX idx_pic ON procedure_documents(pic);
CREATE INDEX idx_nomor_dokumen ON procedure_documents(nomor_dokumen);
CREATE INDEX idx_status ON procedure_documents(status);

-- Buat tabel document_reviews
CREATE TABLE document_reviews (
    id SERIAL PRIMARY KEY,
    nomor_dokumen VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    revisi VARCHAR(20) NOT NULL,
    last_reviewed_month INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(nomor_dokumen, last_reviewed_month)
);

-- Buat index untuk document_reviews
CREATE INDEX idx_review_nomor ON document_reviews(nomor_dokumen);
CREATE INDEX idx_review_month ON document_reviews(last_reviewed_month);

-- Buat function untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Buat trigger untuk procedure_documents
CREATE TRIGGER update_procedure_documents_updated_at 
    BEFORE UPDATE ON procedure_documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Buat trigger untuk document_reviews
CREATE TRIGGER update_document_reviews_updated_at 
    BEFORE UPDATE ON document_reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Verifikasi tabel sudah dibuat
\dt

-- Lihat struktur tabel
\d procedure_documents
\d document_reviews

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Buat index
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Buat trigger untuk update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123)
-- Password ini adalah hash bcrypt dari 'admin123'
INSERT INTO users (username, password, full_name, email, role) 
VALUES (
    'admin', 
    '$2a$10$8K1p/a0dL3LKzLYkeG6pKOeW5MHFwJeKqKxwlYq.b6rKzZ8NRQ8Rm', 
    'Administrator',
    'admin@jai.co.id',
    'admin'
);

-- Verifikasi
SELECT * FROM users;


CREATE TABLE procedure_files (
    id SERIAL PRIMARY KEY,
    nomor_dokumen VARCHAR(100) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT NOT NULL, -- dalam bytes
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    uploaded_by VARCHAR(100), -- username dari users table
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key ke procedure_documents
    CONSTRAINT fk_procedure_files_nomor_dokumen 
        FOREIGN KEY (nomor_dokumen) 
        REFERENCES procedure_documents(nomor_dokumen) 
        ON DELETE CASCADE
);

CREATE INDEX idx_procedure_files_nomor_dokumen ON procedure_files(nomor_dokumen);
CREATE INDEX idx_procedure_files_is_active ON procedure_files(is_active);
CREATE INDEX idx_procedure_files_version ON procedure_files(version);

CREATE OR REPLACE VIEW active_procedure_files AS
SELECT DISTINCT ON (nomor_dokumen)
    id,
    nomor_dokumen,
    file_name,
    file_path,
    file_size,
    mime_type,
    version,
    uploaded_by,
    uploaded_at
FROM procedure_files
WHERE is_active = true
ORDER BY nomor_dokumen, version DESC, uploaded_at DESC;

SELECT * FROM active_procedure_files LIMIT 5;

-- npx tsx scripts/migrate-documents.ts

-- Buat tabel activity_logs
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    username VARCHAR(100),
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT NOT NULL,
    target_type VARCHAR(50), -- 'procedure', 'file', 'review', 'user'
    target_id VARCHAR(100), -- nomor_dokumen atau id lainnya
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Buat index untuk performa
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_user ON activity_logs(username);
CREATE INDEX idx_activity_logs_type ON activity_logs(activity_type);

-- Verifikasi
\d activity_logs