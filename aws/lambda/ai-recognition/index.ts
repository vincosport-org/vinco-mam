import { SQSEvent } from 'aws-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { RekognitionClient, DetectFacesCommand, DetectTextCommand, SearchFacesByImageCommand } from '@aws-sdk/client-rekognition';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

const s3 = new S3Client({});
const rekognition = new RekognitionClient({});
const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sqs = new SQSClient({});

const IMAGES_BUCKET = process.env.IMAGES_BUCKET!;
const IMAGES_TABLE = process.env.IMAGES_TABLE!;
const VALIDATION_TABLE = process.env.VALIDATION_TABLE!;
const REKOGNITION_COLLECTION_ID = process.env.REKOGNITION_COLLECTION_ID || 'vinco-athletes';

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    try {
      const { imageId, s3Key, captureTime, uploadTime, eventId } = JSON.parse(record.body);
      
      // 1. Detect faces
      const faces = await detectFaces(s3Key);
      
      // 2. For each face, search Rekognition collection
      const faceMatches = await Promise.all(
        faces.map(face => searchFaces(face.boundingBox, s3Key))
      );
      
      // 3. Detect text (bib numbers)
      const textDetections = await detectText(s3Key);
      const bibNumbers = extractBibNumbers(textDetections);
      
      // 4. Match bibs with start list/results (simplified)
      const bibMatches = bibNumbers.map(bib => ({
        bibNumber: bib,
        athleteId: null, // Would query database here
      }));
      
      // 5. Calculate combined confidence scores
      const recognitions = faceMatches.map((match, idx) => ({
        athleteId: match.athleteId || '',
        confidence: match.confidence || 0,
        temporalBoost: 0, // Would calculate from timestamps
        boundingBox: faces[idx]?.boundingBox || {},
        combinedScore: match.confidence || 0,
      }));
      
      // 6. Auto-approve high confidence, queue others for validation
      for (const recognition of recognitions) {
        if (recognition.combinedScore >= 85) {
          // Auto-approve
          await saveRecognition(imageId, recognition, 'AUTO_APPROVED');
        } else if (recognition.combinedScore >= 50) {
          // Add to validation queue
          await addToValidationQueue(imageId, recognition);
        }
      }
      
      // 7. Update image record
      await updateImageRecognitionStatus(imageId, recognitions);
      
    } catch (error) {
      console.error('Error processing AI recognition:', error);
      throw error;
    }
  }
};

async function detectFaces(s3Key: string) {
  const command = new DetectFacesCommand({
    Image: {
      S3Object: {
        Bucket: IMAGES_BUCKET,
        Key: s3Key,
      },
    },
  });
  
  const response = await rekognition.send(command);
  return response.FaceDetails || [];
}

async function searchFaces(boundingBox: any, s3Key: string) {
  try {
    const command = new SearchFacesByImageCommand({
      CollectionId: REKOGNITION_COLLECTION_ID,
      Image: {
        S3Object: {
          Bucket: IMAGES_BUCKET,
          Key: s3Key,
        },
      },
      FaceMatchThreshold: 70,
      MaxFaces: 1,
    });
    
    const response = await rekognition.send(command);
    if (response.FaceMatches && response.FaceMatches.length > 0) {
      return {
        athleteId: response.FaceMatches[0].Face?.ExternalImageId || '',
        confidence: response.FaceMatches[0].Similarity || 0,
      };
    }
  } catch (error) {
    console.error('Error searching faces:', error);
  }
  
  return { athleteId: '', confidence: 0 };
}

async function detectText(s3Key: string) {
  const command = new DetectTextCommand({
    Image: {
      S3Object: {
        Bucket: IMAGES_BUCKET,
        Key: s3Key,
      },
    },
  });
  
  const response = await rekognition.send(command);
  return response.TextDetections || [];
}

function extractBibNumbers(textDetections: any[]): string[] {
  // Extract potential bib numbers from text detections
  // This would use regex to match bib number patterns
  const bibNumbers: string[] = [];
  const bibPattern = /\b\d{1,4}\b/g;
  
  for (const detection of textDetections) {
    if (detection.DetectedText) {
      const matches = detection.DetectedText.match(bibPattern);
      if (matches) {
        bibNumbers.push(...matches);
      }
    }
  }
  
  return [...new Set(bibNumbers)]; // Remove duplicates
}

async function saveRecognition(imageId: string, recognition: any, status: string) {
  // Save recognition to image record
  await dynamodb.send(new UpdateCommand({
    TableName: IMAGES_TABLE,
    Key: { imageId },
    UpdateExpression: 'SET recognitionStatus = :status ADD recognizedAthletes :recognition',
    ExpressionAttributeValues: {
      ':status': status,
      ':recognition': [recognition],
    },
  }));
}

async function addToValidationQueue(imageId: string, recognition: any) {
  const queueItemId = `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  await dynamodb.send(new UpdateCommand({
    TableName: VALIDATION_TABLE,
    Key: { queueItemId },
    Item: {
      queueItemId,
      imageId,
      athleteId: recognition.athleteId,
      confidence: recognition.confidence,
      combinedScore: recognition.combinedScore,
      boundingBox: recognition.boundingBox,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    },
  }));
}

async function updateImageRecognitionStatus(imageId: string, recognitions: any[]) {
  await dynamodb.send(new UpdateCommand({
    TableName: IMAGES_TABLE,
    Key: { imageId },
    UpdateExpression: 'SET recognitionStatus = :status, recognizedAthletes = :recognitions, updatedAt = :now',
    ExpressionAttributeValues: {
      ':status': recognitions.length > 0 ? 'COMPLETE' : 'FAILED',
      ':recognitions': recognitions,
      ':now': new Date().toISOString(),
    },
  }));
}
