/**
 * AI Recognition Lambda - Handles face and text detection with full attribute capture
 */
const { S3Client } = require('@aws-sdk/client-s3');
const { RekognitionClient, DetectFacesCommand, DetectTextCommand, SearchFacesByImageCommand } = require('@aws-sdk/client-rekognition');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const s3 = new S3Client({});
const rekognition = new RekognitionClient({});
const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const IMAGES_BUCKET = process.env.IMAGES_BUCKET;
const IMAGES_TABLE = process.env.IMAGES_TABLE;
const VALIDATION_TABLE = process.env.VALIDATION_TABLE;
const ATHLETES_TABLE = process.env.ATHLETES_TABLE;
const START_LISTS_TABLE = process.env.START_LISTS_TABLE;
const REKOGNITION_COLLECTION_ID = process.env.REKOGNITION_COLLECTION_ID || 'vinco-athletes';

exports.handler = async (event) => {
  for (const record of event.Records) {
    try {
      const { imageId, s3Key, captureTime, uploadTime, eventId } = JSON.parse(record.body);

      // 1. Detect faces with ALL attributes
      const faceDetails = await detectFaces(s3Key);

      // 2. For each face, search Rekognition collection and build full face data
      const faces = await Promise.all(
        faceDetails.map(async (face, idx) => {
          const match = await searchFaces(s3Key, face.BoundingBox);
          return buildFaceRecord(face, match, idx);
        })
      );

      // 3. Detect text (bib numbers)
      const textDetections = await detectText(s3Key);
      const bibNumbers = extractBibNumbers(textDetections);

      // 4. Try to match bibs with athletes from start lists
      const bibMatches = await matchBibsToAthletes(bibNumbers, eventId);

      // 5. Merge bib matches with face recognitions
      const recognitions = mergeBibAndFaceMatches(faces, bibMatches);

      // 6. Auto-approve high confidence, queue others for validation
      for (const recognition of recognitions) {
        if (recognition.combinedScore >= 85 && recognition.athleteId) {
          await saveRecognition(imageId, recognition, 'AUTO_APPROVED');
        } else if (recognition.combinedScore >= 50 || recognition.athleteId) {
          await addToValidationQueue(imageId, recognition);
        }
      }

      // 7. Update image record with all face data
      await updateImageWithFaces(imageId, faces, recognitions, bibNumbers);

    } catch (error) {
      console.error('Error processing AI recognition:', error);
      throw error;
    }
  }
};

/**
 * Detect faces with ALL attributes enabled
 */
async function detectFaces(s3Key) {
  const command = new DetectFacesCommand({
    Image: {
      S3Object: {
        Bucket: IMAGES_BUCKET,
        Key: s3Key,
      },
    },
    Attributes: ['ALL'], // Request all face attributes
  });

  const response = await rekognition.send(command);
  return response.FaceDetails || [];
}

/**
 * Build a comprehensive face record from Rekognition data
 */
