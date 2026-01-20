# Vinco MAM - AWS Infrastructure

This directory contains the AWS CDK infrastructure code for the Vinco MAM platform.

## Structure

- `lib/` - CDK stack definitions
- `lambda/` - Lambda function code
- `bin/` - CDK app entry point

## Deployment

```bash
npm install
npx cdk bootstrap  # First time only
npx cdk deploy
```

## Lambda Functions

### Image Processor
- Triggered by S3 uploads
- Processes JPEG/TIFF images
- Generates thumbnails and proxies
- Queues RAW files for container processing

### RAW Processor
- Container-based Lambda
- Processes RAW image files (CR2, CR3, NEF, etc.)
- Uses LibRaw for conversion
- Generates proxies and thumbnails

### AI Recognition
- Processes images for athlete recognition
- Uses AWS Rekognition for face detection
- Matches faces with known athletes
- Detects bib numbers
- Performs temporal matching with results

### Export Renderer
- Container-based Lambda
- Applies edits and renders exports
- Handles watermarks and format conversion
- Generates pre-signed download URLs

## Infrastructure Components

- **S3 Buckets**: Image storage with lifecycle policies
- **DynamoDB Tables**: Image metadata, edit versions, validation queue
- **RDS PostgreSQL**: Athletes, events, results, users
- **API Gateway**: REST API for WordPress integration
- **WebSocket API**: Real-time updates
- **SQS Queues**: Async processing queues
- **Lambda Functions**: Serverless processing

## Configuration

Set environment variables or use CDK context:

```bash
export CDK_DEFAULT_ACCOUNT=your-account-id
export CDK_DEFAULT_REGION=eu-west-2
```

## Local Development

For local Lambda testing, use the AWS SAM CLI or deploy to a dev stack.
