-- Refactored schema for Fractional Document Unlock app
-- This migration updates the schema for PDF storage and improved payment tracking

-- Drop existing tables and recreate with new schema
DROP TABLE IF EXISTS sections_fts;
DROP TABLE IF EXISTS user_access;
DROP TABLE IF EXISTS user_payments;
DROP TABLE IF EXISTS sections;
DROP TABLE IF EXISTS textbooks;

-- Table for storing textbook metadata
CREATE TABLE textbooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL, -- Stable external identifier
    title TEXT NOT NULL,
    author TEXT,
    description TEXT,
    total_sections INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing individual sections of textbooks
CREATE TABLE sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    textbook_id INTEGER NOT NULL,
    section_number INTEGER NOT NULL,
    resource_id TEXT UNIQUE NOT NULL, -- External resource identifier
    title TEXT NOT NULL,
    pdf_blob BLOB, -- PDF content stored as binary
    external_key TEXT, -- Alternative: reference to external storage (S3, etc.)
    currency_code TEXT NOT NULL DEFAULT 'USDC', -- Currency code (USDC only)
    price_minor_units INTEGER NOT NULL, -- Price in minor units (USDC cents)
    mime_type TEXT DEFAULT 'application/pdf', -- MIME type of the resource
    size_bytes INTEGER, -- Size of the resource in bytes
    sha256 TEXT, -- SHA256 hash of the resource for integrity
    word_count INTEGER,
    summary TEXT, -- AI-generated summary for previews
    keywords TEXT, -- Comma-separated keywords for search
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (textbook_id) REFERENCES textbooks(id) ON DELETE CASCADE,
    UNIQUE(textbook_id, section_number),
    CHECK (pdf_blob IS NOT NULL OR external_key IS NOT NULL) -- Either blob or external key must be provided
);

-- Table for tracking user payment states
CREATE TABLE user_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    resource_id TEXT NOT NULL, -- References sections.resource_id
    currency_code TEXT NOT NULL DEFAULT 'USDC',
    amount_minor_units INTEGER NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    facilitator_tx_id TEXT, -- Transaction ID from payment facilitator
    paid_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id) REFERENCES sections(resource_id) ON DELETE CASCADE,
    UNIQUE(user_id, resource_id),
    CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded', 'expired'))
);

-- Optional table for tracking user access (prefer KV for entitlements)
-- This table is kept for backward compatibility but can be removed if using KV
CREATE TABLE user_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    textbook_id INTEGER NOT NULL,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id) REFERENCES sections(resource_id) ON DELETE CASCADE,
    FOREIGN KEY (textbook_id) REFERENCES textbooks(id) ON DELETE CASCADE,
    UNIQUE(user_id, resource_id)
);

-- Indexes for better query performance
CREATE INDEX idx_textbooks_slug ON textbooks(slug);
CREATE INDEX idx_sections_textbook_id ON sections(textbook_id);
CREATE INDEX idx_sections_resource_id ON sections(resource_id);
CREATE INDEX idx_sections_textbook_section ON sections(textbook_id, section_number);
CREATE INDEX idx_sections_keywords ON sections(keywords);
CREATE INDEX idx_user_payments_user_id ON user_payments(user_id);
CREATE INDEX idx_user_payments_resource_id ON user_payments(resource_id);
CREATE INDEX idx_user_payments_user_status ON user_payments(user_id, payment_status);
CREATE INDEX idx_user_payments_status ON user_payments(payment_status);
CREATE INDEX idx_user_access_user_id ON user_access(user_id);
CREATE INDEX idx_user_access_resource_id ON user_access(resource_id);
CREATE INDEX idx_user_access_textbook_id ON user_access(textbook_id);

-- Full-text search index for section titles, summaries, and keywords only
-- Excludes PDF content for performance and security
CREATE VIRTUAL TABLE sections_fts USING fts5(
    title,
    summary,
    keywords,
    content='sections',
    content_rowid='id'
);