function buildFaceRecord(faceDetail, match, index) {
  // Extract dominant emotion
  const emotions = faceDetail.Emotions || [];
  const dominantEmotion = emotions.reduce(
    (max, e) => (e.Confidence > max.confidence ? { type: e.Type, confidence: e.Confidence } : max),
    { type: 'UNKNOWN', confidence: 0 }
  );

  // Extract all emotions with confidence
  const emotionScores = {};
  emotions.forEach(e => {
    emotionScores[e.Type.toLowerCase()] = Math.round(e.Confidence * 100) / 100;
  });

  return {
    faceIndex: index,
    athleteId: match.athleteId || null,
    matchConfidence: match.confidence || 0,

    // Bounding box (position in image)
    boundingBox: {
      left: faceDetail.BoundingBox?.Left || 0,
      top: faceDetail.BoundingBox?.Top || 0,
      width: faceDetail.BoundingBox?.Width || 0,
      height: faceDetail.BoundingBox?.Height || 0,
    },

    // Emotions
    dominantEmotion: dominantEmotion.type,
    dominantEmotionConfidence: Math.round(dominantEmotion.confidence * 100) / 100,
    emotions: emotionScores,

    // Demographics
    ageRange: faceDetail.AgeRange ? {
      low: faceDetail.AgeRange.Low,
      high: faceDetail.AgeRange.High,
    } : null,
    gender: faceDetail.Gender ? {
      value: faceDetail.Gender.Value,
      confidence: Math.round(faceDetail.Gender.Confidence * 100) / 100,
    } : null,

    // Face attributes
    smile: faceDetail.Smile ? {
      value: faceDetail.Smile.Value,
      confidence: Math.round(faceDetail.Smile.Confidence * 100) / 100,
    } : null,
    eyesOpen: faceDetail.EyesOpen ? {
      value: faceDetail.EyesOpen.Value,
      confidence: Math.round(faceDetail.EyesOpen.Confidence * 100) / 100,
    } : null,
    mouthOpen: faceDetail.MouthOpen ? {
      value: faceDetail.MouthOpen.Value,
      confidence: Math.round(faceDetail.MouthOpen.Confidence * 100) / 100,
    } : null,
    eyeglasses: faceDetail.Eyeglasses ? {
      value: faceDetail.Eyeglasses.Value,
      confidence: Math.round(faceDetail.Eyeglasses.Confidence * 100) / 100,
    } : null,
    sunglasses: faceDetail.Sunglasses ? {
      value: faceDetail.Sunglasses.Value,
      confidence: Math.round(faceDetail.Sunglasses.Confidence * 100) / 100,
    } : null,
    beard: faceDetail.Beard ? {
      value: faceDetail.Beard.Value,
      confidence: Math.round(faceDetail.Beard.Confidence * 100) / 100,
    } : null,
    mustache: faceDetail.Mustache ? {
      value: faceDetail.Mustache.Value,
      confidence: Math.round(faceDetail.Mustache.Confidence * 100) / 100,
    } : null,

    // Face pose (head orientation)
    pose: faceDetail.Pose ? {
      pitch: Math.round(faceDetail.Pose.Pitch * 100) / 100,
      roll: Math.round(faceDetail.Pose.Roll * 100) / 100,
      yaw: Math.round(faceDetail.Pose.Yaw * 100) / 100,
    } : null,

    // Image quality metrics
    quality: faceDetail.Quality ? {
      brightness: Math.round(faceDetail.Quality.Brightness * 100) / 100,
      sharpness: Math.round(faceDetail.Quality.Sharpness * 100) / 100,
    } : null,

    // Facial landmarks (key points)
    landmarks: (faceDetail.Landmarks || []).map(l => ({
      type: l.Type,
      x: Math.round(l.X * 10000) / 10000,
      y: Math.round(l.Y * 10000) / 10000,
    })),

    // Overall confidence from Rekognition
    confidence: Math.round((faceDetail.Confidence || 0) * 100) / 100,
  };
}

async function searchFaces(s3Key, boundingBox) {
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
    // Face not found in collection is expected
    if (error.name !== 'InvalidParameterException') {
      console.error('Error searching faces:', error);
    }
  }

  return { athleteId: '', confidence: 0 };
}

