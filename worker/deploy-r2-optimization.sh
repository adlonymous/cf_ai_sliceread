#!/bin/bash

# R2 Storage Optimization Deployment Script
# This script sets up R2 bucket storage for the Fractional Document Unlock application

set -e

echo "🚀 Starting R2 Storage Optimization Deployment..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if we're in the worker directory
if [ ! -f "wrangler.jsonc" ]; then
    echo "❌ Please run this script from the worker directory"
    exit 1
fi

echo "📦 Creating R2 bucket..."
# Create R2 bucket (ignore error if it already exists)
wrangler r2 bucket create fractional-document-pdfs || echo "Bucket may already exist"

echo "🗄️ Applying database migrations..."
# Apply migrations to add R2 support
wrangler d1 migrations apply fractional_document_unlock --remote

echo "🚀 Deploying worker with R2 support..."
# Deploy the updated worker
wrangler deploy

echo "✅ Deployment complete!"
echo ""
echo "📊 Next steps:"
echo "1. Test the storage analysis: curl -X GET https://your-worker.your-subdomain.workers.dev/admin/storage-analysis"
echo "2. Migrate existing PDFs: curl -X POST https://your-worker.your-subdomain.workers.dev/admin/migrate-to-r2"
echo "3. Monitor storage usage and optimize as needed"
echo ""
echo "📚 For more information, see R2_STORAGE_OPTIMIZATION.md"
