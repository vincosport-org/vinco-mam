import { S3Event, Context } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const s3 = new S3Client({});
const sqs = new SQSClient({});
const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const IMAGES_BUCKET = process.env.IMAGES_BUCKET!;
const IMAGES_TABLE = process.env.IMAGES_TABLE!;
const AI_QUEUE_URL = process.env.AI_QUEUE_URL!;
const RAW_QUEUE_URL = process.env.RAW_QUEUE_URL!;

export const handler = async (event: S3Event, context: Context) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key);
    
    // Parse key: photographers/{username}/{date}/{filename}
    const parts = key.split('/');
    if (parts.length < 3) {
      console.error('Invalid key format:', key);
      continue;
    }
    
    const photographerUsername = parts[1];
    const filename = parts[parts.length - 1];
    
    // Determine file type from extension
    const ext = filename.split('.').pop()?.toLowerCase();
    const isRaw = ['cr2', 'cr3', 'nef', 'nrw', 'arw', 'srf', 'dng'].includes(ext || '');
    
    if (isRaw) {
      // Queue for RAW processor (container Lambda)
      await sqs.send(new SendMessageCommand({
        QueueUrl: RAW_QUEUE_URL,
        MessageBody: JSON.stringify({
          bucket,
          key,
          photographer: photographerUsername,
        }),
      }));
    } else {
      // Process JPEG/TIFF directly
      await processImage(bucket, key, photographerUsername);
    }
  }
};

async function processImage(bucket: string, key: string, photographer: string) {
  try {
    // 1. Download image
    // 2. Extract EXIF data
    // 3. Generate thumbnail (400px)
    // 4. Generate proxy (2048px)
    // 5. Upload to processed bucket
    // 6. Save metadata to DynamoDB
    // 7. Queue for AI recognition
    // 8. Broadcast WebSocket event
    
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const uploadTime = new Date().toISOString();
    
    // Save basic metadata (actual processing would happen here)
    await dynamodb.send(new PutCommand({
      TableName: IMAGES_TABLE,
      Item: {
        imageId,
        uploadTime,
        photographerId: photographer,
        photographerName: photographer,
        originalKey: key,
        status: 'PROCESSING',
        recognitionStatus: 'PENDING',
        recognizedAthletes: [],
        createdAt: uploadTime,
        updatedAt: uploadTime,
      },
    }));
    
    // Queue for AI recognition
    await sqs.send(new SendMessageCommand({
      QueueUrl: AI_QUEUE_URL,
      MessageBody: JSON.stringify({
        imageId,
        s3Key: key,
        captureTime: uploadTime,
        uploadTime,
      }),
    }));
    
    console.log(`Processed image: ${imageId}`);
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}