async function detectText(s3Key) {
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

function extractBibNumbers(textDetections) {
  const bibNumbers = [];
  const bibPattern = /\b\d{1,4}\b/g;

  for (const detection of textDetections) {
    if (detection.Type === 'LINE' && detection.DetectedText) {
      const matches = detection.DetectedText.match(bibPattern);
      if (matches) {
        matches.forEach(match => {
          bibNumbers.push({
            number: match,
            confidence: detection.Confidence,
            boundingBox: detection.Geometry?.BoundingBox || null,
          });
        });
      }
    }
  }

  // Deduplicate by number, keeping highest confidence
  const uniqueBibs = {};
  bibNumbers.forEach(bib => {
    if (!uniqueBibs[bib.number] || uniqueBibs[bib.number].confidence < bib.confidence) {
      uniqueBibs[bib.number] = bib;
    }
  });

  return Object.values(uniqueBibs);
}

async function matchBibsToAthletes(bibNumbers, eventId) {
  if (!eventId || !START_LISTS_TABLE || bibNumbers.length === 0) {
    return [];
  }

  const matches = [];

  for (const bib of bibNumbers) {
    try {
      // Query start lists for this bib number
      // This is a simplified query - in production you'd want a GSI on bibNumber
      const result = await dynamodb.send(new QueryCommand({
        TableName: START_LISTS_TABLE,
        IndexName: 'athlete-index',
        KeyConditionExpression: 'bibNumber = :bib',
        ExpressionAttributeValues: {
          ':bib': bib.number,
        },
        Limit: 1,
      }));

      if (result.Items && result.Items.length > 0) {
        matches.push({
          bibNumber: bib.number,
          athleteId: result.Items[0].athleteId,
          athleteName: result.Items[0].athleteName,
          confidence: bib.confidence,
          boundingBox: bib.boundingBox,
        });
      }
    } catch (error) {
      console.error('Error matching bib to athlete:', error);
    }
  }

  return matches;
}

function mergeBibAndFaceMatches(faces, bibMatches) {
  const recognitions = faces.map(face => {
    // Calculate combined score
    let combinedScore = face.matchConfidence;
    let bibMatch = null;

    // Check if any bib match corresponds to the same athlete
    if (face.athleteId) {
      bibMatch = bibMatches.find(b => b.athleteId === face.athleteId);
      if (bibMatch) {
        // Boost confidence when both face and bib match
        combinedScore = Math.min(99, face.matchConfidence + 15);
      }
    }

    return {
      ...face,
      bibNumber: bibMatch?.bibNumber || null,
      combinedScore,
      status: 'PENDING_REVIEW',
    };
  });

  // Add bib-only matches (no face recognition)
  bibMatches.forEach(bib => {
    const alreadyMatched = recognitions.some(r => r.athleteId === bib.athleteId);
    if (!alreadyMatched) {
      recognitions.push({
        faceIndex: null,
        athleteId: bib.athleteId,
        athleteName: bib.athleteName,
        bibNumber: bib.number,
        matchConfidence: 0,
        combinedScore: Math.min(80, bib.confidence * 0.8), // Bib-only match capped at 80
        boundingBox: bib.boundingBox,
        status: 'PENDING_REVIEW',
      });
    }
  });

  return recognitions;
}

async function saveRecognition(imageId, recognition, status) {
  await dynamodb.send(new UpdateCommand({
    TableName: IMAGES_TABLE,
    Key: { imageId },
    UpdateExpression: 'SET recognitionStatus = :status, updatedAt = :now',
    ExpressionAttributeValues: {
      ':status': status,
      ':now': new Date().toISOString(),
    },
  }));
}

async function addToValidationQueue(imageId, recognition) {
  const queueItemId = `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await dynamodb.send(new PutCommand({
    TableName: VALIDATION_TABLE,
    Item: {
      queueItemId,
      imageId,
      athleteId: recognition.athleteId,
      athleteName: recognition.athleteName || null,
      confidence: recognition.matchConfidence,
      combinedScore: recognition.combinedScore,
      boundingBox: recognition.boundingBox,
      bibNumber: recognition.bibNumber,
      dominantEmotion: recognition.dominantEmotion,
      faceQuality: recognition.quality,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    },
  }));
}

async function updateImageWithFaces(imageId, faces, recognitions, bibNumbers) {
  await dynamodb.send(new UpdateCommand({
    TableName: IMAGES_TABLE,
    Key: { imageId },
    UpdateExpression: `
      SET recognitionStatus = :status,
          faces = :faces,
          recognizedAthletes = :recognitions,
          detectedBibNumbers = :bibs,
          faceCount = :faceCount,
          updatedAt = :now
    `,
    ExpressionAttributeValues: {
      ':status': recognitions.length > 0 ? 'COMPLETE' : (faces.length > 0 ? 'NO_MATCH' : 'NO_FACES'),
      ':faces': faces,
      ':recognitions': recognitions.filter(r => r.athleteId),
      ':bibs': bibNumbers.map(b => b.number),
      ':faceCount': faces.length,
      ':now': new Date().toISOString(),
    },
  }));
}
