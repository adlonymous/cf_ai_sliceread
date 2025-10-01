# R2 Storage Optimization for Fractional Document Unlock

This document describes the R2 bucket integration and storage optimization features implemented for the Fractional Document Unlock application.

## Overview

The application now supports a hybrid storage approach:
- **D1 Database**: Small PDFs (< 1MB) stored as base64-encoded blobs
- **R2 Bucket**: Larger PDFs stored as objects with public URLs
- **External Storage**: Legacy support for external storage references

## Features

### 1. Automatic Storage Selection
- Files ≤ 1MB are stored in D1 as base64 blobs
- Files > 1MB are automatically stored in R2 bucket
- Maintains backward compatibility with existing external storage

### 2. R2 Bucket Integration
- **Bucket Name**: `fractional-document-pdfs`
- **Key Structure**: `pdfs/{textbook_slug}/{resource_id}.pdf`
- **Public URLs**: `https://pub-{bucket_id}.r2.dev/{key}`
- **Caching**: 1-year cache control for optimal performance

### 3. Database Schema Updates
New fields added to `sections` table:
- `r2_key`: R2 bucket object key
- `r2_url`: Public URL for R2 stored PDFs
- Updated constraint to allow any of: `pdf_blob`, `external_key`, or `r2_key`

## API Endpoints

### Core Endpoints (Updated)
- `GET /section/:resource_id/content` - Now returns R2 URLs when applicable
- `POST /admin/upload` - Automatically chooses storage method based on file size

### New Admin Endpoints

#### Storage Management
- `POST /admin/migrate-to-r2` - Migrate all D1 blobs to R2
- `GET /admin/storage-analysis` - Analyze storage usage and get recommendations
- `POST /admin/optimize-storage?threshold=0.5` - Migrate large files to R2
- `POST /admin/cleanup-orphaned` - Clean up orphaned R2 objects

#### Storage Analysis Response
```json
{
  "success": true,
  "analysis": {
    "d1Blobs": {
      "count": 10,
      "totalSize": 5242880,
      "avgSize": 524288
    },
    "r2Objects": {
      "count": 5,
      "totalSize": 15728640,
      "avgSize": 3145728
    },
    "recommendations": [
      "Consider migrating D1 blobs to R2 (avg size: 0.50MB)"
    ]
  },
  "breakdown": [
    {
      "textbook_slug": "blockchain-fundamentals",
      "textbook_title": "Blockchain Fundamentals",
      "total_sections": 15,
      "d1_sections": 10,
      "r2_sections": 5,
      "external_sections": 0,
      "total_size": 20971520,
      "d1_size": 5242880,
      "r2_size": 15728640
    }
  ]
}
```

## Migration Guide

### 1. Deploy the Updated Worker
```bash
cd worker
npm run deploy
```

### 2. Apply Database Migration
```bash
npx wrangler d1 migrations apply fractional_document_unlock --remote
```

### 3. Create R2 Bucket
```bash
npx wrangler r2 bucket create fractional-document-pdfs
```

### 4. Migrate Existing Data (Optional)
```bash
# Migrate all D1 blobs to R2
curl -X POST https://your-worker.your-subdomain.workers.dev/admin/migrate-to-r2

# Or migrate only large files (>0.5MB)
curl -X POST "https://your-worker.your-subdomain.workers.dev/admin/optimize-storage?threshold=0.5"
```

## Storage Optimization Workflow

### 1. Analyze Current Storage
```bash
curl -X GET https://your-worker.your-subdomain.workers.dev/admin/storage-analysis
```

### 2. Optimize Based on Analysis
```bash
# Migrate files larger than 0.5MB to R2
curl -X POST "https://your-worker.your-subdomain.workers.dev/admin/optimize-storage?threshold=0.5"
```

### 3. Clean Up Orphaned Objects
```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/admin/cleanup-orphaned
```

## Benefits

### Performance
- **Faster Loading**: R2 objects load directly from CDN
- **Reduced Database Size**: Large files moved out of D1
- **Better Caching**: 1-year cache control for R2 objects

### Cost Optimization
- **D1 Storage**: Only small files stored in expensive D1 storage
- **R2 Storage**: Large files stored in cost-effective R2 bucket
- **Bandwidth**: Reduced bandwidth usage for large file transfers

### Scalability
- **No Size Limits**: R2 supports files up to 5TB
- **Global CDN**: R2 objects served from global edge locations
- **Concurrent Access**: Better handling of multiple simultaneous requests

## Configuration

### Wrangler Configuration
```jsonc
{
  "r2_buckets": [
    {
      "binding": "PDF_STORAGE",
      "bucket_name": "fractional-document-pdfs"
    }
  ]
}
```

### Environment Variables
- `PDF_STORAGE`: R2 bucket binding (automatically configured)

## Monitoring and Maintenance

### Regular Tasks
1. **Weekly**: Run storage analysis to monitor usage
2. **Monthly**: Clean up orphaned R2 objects
3. **Quarterly**: Review and optimize storage thresholds

### Health Checks
```bash
# Check storage health
curl -X GET https://your-worker.your-subdomain.workers.dev/admin/storage-analysis

# Verify R2 bucket access
curl -X GET https://pub-{bucket_id}.r2.dev/pdfs/test/test.pdf
```

## Troubleshooting

### Common Issues

1. **R2 Bucket Not Found**
   - Ensure bucket is created: `npx wrangler r2 bucket create fractional-document-pdfs`
   - Check bucket name in wrangler.jsonc

2. **Migration Failures**
   - Check R2 bucket permissions
   - Verify file sizes are within R2 limits
   - Review error messages in migration response

3. **Performance Issues**
   - Monitor R2 bucket metrics in Cloudflare dashboard
   - Check CDN cache hit rates
   - Consider adjusting cache control headers

### Debug Commands
```bash
# Check database schema
npx wrangler d1 execute fractional_document_unlock --command "PRAGMA table_info(sections);"

# List R2 objects
npx wrangler r2 object list fractional-document-pdfs

# Check specific section storage
npx wrangler d1 execute fractional_document_unlock --command "SELECT resource_id, pdf_blob IS NOT NULL as has_d1, r2_key IS NOT NULL as has_r2 FROM sections LIMIT 5;"
```

## Future Enhancements

1. **Signed URLs**: Implement signed URLs for private access
2. **Compression**: Add automatic PDF compression before storage
3. **Thumbnails**: Generate and store PDF thumbnails
4. **Analytics**: Track download patterns and optimize storage accordingly
5. **Multi-Region**: Deploy R2 buckets in multiple regions for global performance
