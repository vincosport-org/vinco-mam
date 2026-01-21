/**
 * Image Processor Lambda - Handles S3 upload events
 * Includes auto-tagging based on date ranges and folder patterns
 */
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { SendMessageCommand, SQSClient } = require('@aws-sdk/client-sqs');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const s3 = new S3Client({});
const sqs = new SQSClient({});
const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const IMAGES_BUCKET = process.env.IMAGES_BUCKET;
const IMAGES_TABLE = process.env.IMAGES_TABLE;
const AI_QUEUE_URL = process.env.AI_QUEUE_URL;
const RAW_QUEUE_URL = process.env.RAW_QUEUE_URL;
const TAGGING_RULES_TABLE = process.env.TAGGING_RULES_TABLE;
const TAGS_TABLE = process.env.TAGS_TABLE;

exports.handler = async (event, context) => {
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
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const isRaw = ['cr2', 'cr3', 'nef', 'nrw', 'arw', 'srf', 'dng'].includes(ext);

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

async function processImage(bucket, key, photographer) {
  try {
    // 1. Download image
    // 2. Extract EXIF data
    // 3. Generate thumbnail (400px)
    // 4. Generate proxy (2048px)
    // 5. Upload to processed bucket
    // 6. Save metadata to DynamoDB
    // 7. Apply auto-tagging rules
    // 8. Queue for AI recognition
    // 9. Broadcast WebSocket event

    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const uploadTime = new Date().toISOString();

    // Apply auto-tagging rules based on date and folder
    const matchedTags = await applyTaggingRules(key, uploadTime);

    // Save basic metadata (actual processing would happen here)
    await dynamodb.send(new PutCommand({
      TableName: IMAGES_TABLE,
      Item: {
        imageId,
        uploadTime,
        photographerId: photographer,
        photographerName: photographer,
        originalKey: key,
        folderPath: key.substring(0, key.lastIndexOf('/')),
        status: 'PROCESSING',
        recognitionStatus: 'PENDING',
        recognizedAthletes: [],
        tagIds: matchedTags.map(t => t.tagId),
        tags: matchedTags,
        autoTagged: matchedTags.length > 0,
        createdAt: uploadTime,
        updatedAt: uploadTime,
      },
    }));

    // Update tag image counts
    for (const tag of matchedTags) {
      await incrementTagImageCount(tag.tagId);
    }

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

    console.log(`Processed image: ${imageId}, tags: ${matchedTags.map(t => t.name).join(', ')}`);
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

/**
 * Apply tagging rules to determine which tags should be assigned
 */
async function applyTaggingRules(folderPath, uploadTime) {
  if (!TAGGING_RULES_TABLE) {
    return [];
  }

  try {
    // Get all active tagging rules
    const result = await dynamodb.send(new ScanCommand({
      TableName: TAGGING_RULES_TABLE,
      FilterExpression: 'isActive = :active',
      ExpressionAttributeValues: {
        ':active': 'true',
      },
    }));

    const rules = (result.Items || []).sort((a, b) => (a.priority || 100) - (b.priority || 100));
    const matchedTagIds = new Set();

    for (const rule of rules) {
      const matches = evaluateRule(rule, folderPath, uploadTime);
      if (matches) {
        rule.tagIds.forEach(tagId => matchedTagIds.add(tagId));
      }
    }

    // Fetch tag details for matched tags
    if (matchedTagIds.size === 0) {
      return [];
    }

    const tags = [];
    for (const tagId of matchedTagIds) {
      const tagResult = await dynamodb.send(new ScanCommand({
        TableName: TAGS_TABLE,
        FilterExpression: 'tagId = :tagId',
        ExpressionAttributeValues: {
          ':tagId': tagId,
        },
        Limit: 1,
      }));
      if (tagResult.Items && tagResult.Items.length > 0) {
        const tag = tagResult.Items[0];
        tags.push({
          tagId: tag.tagId,
          name: tag.name,
          slug: tag.slug,
          tagType: tag.tagType,
          color: tag.color,
        });

        // Also add all ancestor tags (path)
        if (tag.path && tag.path.length > 0) {
          for (const ancestorId of tag.path) {
            if (!matchedTagIds.has(ancestorId)) {
              matchedTagIds.add(ancestorId);
              const ancestorResult = await dynamodb.send(new ScanCommand({
                TableName: TAGS_TABLE,
                FilterExpression: 'tagId = :tagId',
                ExpressionAttributeValues: {
                  ':tagId': ancestorId,
                },
                Limit: 1,
              }));
              if (ancestorResult.Items && ancestorResult.Items.length > 0) {
                const ancestor = ancestorResult.Items[0];
                tags.push({
                  tagId: ancestor.tagId,
                  name: ancestor.name,
                  slug: ancestor.slug,
                  tagType: ancestor.tagType,
                  color: ancestor.color,
                });
              }
            }
          }
        }
      }
    }

    return tags;
  } catch (error) {
    console.error('Error applying tagging rules:', error);
    return [];
  }
}

/**
 * Evaluate if a rule matches the given folder path and timestamp
 */
function evaluateRule(rule, folderPath, timestamp) {
  const conditions = rule.conditions || {};

  switch (rule.ruleType) {
    case 'DATE_RANGE':
      return isInDateRange(timestamp, conditions.startDate, conditions.endDate);

    case 'FOLDER_PATH':
      return matchesFolderPattern(folderPath, conditions.folderPattern);

    case 'COMBINED':
      return (
        isInDateRange(timestamp, conditions.startDate, conditions.endDate) &&
        matchesFolderPattern(folderPath, conditions.folderPattern)
      );

    default:
      return false;
  }
}

/**
 * Check if timestamp is within date range
 */
function isInDateRange(timestamp, startDate, endDate) {
  if (!startDate || !endDate) return false;
  const ts = new Date(timestamp).getTime();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return ts >= start && ts <= end;
}

/**
 * Check if folder path matches pattern (supports * wildcard)
 */
function matchesFolderPattern(folderPath, pattern) {
  if (!pattern) return false;
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(folderPath);
}

/**
 * Increment the image count for a tag
 */
async function incrementTagImageCount(tagId) {
  if (!TAGS_TABLE) return;

  try {
    await dynamodb.send(new UpdateCommand({
      TableName: TAGS_TABLE,
      Key: { tagId },
      UpdateExpression: 'SET imageCount = if_not_exists(imageCount, :zero) + :one, updatedAt = :now',
      ExpressionAttributeValues: {
        ':zero': 0,
        ':one': 1,
        ':now': new Date().toISOString(),
      },
    }));
  } catch (error) {
    console.error(`Error incrementing image count for tag ${tagId}:`, error);
  }
}
