# Vinco MAM - Deployment Guide

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Node.js 20.x installed
3. Docker installed (for container Lambdas)
4. WordPress site on Kinsta with PHP 8.0+
5. PostgreSQL client (for running migrations)

## Step 1: Deploy AWS Infrastructure

```bash
cd aws
npm install
npx cdk bootstrap  # Only needed once per AWS account/region
npx cdk deploy
```

After deployment, note the API endpoint and WebSocket endpoint from the outputs.

## Step 2: Create Rekognition Collection

```bash
aws rekognition create-collection --collection-id vinco-athletes --region eu-west-2
```

## Step 3: Build React Admin UI

**Note:** Database tables are created automatically by the WordPress plugin on activation. No separate database setup needed.

```bash
cd admin-ui
npm install
npm run build
```

This will output the built files to `wordpress-plugin/assets/build/`.

## Step 5: Install WordPress Plugin

1. Copy the entire `wordpress-plugin` directory to your WordPress site:
   ```bash
   cp -r wordpress-plugin /path/to/wordpress/wp-content/plugins/vinco-mam
   ```

2. Activate the plugin in WordPress admin

3. Go to Vinco MAM > Settings and configure:
   - AWS Region: `eu-west-2` (or your region)
   - API Endpoint: From CDK deployment output
   - WebSocket Endpoint: From CDK deployment output
   - JWT Secret: Generate a secure random string
   - Auto-approve threshold: 85
   - Review threshold: 50

## Step 6: Configure AWS Credentials (WordPress)

The WordPress plugin needs AWS credentials to access S3 and other services. You can either:

1. Use IAM roles (if WordPress is on EC2)
2. Store credentials in WordPress settings (encrypted)
3. Use environment variables

## Step 7: Test the Installation

1. Log into WordPress admin
2. Navigate to Vinco MAM menu
3. Verify the React UI loads
4. Check browser console for any errors
5. Test API connectivity

## Troubleshooting

### React UI not loading
- Check that `admin-ui` build completed successfully
- Verify files exist in `wordpress-plugin/assets/build/`
- Check browser console for JavaScript errors

### API errors
- Verify API endpoint is correct in WordPress settings
- Check AWS API Gateway logs
- Verify JWT secret matches between WordPress and AWS

### Database connection errors
- Verify database credentials in AWS Secrets Manager
- Check security group allows connections from Lambda functions
- Ensure RDS instance is in correct VPC

### Image processing not working
- Check S3 bucket permissions
- Verify Lambda functions have correct IAM roles
- Check CloudWatch logs for Lambda errors
