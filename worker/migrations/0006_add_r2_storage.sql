-- Add R2 storage support to sections table
-- This migration adds fields to support storing PDFs in R2 buckets

-- Add R2 URL field for storing PDFs in R2 bucket
ALTER TABLE sections ADD COLUMN r2_key TEXT;

-- Add R2 URL field for public access
ALTER TABLE sections ADD COLUMN r2_url TEXT;

-- Add index for R2 key lookups
CREATE INDEX idx_sections_r2_key ON sections(r2_key);
