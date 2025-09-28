# Database Commands Reference

This document contains all the useful commands for managing and inspecting your D1 database for the Fractional Document Unlock app.

## **Basic Database Management**

### **List all databases**
```bash
npx wrangler d1 list
```

### **Execute SQL commands**
```bash
# Single command
npx wrangler d1 execute fractional_document_unlock --command "YOUR_SQL_HERE"

# From file
npx wrangler d1 execute fractional_document_unlock --file query.sql

# Interactive shell
npx wrangler d1 execute fractional_document_unlock --local
```

### **Run migrations**
```bash
# Apply all pending migrations
npx wrangler d1 migrations apply fractional_document_unlock

# List migration status
npx wrangler d1 migrations list fractional_document_unlock

# Apply to remote database
npx wrangler d1 migrations apply fractional_document_unlock --remote
```

## **Database Inspection Commands**

### **Check Database Structure**
```bash
# List all tables
npx wrangler d1 execute fractional_document_unlock --command "SELECT name FROM sqlite_master WHERE type='table';"

# Get table schema
npx wrangler d1 execute fractional_document_unlock --command "PRAGMA table_info(textbooks);"
npx wrangler d1 execute fractional_document_unlock --command "PRAGMA table_info(sections);"
npx wrangler d1 execute fractional_document_unlock --command "PRAGMA table_info(user_payments);"
npx wrangler d1 execute fractional_document_unlock --command "PRAGMA table_info(user_access);"

# List all indexes
npx wrangler d1 execute fractional_document_unlock --command "SELECT name FROM sqlite_master WHERE type='index';"
```

### **View Data**
```bash
# View all textbooks
npx wrangler d1 execute fractional_document_unlock --command "SELECT * FROM textbooks;"

# View sections with pricing
npx wrangler d1 execute fractional_document_unlock --command "SELECT resource_id, title, currency_code, price_minor_units, mime_type, size_bytes FROM sections;"

# View user payments
npx wrangler d1 execute fractional_document_unlock --command "SELECT * FROM user_payments;"

# View user access
npx wrangler d1 execute fractional_document_unlock --command "SELECT * FROM user_access;"

# Count records in each table
npx wrangler d1 execute fractional_document_unlock --command "
SELECT 
  'textbooks' as table_name, COUNT(*) as row_count FROM textbooks
UNION ALL
SELECT 
  'sections' as table_name, COUNT(*) as row_count FROM sections
UNION ALL
SELECT 
  'user_payments' as table_name, COUNT(*) as row_count FROM user_payments
UNION ALL
SELECT 
  'user_access' as table_name, COUNT(*) as row_count FROM user_access;
"
```

## **Search and Query Commands**

### **Full-Text Search**
```bash
# Search for sections containing "bitcoin"
npx wrangler d1 execute fractional_document_unlock --command "SELECT s.title, s.summary FROM sections s JOIN sections_fts fts ON s.id = fts.rowid WHERE sections_fts MATCH 'bitcoin';"

# Search for sections containing "blockchain"
npx wrangler d1 execute fractional_document_unlock --command "SELECT s.title, s.summary FROM sections s JOIN sections_fts fts ON s.id = fts.rowid WHERE sections_fts MATCH 'blockchain';"

# Search for sections containing "cryptography"
npx wrangler d1 execute fractional_document_unlock --command "SELECT s.title, s.summary FROM sections s JOIN sections_fts fts ON s.id = fts.rowid WHERE sections_fts MATCH 'cryptography';"

# Search with ranking
npx wrangler d1 execute fractional_document_unlock --command "SELECT s.title, s.summary, rank FROM sections s JOIN sections_fts fts ON s.id = fts.rowid WHERE sections_fts MATCH 'consensus' ORDER BY rank;"
```

### **Filtered Queries**
```bash
# Get sections by textbook
npx wrangler d1 execute fractional_document_unlock --command "SELECT s.* FROM sections s JOIN textbooks t ON s.textbook_id = t.id WHERE t.slug = 'blockchain-fundamentals';"

# Get sections by price range
npx wrangler d1 execute fractional_document_unlock --command "SELECT resource_id, title, price_minor_units FROM sections WHERE price_minor_units BETWEEN 100000 AND 200000;"

# Get sections by currency
npx wrangler d1 execute fractional_document_unlock --command "SELECT resource_id, title, currency_code, price_minor_units FROM sections WHERE currency_code = 'BTC';"

# Get user's accessible sections
npx wrangler d1 execute fractional_document_unlock --command "SELECT s.resource_id, s.title FROM sections s JOIN user_access ua ON s.resource_id = ua.resource_id WHERE ua.user_id = 'user123';"

# Get user's payment history
npx wrangler d1 execute fractional_document_unlock --command "SELECT * FROM user_payments WHERE user_id = 'user123' ORDER BY created_at DESC;"

# Get completed payments only
npx wrangler d1 execute fractional_document_unlock --command "SELECT * FROM user_payments WHERE payment_status = 'completed';"
```

## **Data Management Commands**

