# Deployment and Testing Guide

## 🎉 Implementation Complete!

All major components have been implemented:

### ✅ Completed Features

1. **API Layer (100%)**
   - Images API (8 endpoints)
   - Albums API (4 endpoints)
   - Validation API (4 endpoints)
   - Events API (proxies to WordPress)
   - Videos API
   - Users API (proxies to WordPress)
   - Search API

2. **WebSocket Support (100%)**
   - Connect handler
   - Disconnect handler
   - Message handler
   - Broadcast functionality

3. **React Components (100%)**
   - WebGL-enabled Image Editor
   - Common components (Button, Input, Modal, ImageThumbnail, LoadingSpinner)
   - Enhanced existing components

4. **WordPress Plugin**
   - Complete plugin structure
   - Database migrations
   - API proxy
   - Admin UI integration

## 📦 Plugin Installation

### WordPress Plugin Zip File
**Location**: `/Users/matthewquine/Vinco Dropbox/Admin/Software/vinco-mam/vinco-mam-plugin.zip`

**Installation Steps**:
1. Log into WordPress admin panel
2. Navigate to **Plugins > Add New**
3. Click **Upload Plugin**
4. Select `vinco-mam-plugin.zip`
5. Click **Install Now**
6. Click **Activate Plugin**
7. Go to **Vinco MAM > Settings** to configure AWS credentials

## 🚀 AWS Deployment

### Deploy Infrastructure

```bash
cd "/Users/matthewquine/Vinco Dropbox/Admin/Software/vinco-mam/aws"
./deploy.sh
```

Or manually:
```bash
cd aws
export CDK_DEFAULT_REGION=eu-west-1
export AWS_DEFAULT_REGION=eu-west-1
npx cdk bootstrap --region eu-west-1
npx cdk deploy --region eu-west-1
```

### Post-Deployment Setup

1. **Create Rekognition Collection**:
   ```bash
   aws rekognition create-collection \
     --collection-id vinco-athletes \
     --region eu-west-1
   ```

2. **Configure WordPress Plugin**:
   - Go to WordPress Admin > Vinco MAM > Settings
   - Enter API Gateway endpoint (from CDK outputs)
   - Enter AWS region: `eu-west-1`
   - Save settings

3. **Build React Admin UI**:
   ```bash
   cd admin-ui
   npm install
   npm run build
   ```
   
   The built files should be copied to `wordpress-plugin/assets/build/`

## 🧪 Testing

### API Testing

#### Test Images API
```bash
# Get API endpoint from CDK outputs
API_ENDPOINT="https://xxxxx.execute-api.eu-west-1.amazonaws.com/prod"

# List images (requires JWT token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "${API_ENDPOINT}/images"

# Get specific image
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "${API_ENDPOINT}/images/img_123456789"
```

#### Test Albums API
```bash
# List albums
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "${API_ENDPOINT}/albums"

# Create album
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Album","description":"Test"}' \
  "${API_ENDPOINT}/albums"
```

#### Test Validation Queue
```bash
# Get validation queue
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "${API_ENDPOINT}/validation?status=PENDING"

# Approve item
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Approved"}' \
  "${API_ENDPOINT}/validation/QUEUE_ITEM_ID/approve"
```

#### Test Search
```bash
# Search all
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "${API_ENDPOINT}/search?q=test&type=all"

# Search images only
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "${API_ENDPOINT}/search?q=test&type=images"
```

### WebSocket Testing

Connect to WebSocket endpoint:
```javascript
const ws = new WebSocket('wss://XXXXX.execute-api.eu-west-1.amazonaws.com/prod');

ws.onopen = () => {
  console.log('Connected');
  ws.send(JSON.stringify({ action: 'subscribe', channels: ['validation', 'images'] }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Message:', data);
};
```

### WordPress Plugin Testing

1. **Verify Plugin Activation**:
   - Check that "Vinco MAM" appears in WordPress admin menu
   - Verify roles are created (Photographer, Content Team)

2. **Test Admin Page**:
   - Navigate to **Vinco MAM > Dashboard**
   - Verify React app loads
   - Check browser console for errors

3. **Test API Proxy**:
   - Plugin should proxy requests to AWS API Gateway
   - Check WordPress REST API endpoints:
     - `/wp-json/vinco-mam/v1/images`
     - `/wp-json/vinco-mam/v1/albums`

## 📊 Monitoring

### CloudWatch Logs
- Lambda Functions: `/aws/lambda/VincoStack-*`
- API Gateway: API Gateway console > Logs

### DynamoDB
- Tables should be created in eu-west-1
- Monitor read/write capacity

### S3 Buckets
- `vinco-uploads` - Upload staging
- `vinco-images` - Processed images
- `vinco-exports` - Exported images
- `vinco-platform-storage` - Backups

## 🔧 Troubleshooting

### API Returns 401 Unauthorized
- Check JWT token is valid
- Verify token is passed in Authorization header
- Check WordPress plugin settings

### Lambda Function Errors
- Check CloudWatch logs
- Verify environment variables are set correctly
- Ensure IAM permissions are granted

### WebSocket Connection Fails
- Check WebSocket API is deployed
- Verify connection handler Lambda has permissions
- Check DynamoDB connections table

### React App Not Loading
- Build admin-ui with `npm run build`
- Copy build output to `wordpress-plugin/assets/build/`
- Check browser console for errors
- Verify API endpoint is correct

## 📝 Next Steps

1. **Deploy to AWS** (if not already done)
2. **Build React Admin UI** and deploy to WordPress
3. **Configure WordPress Plugin** with AWS credentials
4. **Test all endpoints** using the examples above
5. **Upload test images** to verify processing pipeline
6. **Test AI recognition** after uploading athlete headshots

## 🎯 Known Limitations

- **TypeScript Compilation**: Lambda functions use TypeScript. CDK compiles them automatically, but ensure tsconfig.json is correct.
- **React Build**: Admin UI must be built before deploying to WordPress
- **JWT Authentication**: Currently uses simple JWT decoding. Full validation should be added in production
- **Search**: Basic text search implemented. Consider adding Elasticsearch for production-scale search

---

**Plugin Zip File**: `vinco-mam-plugin.zip`
**Location**: Project root directory
