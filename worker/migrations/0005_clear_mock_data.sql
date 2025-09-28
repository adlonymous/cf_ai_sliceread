-- Clear all mock data from the database
-- This migration removes all sample data to start fresh

-- Delete all user access records
DELETE FROM user_access;

-- Delete all user payments
DELETE FROM user_payments;

-- Delete all sections
DELETE FROM sections;

-- Delete all textbooks
DELETE FROM textbooks;

-- Reset auto-increment counters
DELETE FROM sqlite_sequence WHERE name IN ('textbooks', 'sections', 'user_payments', 'user_access');

-- Rebuild the full-text search index
INSERT INTO sections_fts(sections_fts) VALUES('rebuild');