### **Insert Test Data**
```bash
# Add a new textbook
npx wrangler d1 execute fractional_document_unlock --command "INSERT INTO textbooks (slug, title, author, description, total_sections) VALUES ('test-book', 'Test Textbook', 'Test Author', 'A test textbook', 0);"

# Add a new section
npx wrangler d1 execute fractional_document_unlock --command "INSERT INTO sections (textbook_id, section_number, resource_id, title, external_key, currency_code, price_minor_units, mime_type, summary, keywords) VALUES (1, 6, 'test-section-001', 'Test Section', 's3://test/test.pdf', 'BTC', 50000, 'application/pdf', 'A test section', 'test, example');"

# Record a test payment
npx wrangler d1 execute fractional_document_unlock --command "INSERT INTO user_payments (user_id, resource_id, currency_code, amount_minor_units, payment_status, facilitator_tx_id, paid_at) VALUES ('testuser', 'blockchain-fundamentals-001', 'BTC', 100000, 'completed', 'test_tx_123', datetime('now'));"

# Grant test access
npx wrangler d1 execute fractional_document_unlock --command "INSERT INTO user_access (user_id, resource_id, textbook_id, granted_at) VALUES ('testuser', 'blockchain-fundamentals-001', 1, datetime('now'));"
```

### **Update Data**
```bash
# Update section price
npx wrangler d1 execute fractional_document_unlock --command "UPDATE sections SET price_minor_units = 120000 WHERE resource_id = 'blockchain-fundamentals-001';"

# Update payment status
npx wrangler d1 execute fractional_document_unlock --command "UPDATE user_payments SET payment_status = 'completed', paid_at = datetime('now') WHERE user_id = 'user123' AND resource_id = 'blockchain-fundamentals-002';"

# Update textbook description
npx wrangler d1 execute fractional_document_unlock --command "UPDATE textbooks SET description = 'Updated description' WHERE slug = 'blockchain-fundamentals';"
```

### **Delete Data**
```bash
# Delete test data
npx wrangler d1 execute fractional_document_unlock --command "DELETE FROM user_access WHERE user_id = 'testuser';"
npx wrangler d1 execute fractional_document_unlock --command "DELETE FROM user_payments WHERE user_id = 'testuser';"
npx wrangler d1 execute fractional_document_unlock --command "DELETE FROM sections WHERE resource_id = 'test-section-001';"
npx wrangler d1 execute fractional_document_unlock --command "DELETE FROM textbooks WHERE slug = 'test-book';"
```

## **Performance and Maintenance Commands**

### **Database Statistics**
```bash
# Get database size and stats
npx wrangler d1 execute fractional_document_unlock --command "PRAGMA page_count;"
npx wrangler d1 execute fractional_document_unlock --command "PRAGMA page_size;"
npx wrangler d1 execute fractional_document_unlock --command "PRAGMA freelist_count;"

# Analyze query performance
npx wrangler d1 execute fractional_document_unlock --command "EXPLAIN QUERY PLAN SELECT * FROM sections s JOIN sections_fts fts ON s.id = fts.rowid WHERE sections_fts MATCH 'bitcoin';"
```

### **Backup and Restore**
```bash
# Export database
npx wrangler d1 export fractional_document_unlock --output backup.sql

# Import from backup
npx wrangler d1 execute fractional_document_unlock --file backup.sql
```

### **Rebuild Full-Text Search Index**
```bash
# Rebuild FTS index after data changes
npx wrangler d1 execute fractional_document_unlock --command "INSERT INTO sections_fts(sections_fts) VALUES('rebuild');"
```

## **Development vs Production**

### **Local Development**
```bash
# All commands above run on local database by default
# Add --local flag to be explicit
npx wrangler d1 execute fractional_document_unlock --local --command "SELECT * FROM textbooks;"
```

### **Production/Remote**
```bash
# Add --remote flag to run on production database
npx wrangler d1 execute fractional_document_unlock --remote --command "SELECT * FROM textbooks;"
npx wrangler d1 migrations apply fractional_document_unlock --remote
```

## **Common Troubleshooting**

### **Check Migration Status**
```bash
# See which migrations have been applied
npx wrangler d1 migrations list fractional_document_unlock
```

### **Reset Database (DANGER - deletes all data)**
```bash
# Only use for development!
npx wrangler d1 execute fractional_document_unlock --command "DROP TABLE IF EXISTS sections_fts; DROP TABLE IF EXISTS user_access; DROP TABLE IF EXISTS user_payments; DROP TABLE IF EXISTS sections; DROP TABLE IF EXISTS textbooks;"
```

### **Verify Data Integrity**
```bash
# Check for orphaned records
npx wrangler d1 execute fractional_document_unlock --command "SELECT s.resource_id FROM sections s LEFT JOIN textbooks t ON s.textbook_id = t.id WHERE t.id IS NULL;"

# Check for missing foreign keys
npx wrangler d1 execute fractional_document_unlock --command "SELECT up.resource_id FROM user_payments up LEFT JOIN sections s ON up.resource_id = s.resource_id WHERE s.resource_id IS NULL;"
```

## **Quick Health Check Script**

Create a file called `health_check.sql`:
```sql
-- Database Health Check
SELECT 'Tables' as check_type, COUNT(*) as count FROM sqlite_master WHERE type='table'
UNION ALL
SELECT 'Textbooks', COUNT(*) FROM textbooks
UNION ALL
SELECT 'Sections', COUNT(*) FROM sections
UNION ALL
SELECT 'User Payments', COUNT(*) FROM user_payments
UNION ALL
SELECT 'User Access', COUNT(*) FROM user_access
UNION ALL
SELECT 'FTS Index', COUNT(*) FROM sections_fts;
```

Then run:
```bash
npx wrangler d1 execute fractional_document_unlock --file health_check.sql
```
