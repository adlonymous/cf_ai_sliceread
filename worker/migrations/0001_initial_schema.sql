-- Initial schema for Fractional Document Unlock app
-- This migration creates tables for storing textbook sections and payment tracking

-- Table for storing textbook metadata
CREATE TABLE textbooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    price_sats INTEGER NOT NULL, -- Price in satoshis
    word_count INTEGER,
    summary TEXT, -- AI-generated summary for better search
    keywords TEXT, -- Comma-separated keywords for search
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (textbook_id) REFERENCES textbooks(id) ON DELETE CASCADE,
    UNIQUE(textbook_id, section_number)
);

-- Table for tracking user payment states
CREATE TABLE user_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL, -- User identifier (could be wallet address, session ID, etc.)
    section_id INTEGER NOT NULL,
    payment_hash TEXT, -- Lightning payment hash
    payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
    amount_sats INTEGER NOT NULL,
    paid_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    UNIQUE(user_id, section_id)
);

-- Table for tracking user access (denormalized for fast queries)
CREATE TABLE user_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    section_id INTEGER NOT NULL,
    textbook_id INTEGER NOT NULL,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    FOREIGN KEY (textbook_id) REFERENCES textbooks(id) ON DELETE CASCADE,
    UNIQUE(user_id, section_id)
);

-- Indexes for better query performance
CREATE INDEX idx_sections_textbook_id ON sections(textbook_id);
CREATE INDEX idx_sections_keywords ON sections(keywords);
CREATE INDEX idx_user_payments_user_id ON user_payments(user_id);
CREATE INDEX idx_user_payments_section_id ON user_payments(section_id);
CREATE INDEX idx_user_access_user_id ON user_access(user_id);
CREATE INDEX idx_user_access_textbook_id ON user_access(textbook_id);

-- Full-text search index for section content and titles
CREATE VIRTUAL TABLE sections_fts USING fts5(
    title,
    content,
    summary,
    keywords,
    content='sections',
    content_rowid='id'
);
