/**
 * Images Export API Handler
 */
const { randomUUID } = require('crypto');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const IMAGES_TABLE = process.env.IMAGES_TABLE;
const EXPORTS_BUCKET = process.env.EXPORTS_BUCKET;
const EXPORT_QUEUE_URL = process.env.EXPORT_QUEUE_URL;

const sqs = new SQSClient({});

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const imageId = event.pathParameters?.imageId;
    if (!imageId) {
      return auth.createErrorResponse(400, 'Missing imageId parameter', 'BAD_REQUEST');
    }

    // Get image
    const image = await db.getItem(IMAGES_TABLE, { imageId });
    if (!image) {
      return auth.createErrorResponse(404, 'Image not found', 'NOT_FOUND');
    }

    const body = JSON.parse(event.body || '{}');

    // If presetId is provided, get preset settings
    let exportSettings = {
      format: body.format || 'JPEG',
      quality: body.quality || 90,
      maxPixels: body.maxPixels,
      maxFileSizeMB: body.maxFileSizeMB,
      colorSpace: body.colorSpace || 'SRGB',
      metadata: body.metadata || 'ALL',
      watermark: body.watermarkTemplateId ? { templateId: body.watermarkTemplateId } : undefined,
    };

    if (body.presetId) {
      const EXPORT_PRESETS_TABLE = process.env.EXPORT_PRESETS_TABLE;
      const preset = await db.getItem(EXPORT_PRESETS_TABLE, { presetId: body.presetId });
      if (preset && preset.settings) {
        exportSettings = { ...exportSettings, ...preset.settings };
      }
    }

    // Generate export ID
    const exportId = randomUUID();

    // Queue export job
    const message = {
      exportId,
      imageId,
      userId: user.userId,
      sourceKey: image.proxyKey || image.originalKey,
      edits: image.currentEdits || {},
      settings: exportSettings,
    };

    await sqs.send(new SendMessageCommand({
      QueueUrl: EXPORT_QUEUE_URL,
      MessageBody: JSON.stringify(message),
    }));

    // Estimate processing time (rough estimate)
    const estimatedSeconds = 10; // Export rendering typically takes 5-15 seconds

    return auth.createResponse(200, {
      exportId,
      status: 'QUEUED',
      estimatedSeconds,
    });
  } catch (error) {
    console.error('Error queuing export:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
