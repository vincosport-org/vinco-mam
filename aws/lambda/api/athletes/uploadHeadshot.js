/**
 * Athletes Upload Headshot API Handler
 * Generates a presigned URL for S3 upload and registers face with Rekognition
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { RekognitionClient, IndexFacesCommand, DeleteFacesCommand } = require('@aws-sdk/client-rekognition');

const s3Client = new S3Client({});
const rekognitionClient = new RekognitionClient({});

const ATHLETES_TABLE = process.env.ATHLETES_TABLE;
const IMAGES_BUCKET = process.env.IMAGES_BUCKET;
const REKOGNITION_COLLECTION_ID = 'vinco-athletes';

/**
 * Generate a unique headshot ID
 */
function generateHeadshotId() {
  return `hs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    // Check permissions - only admins/editors/content team can upload headshots
    if (!auth.hasPermission(user, 'CONTENT_TEAM')) {
      return auth.createErrorResponse(403, 'Forbidden', 'FORBIDDEN');
    }

    const athleteId = event.pathParameters?.athleteId;
    if (!athleteId) {
      return auth.createErrorResponse(400, 'Athlete ID is required', 'VALIDATION_ERROR');
    }

    // Get existing athlete
    const athlete = await db.getItem(ATHLETES_TABLE, { athleteId });
    if (!athlete) {
      return auth.createErrorResponse(404, 'Athlete not found', 'NOT_FOUND');
    }

    const body = JSON.parse(event.body || '{}');
    const { action, headshotId, contentType = 'image/jpeg' } = body;

    // Action: get presigned URL for upload
    if (action === 'getUploadUrl' || !action) {
      const newHeadshotId = generateHeadshotId();
      const extension = contentType === 'image/png' ? 'png' : 'jpg';
      const s3Key = `headshots/${athleteId}/${newHeadshotId}.${extension}`;

      const command = new PutObjectCommand({
        Bucket: IMAGES_BUCKET,
        Key: s3Key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

      return auth.createResponse(200, {
        uploadUrl,
        headshotId: newHeadshotId,
        s3Key,
        expiresIn: 3600,
      });
    }

    // Action: confirm upload and index face in Rekognition
    if (action === 'confirmUpload') {
      if (!headshotId) {
        return auth.createErrorResponse(400, 'Headshot ID is required for confirmation', 'VALIDATION_ERROR');
      }

      const s3Key = body.s3Key;
      if (!s3Key) {
        return auth.createErrorResponse(400, 'S3 key is required for confirmation', 'VALIDATION_ERROR');
      }

      // Index face in Rekognition
      let rekognitionFaceId = null;
      try {
        const indexResponse = await rekognitionClient.send(new IndexFacesCommand({
          CollectionId: REKOGNITION_COLLECTION_ID,
          Image: {
            S3Object: {
              Bucket: IMAGES_BUCKET,
              Name: s3Key,
            },
          },
          ExternalImageId: athleteId,
          MaxFaces: 1,
          QualityFilter: 'AUTO',
        }));

        if (indexResponse.FaceRecords && indexResponse.FaceRecords.length > 0) {
          rekognitionFaceId = indexResponse.FaceRecords[0].Face.FaceId;
        }
      } catch (rekError) {
        console.error('Rekognition indexing failed:', rekError);
        // Continue without Rekognition - headshot still uploaded
      }

      // Determine if this should be the primary headshot
      const currentHeadshots = athlete.headshots || [];
      const isPrimary = currentHeadshots.length === 0 || body.isPrimary === true;

      // If setting as primary, unset other primaries
      if (isPrimary) {
        currentHeadshots.forEach(h => {
          h.isPrimary = false;
        });
      }

      // Add new headshot to the array
      const newHeadshot = {
        headshotId,
        s3Key,
        rekognitionFaceId,
        isPrimary,
        source: 'Manual',
        createdAt: new Date().toISOString(),
        createdBy: user.userId,
      };
      currentHeadshots.push(newHeadshot);

      // Update athlete record
      await db.updateItem(
        ATHLETES_TABLE,
        { athleteId },
        {
          headshots: currentHeadshots,
          faceCount: currentHeadshots.filter(h => h.rekognitionFaceId).length,
        }
      );

      return auth.createResponse(200, {
        message: 'Headshot uploaded and indexed successfully',
        headshot: {
          headshotId,
          s3Key,
          headshotUrl: `https://${IMAGES_BUCKET}.s3.amazonaws.com/${s3Key}`,
          rekognitionFaceId,
          isPrimary,
        },
      });
    }

    // Action: delete a headshot
    if (action === 'delete') {
      if (!headshotId) {
        return auth.createErrorResponse(400, 'Headshot ID is required for deletion', 'VALIDATION_ERROR');
      }

      const currentHeadshots = athlete.headshots || [];
      const headshotIndex = currentHeadshots.findIndex(h => h.headshotId === headshotId);

      if (headshotIndex === -1) {
        return auth.createErrorResponse(404, 'Headshot not found', 'NOT_FOUND');
      }

      const headshot = currentHeadshots[headshotIndex];

      // Delete face from Rekognition if it exists
      if (headshot.rekognitionFaceId) {
        try {
          await rekognitionClient.send(new DeleteFacesCommand({
            CollectionId: REKOGNITION_COLLECTION_ID,
            FaceIds: [headshot.rekognitionFaceId],
          }));
        } catch (rekError) {
          console.error('Failed to delete face from Rekognition:', rekError);
        }
      }

      // Remove headshot from array
      currentHeadshots.splice(headshotIndex, 1);

      // If deleted headshot was primary and there are other headshots, make first one primary
      if (headshot.isPrimary && currentHeadshots.length > 0) {
        currentHeadshots[0].isPrimary = true;
      }

      // Update athlete record
      await db.updateItem(
        ATHLETES_TABLE,
        { athleteId },
        {
          headshots: currentHeadshots,
          faceCount: currentHeadshots.filter(h => h.rekognitionFaceId).length,
        }
      );

      return auth.createResponse(200, {
        message: 'Headshot deleted successfully',
      });
    }

    // Action: set primary headshot
    if (action === 'setPrimary') {
      if (!headshotId) {
        return auth.createErrorResponse(400, 'Headshot ID is required', 'VALIDATION_ERROR');
      }

      const currentHeadshots = athlete.headshots || [];
      const targetIndex = currentHeadshots.findIndex(h => h.headshotId === headshotId);

      if (targetIndex === -1) {
        return auth.createErrorResponse(404, 'Headshot not found', 'NOT_FOUND');
      }

      // Update primary flags
      currentHeadshots.forEach((h, i) => {
        h.isPrimary = i === targetIndex;
      });

      // Update athlete record
      await db.updateItem(
        ATHLETES_TABLE,
        { athleteId },
        { headshots: currentHeadshots }
      );

      return auth.createResponse(200, {
        message: 'Primary headshot updated successfully',
      });
    }

    return auth.createErrorResponse(400, 'Invalid action', 'VALIDATION_ERROR');
  } catch (error) {
    console.error('Error handling headshot:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
