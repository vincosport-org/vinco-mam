import { S3Event, S3EventRecord, Context } from 'aws-lambda';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { randomUUID } from 'crypto';

const s3 = new S3Client({});
const sqs = new SQSClient({});

const IMAGES_BUCKET = process.env.IMAGES_BUCKET!;
const UPLOADS_BUCKET = process.env.UPLOADS_BUCKET!;
const IMAGE_PROCESSOR_QUEUE_URL = process.env.IMAGE_PROCESSOR_QUEUE_URL!;
const FILEMAGE_WATCH_FOLDERS = (process.env.FILEMAGE_WATCH_FOLDERS || '').split('\n').map(f => f.trim()).filter(Boolean);

/**
 * FTP Watcher Lambda - Monitors FileMage FTP uploads via S3 events
 * 
 * When files are uploaded to FileMage FTP, they sync to S3.
 * This Lambda watches the upload bucket for new files in watched folders
 * and triggers image processing.
 */
export const handler = async (event: S3Event, context: Context) => {
  console.log('FTP Watcher triggered:', JSON.stringify(event, null, 2));

  const processedFiles: string[] = [];

  for (const record of event.Records) {
    try {
      await processRecord(record);
      processedFiles.push(record.s3.object.key);
    } catch (error: any) {
      console.error(`Error processing ${record.s3.object.key}:`, error);
      // Continue processing other files even if one fails
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Processed ${processedFiles.length} files`,
      files: processedFiles,
    }),
  };
};

async function processRecord(record: S3EventRecord) {
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
  const eventName = record.eventName;

  // Only process object creation events
  if (!eventName.includes('ObjectCreated')) {
    console.log(`Skipping ${eventName} for ${key}`);
    return;
  }

  // Check if file is in a watched folder
  const isWatchedFolder = FILEMAGE_WATCH_FOLDERS.length === 0 || 
    FILEMAGE_WATCH_FOLDERS.some(folder => key.startsWith(folder));

  if (!isWatchedFolder) {
    console.log(`File ${key} is not in a watched folder, skipping`);
    return;
  }

  console.log(`Processing new file: ${key} from bucket: ${bucket}`);

  // Get file metadata
  try {
    const headCommand = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    
    const metadata = await s3.send(headCommand);
    
    // Check if it's an image or video file
    const contentType = metadata.ContentType || '';
    const isImage = contentType.startsWith('image/');
    const isVideo = contentType.startsWith('video/');
    
    if (!isImage && !isVideo) {
      console.log(`File ${key} is not an image or video (${contentType}), skipping`);
      return;
    }

    // Extract photographer ID from path if available
    // Expected format: photographers/{photographerId}/...
    const pathParts = key.split('/');
    let photographerId: string | undefined;
    if (pathParts.length > 1 && pathParts[0] === 'photographers') {
      photographerId = pathParts[1];
    }

    // Create processing job
    const jobId = randomUUID();
    const job = {
      jobId,
      sourceBucket: bucket,
      sourceKey: key,
      destinationBucket: IMAGES_BUCKET,
      photographerId,
      contentType,
      fileSize: metadata.ContentLength || 0,
      uploadedAt: new Date().toISOString(),
      source: 'FTP', // Mark as FTP upload
    };

    // Queue for image processing
    await sqs.send(new SendMessageCommand({
      QueueUrl: IMAGE_PROCESSOR_QUEUE_URL,
      MessageBody: JSON.stringify(job),
      MessageAttributes: {
        source: {
          DataType: 'String',
          StringValue: 'FTP',
        },
        contentType: {
          DataType: 'String',
          StringValue: contentType,
        },
      },
    }));

    console.log(`Queued ${key} for processing with job ID: ${jobId}`);
  } catch (error: any) {
    console.error(`Error processing file ${key}:`, error);
    throw error;
  }
}
