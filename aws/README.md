# Vinco MAM - AWS Infrastructure

This directory contains the AWS CDK infrastructure code for the Vinco MAM platform.

## Quick Deploy

**Option 1: Use the deployment script (Recommended)**
```bash
cd aws
./deploy.sh
```

**Option 2: Manual deployment**
```bash
cd aws

# Set region
export CDK_DEFAULT_REGION=eu-west-2
export AWS_DEFAULT_REGION=eu-west-2

# Bootstrap (first time only)
npx cdk bootstrap --region eu-west-2

# Deploy
npx cdk deploy --region eu-west-2
```

## Prerequisites

1. **Docker Desktop** - Required for container Lambda functions
   - Download: https://www.docker.com/products/docker-desktop/
   - Must be installed AND running

2. **AWS CLI** configured with credentials
   ```bash
   aws configure
   ```

3. **Node.js 20.x** installed

4. **CDK dependencies** installed
   ```bash
   npm install
   ```

## What Gets Deployed

### S3 Buckets
- `vinco-uploads` - Incoming photo uploads
- `vinco-images` - Processed images (proxies, thumbnails)
- `vinco-exports` - Temporary export files (7-day expiry)
- `vinco-platform-storage` - Platform storage and backups

### DynamoDB Tables
- `vinco-images` - Image metadata
- `vinco-edit-versions` - Edit history
- `vinco-validation-queue` - AI recognition validation queue
- `vinco-albums` - Album collections
- `vinco-export-presets` - Export configuration presets
- `vinco-websocket-connections` - Active WebSocket connections

### Lambda Functions
- **Image Processor** (Node.js) - Processes JPEG/TIFF uploads
- **RAW Processor** (Python/Docker) - Converts RAW camera files
- **AI Recognition** (Node.js) - Face detection and athlete recognition
- **Export Renderer** (Python/Docker) - Renders final exports

### Network Infrastructure
- **VPC** - Virtual private cloud with public/private subnets
- **VPC Endpoints** - S3 and DynamoDB endpoints for secure access
- **NAT Gateway** - For private subnet internet access

### API Infrastructure
- **API Gateway** (REST) - HTTP API for WordPress integration
- **WebSocket API** - Real-time event streaming
- **SQS Queues** - Async processing queues

## Region

All resources are deployed to **eu-west-2** (London) by default.

## After Deployment

1. **Create Rekognition Collection:**
   ```bash
   aws rekognition create-collection --collection-id vinco-athletes --region eu-west-2
   ```

2. **Get deployment outputs:**
   - API Endpoint (for WordPress plugin)
   - WebSocket Endpoint (for real-time updates)
   - Platform Storage Bucket name
   - VPC ID

3. **Update WordPress plugin settings** with the endpoints from the deployment output.

## Troubleshooting

### "Docker not found" error
- Install Docker Desktop: https://www.docker.com/products/docker-desktop/
- Start Docker Desktop
- Verify with: `docker --version`

### Wrong region
- The deployment script sets `eu-west-2` explicitly
- If deploying manually, ensure both `CDK_DEFAULT_REGION` and `AWS_DEFAULT_REGION` are set

### Bootstrap errors
- Bootstrap only needs to run once per AWS account/region
- If already bootstrapped, you can skip this step

## Local Development

For local Lambda testing, use AWS SAM CLI or deploy to a dev stack.

## Cost Considerations

- VPC with NAT Gateway: ~$32/month
- DynamoDB: Pay-per-request (very low for development)
- Lambda: Pay per invocation
- S3: Pay per GB storage and requests
- S3 Glacier: Used for long-term storage (cheaper)
