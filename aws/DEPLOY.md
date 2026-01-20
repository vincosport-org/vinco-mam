# AWS Deployment Instructions

## Current Status
⚠️ **Resources have NOT been deployed yet** - only the CDK infrastructure code exists.

## Prerequisites

1. **Docker installed and running** (required for container Lambda functions)
   ```bash
   # Check if Docker is installed
   docker --version
   
   # If not installed, download from: https://www.docker.com/products/docker-desktop/
   ```

2. **AWS CLI configured** with appropriate credentials
   ```bash
   aws configure
   ```

3. **Node.js 20.x installed**

4. **CDK dependencies installed**
   ```bash
   cd aws
   npm install
   ```

## Deploy to eu-west-1 (Ireland)

```bash
cd aws

# Set region explicitly
export CDK_DEFAULT_REGION=eu-west-1
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

# Bootstrap CDK (first time only for this account/region)
npx cdk bootstrap --region eu-west-1

# Deploy the stack
npx cdk deploy --region eu-west-1
```

## What Will Be Created

### S3 Buckets (4 total)
- `vinco-uploads` - Incoming uploads
- `vinco-images` - Processed images  
- `vinco-exports` - Temporary exports (7-day expiry)
- `vinco-platform-storage` - Platform storage and backups (NEW)

### DynamoDB Tables (6 total)
- `vinco-images` - Image metadata
- `vinco-edit-versions` - Edit history
- `vinco-validation-queue` - AI recognition validation
- `vinco-albums` - Albums
- `vinco-export-presets` - Export presets
- `vinco-websocket-connections` - WebSocket connections

### Lambda Functions
- Image Processor (Node.js)
- RAW Processor (Python/Docker) - **Requires Docker**
- AI Recognition (Node.js)
- Export Renderer (Python/Docker) - **Requires Docker**

### VPC Resources
- VPC with private/public subnets
- VPC Endpoints for S3 and DynamoDB
- NAT Gateway

### Other Resources
- API Gateway (REST)
- WebSocket API
- SQS Queues (3)

## After Deployment

1. Note the outputs:
   - API Endpoint
   - WebSocket Endpoint
   - Platform Storage Bucket name
   - VPC ID

2. Create Rekognition Collection:
   ```bash
   aws rekognition create-collection --collection-id vinco-athletes --region eu-west-1
   ```

3. Update WordPress plugin settings with the API endpoints.
