# FileMage FTP Integration Setup

## Overview

The Vinco MAM platform integrates with FileMage Gateway to automatically process images uploaded via FTP. When photographers upload images to FileMage, they sync to S3, and the FTP Watcher Lambda automatically processes them.

## Configuration Steps

### 1. Get FileMage API Token

1. Log into your FileMage Gateway admin portal
2. Navigate to **Settings** → **API Tokens**
3. Click **Add** to create a new API token
4. Copy the generated token (you won't be able to see it again)

For more details, see: [FileMage API Tokens Documentation](https://docs.filemage.io/administrators.html#api-tokens)

### 2. Configure in WordPress Plugin

1. Go to **WordPress Admin** → **Vinco MAM** → **Settings**
2. Click the **FileMage FTP** tab
3. Enter:
   - **FileMage API URL**: Base URL of your FileMage instance API
     - Example: `https://your-filemage-instance.com/api`
   - **FileMage API Token**: The token you copied from step 1
   - **Watch Folders**: One folder path per line
     ```
     /photographers/photographer1
     /photographers/photographer2
     /events/event-2024
     ```

4. Click **Save Settings**

### 3. Deploy/Update AWS Infrastructure

After configuring watch folders, update the Lambda environment variable:

```bash
# Get the Lambda function name from CDK outputs or AWS Console
FUNCTION_NAME="VincoStack-FtpWatcher-XXXX"

# Update with watch folders (use \n for newlines)
aws lambda update-function-configuration \
  --function-name $FUNCTION_NAME \
  --environment "Variables={
    IMAGES_BUCKET=vinco-images,
    UPLOADS_BUCKET=vinco-uploads,
    IMAGE_PROCESSOR_QUEUE_URL=https://sqs.eu-west-1.amazonaws.com/ACCOUNT/vinco-ai-processing,
    FILEMAGE_WATCH_FOLDERS=/photographers/photographer1
/photographers/photographer2
/events/event-2024
  }" \
  --region eu-west-1
```

Or update via AWS Console:
1. Go to Lambda → Functions → `FtpWatcher`
2. Configuration → Environment variables
3. Edit `FILEMAGE_WATCH_FOLDERS`
4. Enter folders (one per line or comma-separated)
5. Save

### 4. Configure FileMage S3 Storage Endpoint

Ensure FileMage is configured to sync to your S3 upload bucket:

1. In FileMage Gateway, go to **Storage Endpoints**
2. Create or edit S3 endpoint pointing to: `vinco-uploads` bucket
3. Ensure folder structure matches your watch folders

## How It Works

1. **Photographer uploads via FTP** → FileMage Gateway receives file
2. **FileMage syncs to S3** → File appears in `vinco-uploads` bucket
3. **S3 Event triggers FTP Watcher Lambda** → Watches for new files in configured folders
4. **FTP Watcher checks folder** → Verifies file is in a watched folder
5. **Queues for processing** → Sends job to Image Processor queue
6. **Image Processor handles** → Creates thumbnails, proxies, extracts metadata
7. **AI Recognition processes** → Identifies athletes, detects bibs
8. **Images available in gallery** → Appears in WordPress admin and frontend

## Folder Structure

Recommended folder structure in FileMage/S3:

```
vinco-uploads/
├── photographers/
│   ├── photographer1/
│   │   └── IMG_1234.jpg
│   └── photographer2/
│       └── IMG_5678.CR2
└── events/
    └── event-2024/
        └── race1/
            └── finish-line.jpg
```

## Troubleshooting

### Files Not Processing

1. **Check Lambda logs:**
   ```bash
   aws logs tail /aws/lambda/VincoStack-FtpWatcher-XXXX --follow
   ```

2. **Verify folder paths:**
   - Must match exactly (case-sensitive)
   - Must start with `/`
   - Check S3 bucket structure

3. **Check S3 event triggers:**
   - Verify Lambda is attached to bucket
   - Check event notification configuration

4. **Verify file types:**
   - Only image/video files are processed
   - Check Content-Type metadata

### Lambda Environment Variable Not Updating

If watch folders aren't taking effect:

1. **Update via AWS CLI** (see command above)
2. **Or update via AWS Console:**
   - Lambda → Configuration → Environment variables
   - Edit `FILEMAGE_WATCH_FOLDERS`
   - Save and wait for deployment

3. **Verify update:**
   ```bash
   aws lambda get-function-configuration \
     --function-name VincoStack-FtpWatcher-XXXX \
     --query 'Environment.Variables.FILEMAGE_WATCH_FOLDERS'
   ```

### FileMage API Connection Issues

1. **Verify API URL:**
   - Must be accessible from WordPress server
   - Include `/api` if required

2. **Check API Token:**
   - Token must be valid
   - Token must have appropriate permissions

3. **Test API connection:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-filemage-instance.com/api/endpoint
   ```

## Best Practices

1. **Folder Naming:**
   - Use consistent naming conventions
   - Include photographer/event identifiers in path

2. **Watch Folder Management:**
   - Only watch folders that need processing
   - Update watch folders as needed via Settings

3. **File Naming:**
   - Use descriptive filenames
   - Include timestamp or sequence numbers

4. **Monitoring:**
   - Monitor Lambda logs for errors
   - Set up CloudWatch alarms for failures
   - Check S3 bucket for stuck files

## Advanced Configuration

### Multiple FileMage Instances

If using multiple FileMage instances:

1. Create separate S3 buckets for each
2. Configure separate watch folders
3. Use S3 prefixes to organize

### Custom Processing Rules

Modify `lambda/ftp-watcher/index.ts` to:
- Filter by file extension
- Apply custom metadata
- Route to different processors
- Skip certain files

---

**Note:** The FTP watcher currently reads `FILEMAGE_WATCH_FOLDERS` from Lambda environment variables. Future versions may support dynamic updates via API.
